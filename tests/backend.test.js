'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function makeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function loadScripts(files, initial = {}) {
  const sandbox = {
    window: {},
    localStorage: makeStorage(),
    ...initial
  };
  vm.createContext(sandbox);
  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, sandbox, { filename: file });
  }
  return sandbox;
}

function getData() {
  return loadScripts(['data.js']).window.CREWCARE_DATA;
}

test('data exposes four named astronauts with the required stories and baselines', () => {
  const { astronauts, readings, inventory } = getData();
  assert.equal(astronauts.length, 4);
  assert.deepEqual(Array.from(astronauts, (crew) => crew.id), ['a1', 'a2', 'a3', 'a4']);
  assert.deepEqual(Array.from(astronauts, (crew) => crew.role), [
    'Commander', 'Crew Medical Officer', 'Mission Specialist', 'Flight Engineer'
  ]);
  assert.deepEqual(Array.from(astronauts, (crew) => crew.story), [
    'healthy', 'sleep-drift', 'bp-rise', 'emergency'
  ]);
  assert.ok(astronauts.every((crew) => crew.name && !/^Crew Member/i.test(crew.name)));
  assert.ok(astronauts.every((crew) => crew.storyLabel && crew.baseline));
  assert.equal(readings.length, 120);
  assert.ok(inventory.length >= 5);
});

test('each astronaut has one simulated reading per day from 2026-10-16 through 2026-11-14', () => {
  const { readings } = getData();
  const expectedDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 16 + index));
    return date.toISOString().slice(0, 10);
  });

  for (const astronautId of ['a1', 'a2', 'a3', 'a4']) {
    const crewReadings = readings.filter((reading) => reading.astronautId === astronautId);
    assert.equal(crewReadings.length, 30);
    assert.deepEqual(Array.from(crewReadings, (reading) => reading.date), expectedDates);
    assert.ok(crewReadings.every((reading) => reading.source === 'simulated'));
  }
});

test('all baseline and daily health readings stay within the requested realistic ranges', () => {
  const { astronauts, readings } = getData();
  const ranges = {
    bpSys: [105, 150], bpDia: [65, 95], heartRate: [55, 75],
    bloodSugar: [4.5, 6], temp: [36.3, 37.2], sleepHours: [5, 9], mood: [1, 10]
  };

  for (const values of [...astronauts.map((crew) => crew.baseline), ...readings]) {
    for (const [key, [min, max]] of Object.entries(ranges)) {
      assert.ok(values[key] >= min && values[key] <= max, `${key} out of range: ${values[key]}`);
    }
    assert.ok(Number.isInteger(values.mood), `mood must be a whole number: ${values.mood}`);
  }
});

test('four simulated readings make the requested story arcs visible', () => {
  const { readings } = getData();
  const forCrew = (id) => readings.filter((reading) => reading.astronautId === id);
  const sleepDrift = forCrew('a2');
  const bpRise = forCrew('a3');
  const emergency = forCrew('a4');

  assert.ok(sleepDrift.every((reading, index) => index === 0 || reading.sleepHours < sleepDrift[index - 1].sleepHours));
  assert.ok(sleepDrift[29].mood < sleepDrift[0].mood);
  assert.ok(sleepDrift[29].heartRate > sleepDrift[0].heartRate);

  assert.ok(bpRise.every((reading, index) => index === 0 || reading.bpSys > bpRise[index - 1].bpSys));
  assert.ok(bpRise[29].bpDia > bpRise[0].bpDia);

  assert.ok(emergency.every((reading, index) => index === 0 || reading.bpSys > emergency[index - 1].bpSys));
  assert.ok(emergency[29].heartRate > emergency[0].heartRate);
  assert.ok(emergency[29].sleepHours < emergency[0].sleepHours);
  assert.ok(emergency[29].mood < emergency[0].mood);
  assert.ok(emergency[0].eyeChangeUm >= 9 && emergency[0].eyeChangeUm <= 11);
  assert.ok(emergency[29].eyeChangeUm >= 20 && emergency[29].eyeChangeUm <= 22);

  for (const id of ['a1', 'a2', 'a3', 'a4']) {
    const crewReadings = forCrew(id);
    assert.equal(crewReadings[0].radiationMsvCumulative, 110);
    assert.equal(crewReadings[29].radiationMsvCumulative, 139);
  }
});

test('inventory includes an item expiring soon and at least one low-stock item', () => {
  const { inventory } = getData();
  const soonLimit = Date.UTC(2026, 10, 14) + 30 * 24 * 60 * 60 * 1000;
  assert.ok(inventory.some((item) => Date.parse(`${item.expiryDate}T00:00:00Z`) <= soonLimit));
  assert.ok(inventory.some((item) => item.quantity <= item.lowStockAt));
});

test('trend APIs report the emergency and published eye-change band', () => {
  const data = getData();
  const sandbox = loadScripts(['trends.js'], { window: { CREWCARE_DATA: data } });
  const trends = sandbox.window.CrewCareTrends;
  const crew = data.astronauts.find((astronaut) => astronaut.id === 'a4');
  const readings = data.readings.filter((reading) => reading.astronautId === 'a4');

  assert.equal(trends.overallStatus(crew, readings).level, 'red');
  assert.equal(trends.sansStatus(readings[29].eyeChangeUm), 'amber');
  assert.equal(trends.trendSeries(crew, 'bpSys', readings, 30).values.length, 30);
});

test('store rejects out-of-range values, saves valid readings, merges, sorts, and resets', () => {
  const data = getData();
  const sandbox = loadScripts(['store.js'], { window: { CREWCARE_DATA: data } });
  const store = sandbox.window.CrewCareStore;
  const valid = {
    astronautId: 'a1', date: '2026-11-15', bpSys: 118, bpDia: 76,
    heartRate: 64, bloodSugar: 5.1, temp: 36.7, sleepHours: 7.5, mood: 8
  };

  assert.equal(store.saveReading({ ...valid, heartRate: 221 }).ok, false);
  assert.equal(store.loadReadings('a1').length, 30);
  assert.equal(store.saveReading(valid).ok, true);
  const savedReadings = store.loadReadings('a1');
  assert.equal(savedReadings.length, 31);
  assert.equal(savedReadings[30].source, 'user');
  assert.equal(savedReadings[30].date, '2026-11-15');

  store.resetDemo();
  assert.equal(store.loadReadings('a1').length, 30);
});

test('queue defaults to Mars delay and marks due messages as sent', () => {
  const sandbox = loadScripts(['queue.js']);
  const queue = sandbox.window.CrewCareQueue;
  const message = queue.queueMessage('Status update', 'a4', 'Mars');
  assert.equal(message.status, 'pending');
  assert.equal(message.delayMinutes, 22);
  assert.equal(message.demoSeconds, 30);
  assert.equal(message.astronautId, 'a4');

  const outbox = JSON.parse(sandbox.localStorage.getItem('crewcare.outbox.v1'));
  outbox[0].sendAt = 0;
  sandbox.localStorage.setItem('crewcare.outbox.v1', JSON.stringify(outbox));
  assert.equal(queue.tick()[0].status, 'sent');
});

test('triage follows the chest-pain path to an emergency outcome and can reset', () => {
  const triage = loadScripts(['triage.js']).window.CrewCareTriage;
  assert.equal(triage.startTriage().step.id, 'responsive');
  assert.equal(triage.answerTriage(0).step.id, 'breathing');
  assert.equal(triage.answerTriage(0).step.id, 'pulse');
  assert.equal(triage.answerTriage(0).step.id, 'chestpain');
  const outcome = triage.answerTriage(0);
  assert.equal(outcome.type, 'outcome');
  assert.equal(outcome.outcome.level, 'red');
  assert.ok(outcome.outcome.tellEarth);
  triage.resetTriage();
  assert.equal(triage.getCurrent(), null);
});

test('guidance exposes every tracked indicator and evidence panels', () => {
  const guidance = loadScripts(['guidance.js']).window.CREWCARE_GUIDANCE;
  for (const indicator of ['bpSys', 'heartRate', 'bloodSugar', 'temp', 'sleepHours', 'mood']) {
    assert.ok(guidance.GUIDANCE[indicator], `missing guidance for ${indicator}`);
  }
  assert.ok(guidance.EVIDENCE.length >= 1);
});

test('same-day user check-in replaces its simulated reading in the merged history', () => {
  const data = getData();
  const sandbox = loadScripts(['store.js'], { window: { CREWCARE_DATA: data } });
  const store = sandbox.window.CrewCareStore;
  const result = store.saveReading({
    astronautId: 'a1', date: '2026-11-14', bpSys: 132, bpDia: null,
    heartRate: null, bloodSugar: null, temp: null, sleepHours: null, mood: null,
    radiationMsvCumulative: null, eyeChangeUm: null
  });

  assert.equal(result.ok, true);
  const readings = store.loadReadings('a1');
  const sameDay = readings.filter((reading) => reading.date === '2026-11-14');
  assert.equal(readings.length, 30);
  assert.equal(sameDay.length, 1);
  assert.equal(sameDay[0].source, 'user');
  assert.equal(sameDay[0].bpSys, 132);
});

test('worsening systolic pressure trend upgrades Nia to amber before the full band', () => {
  const data = getData();
  const sandbox = loadScripts(['trends.js'], { window: { CREWCARE_DATA: data } });
  const trends = sandbox.window.CrewCareTrends;
  const nia = data.astronauts.find((astronaut) => astronaut.id === 'a3');
  const firstSixReadings = data.readings
    .filter((reading) => reading.astronautId === 'a3')
    .slice(0, 6);

  assert.equal(trends.indicatorStatus(nia, 'bpSys', firstSixReadings), 'amber');
});

test('sleep well above baseline is not green', () => {
  const data = getData();
  const sandbox = loadScripts(['trends.js'], { window: { CREWCARE_DATA: data } });
  const trends = sandbox.window.CrewCareTrends;
  const maya = data.astronauts.find((astronaut) => astronaut.id === 'a1');
  const readings = [
    { date: '2026-11-12', sleepHours: 14 },
    { date: '2026-11-13', sleepHours: 14 },
    { date: '2026-11-14', sleepHours: 14 }
  ];

  assert.ok(['amber', 'red'].includes(trends.indicatorStatus(maya, 'sleepHours', readings)));
});

test('queue rejects empty text without saving a message', () => {
  const sandbox = loadScripts(['queue.js']);
  const queue = sandbox.window.CrewCareQueue;

  assert.equal(queue.queueMessage('   ', 'a1', 'Mars'), null);
  assert.equal(sandbox.localStorage.getItem('crewcare.outbox.v1'), null);
});

test('queue rejects messages longer than 500 characters without saving', () => {
  const sandbox = loadScripts(['queue.js']);
  const queue = sandbox.window.CrewCareQueue;

  assert.equal(queue.queueMessage('x'.repeat(501), 'a1', 'Mars'), null);
  assert.equal(sandbox.localStorage.getItem('crewcare.outbox.v1'), null);
});

test('messages queued back-to-back have different ids', () => {
  const queue = loadScripts(['queue.js']).window.CrewCareQueue;

  const first = queue.queueMessage('First status', 'a1', 'Mars');
  const second = queue.queueMessage('Second status', 'a2', 'Mars');

  assert.notEqual(first.id, second.id);
});

test('Moon and ISS messages use their configured real and demo delays', () => {
  const queue = loadScripts(['queue.js']).window.CrewCareQueue;

  const moon = queue.queueMessage('Moon status', 'a1', 'Moon');
  const iss = queue.queueMessage('ISS status', 'a2', 'ISS');

  assert.equal(moon.delayMinutes, 0.02);
  assert.equal(moon.demoSeconds, 5);
  assert.equal(iss.delayMinutes, 0);
  assert.equal(iss.demoSeconds, 5);
});

test('unknown message environment defaults to Mars', () => {
  const queue = loadScripts(['queue.js']).window.CrewCareQueue;

  const message = queue.queueMessage('Status update', 'a4', 'Europa');

  assert.equal(message.environment, 'Mars');
  assert.equal(message.delayMinutes, 22);
  assert.equal(message.demoSeconds, 30);
});

test('same-millisecond messages stay oldest-first if stored in reverse order', () => {
  const sandbox = loadScripts(['queue.js']);
  const queue = sandbox.window.CrewCareQueue;
  const first = queue.queueMessage('First status', 'a1', 'Mars');
  const second = queue.queueMessage('Second status', 'a2', 'Mars');
  const outbox = JSON.parse(sandbox.localStorage.getItem('crewcare.outbox.v1'));

  outbox.forEach((message) => { message.createdAt = '2026-11-14T12:00:00.000Z'; });
  outbox.reverse();
  sandbox.localStorage.setItem('crewcare.outbox.v1', JSON.stringify(outbox));

  assert.deepEqual(Array.from(queue.tick(), (message) => message.id), [first.id, second.id]);
});
