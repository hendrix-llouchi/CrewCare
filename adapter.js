// adapter.js — thin wrapper that lets the frontend/ui app talk to Henry's backend.
//
// The UI (app.js) calls plain global functions defined in docs/INTERFACE.md:
// getCrew, getReadings, saveReading, getStatus, queueMessage, getTriageStep, ...
// Henry's backend exposes window.CREWCARE_DATA / CrewCareTrends / CrewCareStore /
// CrewCareQueue / CrewCareTriage / CREWCARE_GUIDANCE. This file translates between
// the two. It changes NO backend file and holds NO data of its own.
//
// Decisions already made (see INTEGRATION_MAP.md):
// - Crew ids: a1->crew-a, a2->crew-b, a3->crew-c, a4->crew-d.
// - Mood: the UI uses 1-5, the backend uses 1-10. Adapter rescales x2 on save, /2 on read.
// - Status: backend green/amber/red -> UI ok/watch/warn/act. Amber splits into watch
//   (drift just past the band) and warn (drift near red).
// - Triage stays 4 steps (the UI spec saying 5 has no 5th-step wording).
// - Mars messages keep the labelled 30-second demo delay (real delay 20-24 min).
// - Storage keys stay crewcare.readings.v1 / crewcare.outbox.v1.
// - Entry limits stay Henry's RANGES.
// This app guides actions only; it does not diagnose. Simulated data stays labelled
// simulated, and alert bands are team-defined demo values except SANS +20/+55 um.
(function () {
  'use strict';

  var Data = window.CREWCARE_DATA;
  var Trends = window.CrewCareTrends;
  var Store = window.CrewCareStore;
  var Queue = window.CrewCareQueue;
  var Triage = window.CrewCareTriage;
  var GuidanceData = window.CREWCARE_GUIDANCE;

  if (!Data || !Trends || !Store || !Queue || !Triage || !GuidanceData) {
    throw new Error('CrewCare backend is not loaded: adapter.js needs data.js, trends.js, store.js, queue.js, triage.js and guidance.js before it.');
  }

  // ---- id and key maps -----------------------------------------------------

  var TO_UI_ID = { a1: 'crew-a', a2: 'crew-b', a3: 'crew-c', a4: 'crew-d' };
  var TO_BACKEND_ID = { 'crew-a': 'a1', 'crew-b': 'a2', 'crew-c': 'a3', 'crew-d': 'a4' };

  // UI indicator key -> backend reading field.
  var TO_BACKEND_KEY = {
    bloodPressureSystolic: 'bpSys',
    bloodPressureDiastolic: 'bpDia',
    heartRate: 'heartRate',
    bloodSugar: 'bloodSugar',
    temperature: 'temp',
    sleepHours: 'sleepHours',
    mood: 'mood'
  };

  // Units the UI displays (matches docs/INTERFACE.md).
  var UI_UNITS = {
    bloodPressureSystolic: 'mmHg',
    bloodPressureDiastolic: 'mmHg',
    heartRate: 'bpm',
    bloodSugar: 'mmol/L',
    temperature: 'degrees Celsius',
    sleepHours: 'hours',
    mood: 'score out of 5'
  };

  function toBackendId(uiId) {
    return TO_BACKEND_ID[uiId] || null;
  }

  function astronautFor(uiId) {
    var backendId = toBackendId(uiId);
    if (!backendId) return null;
    for (var i = 0; i < Data.astronauts.length; i += 1) {
      if (Data.astronauts[i].id === backendId) return Data.astronauts[i];
    }
    return null;
  }

  function readingsFor(uiId) {
    var backendId = toBackendId(uiId);
    return backendId ? Store.loadReadings(backendId) : [];
  }

  function validNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  // Backend value -> UI value (only mood changes scale: 1-10 -> 1-5).
  function toUiValue(uiIndicator, backendValue) {
    if (!validNumber(backendValue)) return backendValue;
    return uiIndicator === 'mood' ? backendValue / 2 : backendValue;
  }

  // UI value -> backend value (mood 1-5 -> 1-10).
  function toBackendValue(uiIndicator, uiValue) {
    if (!validNumber(uiValue)) return uiValue;
    return uiIndicator === 'mood' ? uiValue * 2 : uiValue;
  }

  // ---- crew ----------------------------------------------------------------

  function crewRecord(astronaut) {
    return {
      id: TO_UI_ID[astronaut.id] || astronaut.id,
      name: astronaut.name,
      role: astronaut.role,
      storyLabel: astronaut.storyLabel,
      simulated: true
    };
  }

  function getCrew() {
    return Data.astronauts.map(crewRecord);
  }

  function getAstronaut(id) {
    var astronaut = astronautFor(id);
    return astronaut ? crewRecord(astronaut) : null;
  }

  // ---- readings ------------------------------------------------------------

  function getReadings(id, indicator, days) {
    var backendKey = TO_BACKEND_KEY[indicator];
    if (!backendKey) return [];
    var limit = typeof days === 'number' && days > 0 ? Math.floor(days) : 30;
    var list = readingsFor(id).filter(function (reading) {
      return reading && validNumber(reading[backendKey]);
    }).slice(-limit);
    return list.map(function (reading) {
      return {
        date: reading.date,
        value: toUiValue(indicator, reading[backendKey]),
        unit: UI_UNITS[indicator],
        qualityOk: true
      };
    });
  }

  function getBaseline(id, indicator) {
    var astronaut = astronautFor(id);
    var backendKey = TO_BACKEND_KEY[indicator];
    if (!astronaut || !backendKey || !validNumber(astronaut.baseline[backendKey])) {
      return { value: null, unit: UI_UNITS[indicator] || '' };
    }
    return {
      value: toUiValue(indicator, astronaut.baseline[backendKey]),
      unit: UI_UNITS[indicator]
    };
  }

  function getLatestSummary(id) {
    var astronaut = astronautFor(id);
    if (!astronaut) return null;
    var readings = readingsFor(id);
    var overall = Trends.overallStatus(astronaut, readings);
    var indicator = overall.drivingIndicator || 'heartRate';
    var backendKey = TO_BACKEND_KEY[indicator] || indicator;
    var latest = null;
    for (var i = readings.length - 1; i >= 0; i -= 1) {
      if (validNumber(readings[i][backendKey])) { latest = readings[i]; break; }
    }
    if (!latest) return null;
    var info = Trends.INDICATORS[backendKey] || { label: indicator };
    return {
      indicator: indicator,
      label: info.label,
      value: toUiValue(indicator, latest[backendKey]),
      unit: UI_UNITS[indicator] || info.unit || '',
      date: latest.date
    };
  }

  function getChartData(id, indicator) {
    var astronaut = astronautFor(id);
    var backendKey = TO_BACKEND_KEY[indicator];
    if (!astronaut || !backendKey) return null;
    var readings = readingsFor(id);
    var series = Trends.trendSeries(astronaut, backendKey, readings, 30);
    var points = [];
    for (var i = 0; i < series.labels.length; i += 1) {
      points.push({ date: series.labels[i], value: toUiValue(indicator, series.values[i]) });
    }
    return {
      label: series.label,
      unit: UI_UNITS[indicator] || series.unit,
      points: points,
      baseline: {
        value: validNumber(series.baseline) ? toUiValue(indicator, series.baseline) : null,
        unit: UI_UNITS[indicator] || series.unit
      },
      caption: Trends.plainReason(astronaut, backendKey, readings)
    };
  }

  function getRadiation(id) {
    var readings = readingsFor(id);
    var latest = readings.length ? readings[readings.length - 1] : null;
    return {
      cumulativeMsv: latest && validNumber(latest.radiationMsvCumulative)
        ? latest.radiationMsvCumulative : 0,
      days: readings.length
    };
  }

  // ---- check-in ------------------------------------------------------------

  function saveReading(crewId, readingObject) {
    var backendId = toBackendId(crewId);
    var status = getStatus(crewId);
    if (!backendId || !readingObject || typeof readingObject !== 'object') {
      return {
        saved: false, status: status, qualityOk: false,
        qualityMessage: 'Choose a valid crew member and enter a reading.',
        crewId: crewId, date: readingObject && readingObject.date
      };
    }

    var backendReading = { astronautId: backendId, date: readingObject.date };
    Object.keys(TO_BACKEND_KEY).forEach(function (uiIndicator) {
      var value = readingObject[uiIndicator];
      if (value !== null && value !== undefined && value !== '') {
        backendReading[TO_BACKEND_KEY[uiIndicator]] = toBackendValue(uiIndicator, Number(value));
      }
    });

    var result = Store.saveReading(backendReading);
    if (!result.ok) {
      var firstError = '';
      if (result.errors) {
        var keys = Object.keys(result.errors);
        if (keys.length) firstError = result.errors[keys[0]];
      }
      return {
        saved: false, status: status, qualityOk: false,
        qualityMessage: firstError || 'The reading could not be saved on this device.',
        crewId: crewId, date: readingObject.date
      };
    }

    return {
      saved: true, status: getStatus(crewId), qualityOk: true,
      qualityMessage: '', crewId: crewId, date: readingObject.date
    };
  }

  // ---- guidance ------------------------------------------------------------

  var GUIDANCE_KEY_MAP = {
    bpSys: 'bloodPressure',
    heartRate: 'heartRate',
    bloodSugar: 'bloodSugar',
    temp: 'temperature',
    sleepHours: 'sleep',
    mood: 'mood'
  };

  var guidance = {};
  Object.keys(GuidanceData.GUIDANCE).forEach(function (backendKey) {
    var uiKey = GUIDANCE_KEY_MAP[backendKey];
    if (uiKey) guidance[uiKey] = GuidanceData.GUIDANCE[backendKey];
  });

  function getEvidence(studyId) {
    var found = null;
    GuidanceData.EVIDENCE.forEach(function (panel) {
      if (panel.id === studyId) found = panel;
    });
    if (!found) return { studyId: studyId, title: 'TODO(content)', summary: 'TODO(content)' };
    return { studyId: found.id, title: found.title, summary: found.summary };
  }

  // ---- status --------------------------------------------------------------

  function levelInfo(backendLevel, fraction) {
    if (backendLevel === 'red') {
      return { level: 'act', levelLabel: 'Act now', colour: 'red' };
    }
    if (backendLevel === 'amber') {
      // Amber splits: drift just past the band -> watch; drift near red -> warn.
      if (fraction >= 0.5) return { level: 'warn', levelLabel: 'Warn', colour: 'amber' };
      return { level: 'watch', levelLabel: 'Watch', colour: 'amber' };
    }
    return { level: 'ok', levelLabel: 'Normal', colour: 'green' };
  }

  function recentAverage(readings, backendKey, count) {
    var values = readings.filter(function (r) {
      return r && validNumber(r[backendKey]);
    }).map(function (r) { return r[backendKey]; }).slice(-count);
    if (!values.length) return null;
    var total = 0;
    values.forEach(function (v) { total += v; });
    return total / values.length;
  }

  // How far through the amber band the drift is: 0 = just past green, 1 = at red.
  function amberFraction(astronaut, indicator, readings) {
    var T = Trends.THRESHOLDS;
    var baseline = astronaut.baseline[indicator];
    var recent = recentAverage(readings, indicator, 3);
    if (recent === null || !validNumber(baseline)) return 0;
    var distance = Math.abs(recent - baseline);
    var fraction = 0;
    if (indicator === 'bloodSugar') {
      fraction = (distance - T.bloodSugarGreen) / (T.bloodSugarAmber - T.bloodSugarGreen);
    } else if (indicator === 'temp') {
      fraction = (distance - T.tempGreen) / (T.tempAmber - T.tempGreen);
    } else if (indicator === 'sleepHours') {
      fraction = recent < baseline
        ? (distance - T.sleepGreen) / (T.sleepAmber - T.sleepGreen)
        : (distance - 2) / (3 - 2);
    } else if (indicator === 'mood') {
      fraction = recent < baseline
        ? (distance - T.moodGreen) / (T.moodAmber - T.moodGreen)
        : (distance - 2) / (3 - 2);
    } else {
      var pct = Math.abs(Trends.driftPct(recent, baseline));
      fraction = (pct - T.pctGreen) / (T.pctRed - T.pctGreen);
    }
    if (!isFinite(fraction)) return 0;
    return Math.max(0, Math.min(1, fraction));
  }

  function statusForIndicator(astronaut, indicator, readings) {
    var backendLevel = Trends.indicatorStatus(astronaut, indicator, readings);
    var info = levelInfo(backendLevel, amberFraction(astronaut, indicator, readings));
    var arrow = Trends.trendArrow(astronaut, indicator, readings);
    var trend = arrow === 'up' ? 'rising' : arrow === 'down' ? 'falling' : 'steady';
    var colourWord = info.colour === 'green' ? 'Green' : info.colour === 'amber' ? 'Amber' : 'Red';
    return {
      level: info.level,
      levelLabel: info.levelLabel,
      colour: info.colour,
      trend: trend,
      word: colourWord + ', ' + trend,
      reason: Trends.plainReason(astronaut, indicator, readings)
    };
  }

  function getStatus(id) {
    var astronaut = astronautFor(id);
    if (!astronaut) {
      return {
        level: 'ok', levelLabel: 'Normal', colour: 'green',
        trend: 'steady', word: 'Green, steady',
        reason: 'No crew member is available to describe.'
      };
    }
    var readings = readingsFor(id);
    var overall = Trends.overallStatus(astronaut, readings);
    var driving = overall.drivingIndicator || 'heartRate';
    return statusForIndicator(astronaut, driving, readings);
  }

  var SYSTEM_INDICATORS = {
    heart: ['heartRate'],
    lungs: [],
    brain: ['sleepHours'],
    eyes: [],
    muscle: [],
    blood: ['bloodPressureSystolic', 'bloodPressureDiastolic'],
    mood: ['mood']
  };

  function getSystemStatus(id, system) {
    var astronaut = astronautFor(id);
    if (!astronaut) return getStatus(id);
    var readings = readingsFor(id);

    if (system === 'eyes') {
      var latest = readings.length ? readings[readings.length - 1] : null;
      var eyeChange = latest && validNumber(latest.eyeChangeUm) ? latest.eyeChangeUm : null;
      var sans = Trends.sansStatus(eyeChange);
      var eyeInfo = levelInfo(sans, sans === 'amber' ? 0.5 : 0);
      var eyeValue = eyeChange === null ? 'not recorded' : eyeChange.toFixed(1) + ' µm';
      return {
        level: eyeInfo.level,
        levelLabel: eyeInfo.levelLabel,
        colour: eyeInfo.colour,
        trend: 'steady',
        word: (eyeInfo.colour === 'green' ? 'Green' : eyeInfo.colour === 'amber' ? 'Amber' : 'Red') + ', steady',
        reason: 'Eye change is ' + eyeValue + '. The published SANS threshold is +20 µm (early sign) and +55 µm (concerning).'
      };
    }

    var indicators = SYSTEM_INDICATORS[system];
    if (!indicators || !indicators.length) {
      // Lungs and muscle have no indicator: show the astronaut's overall
      // status and guidance link, never an invented reading.
      return getStatus(id);
    }

    var worst = null;
    var worstRank = 0;
    indicators.forEach(function (indicator) {
      var candidate = statusForIndicator(astronaut, indicator, readings);
      var rank = candidate.colour === 'red' ? 3 : candidate.colour === 'amber' ? 2 : 1;
      if (rank > worstRank) { worstRank = rank; worst = candidate; }
    });
    return worst || getStatus(id);
  }

  // ---- environment ---------------------------------------------------------

  var ENVIRONMENT_KEY = 'crewcare.environment';
  var ENVIRONMENT_DETAILS = {
    ISS: { name: 'ISS', delaySeconds: 0, delayLabel: 'Near-instant' },
    Moon: { name: 'Moon', delaySeconds: 1.3, delayLabel: 'About 1.3 seconds' },
    Mars: { name: 'Mars', delaySeconds: 1320, delayLabel: 'About 22 minutes (20 to 24)' }
  };

  var environmentInMemory = 'ISS';

  function getEnvironment() {
    try {
      var saved = window.localStorage.getItem(ENVIRONMENT_KEY);
      if (Object.prototype.hasOwnProperty.call(ENVIRONMENT_DETAILS, saved)) {
        environmentInMemory = saved;
      }
    } catch (e) {
      // Storage unavailable: keep the in-memory value.
    }
    return environmentInMemory;
  }

  function setEnvironment(name) {
    if (!Object.prototype.hasOwnProperty.call(ENVIRONMENT_DETAILS, name)) {
      throw new RangeError('Unknown environment: ' + name);
    }
    var changed = environmentInMemory !== name;
    environmentInMemory = name;
    try {
      window.localStorage.setItem(ENVIRONMENT_KEY, name);
    } catch (e) {
      // Storage unavailable: keep the in-memory value.
    }
    var details = ENVIRONMENT_DETAILS[name];
    if (changed) {
      window.dispatchEvent(new CustomEvent('crewcare:environment', { detail: details }));
    }
    return details;
  }

  // ---- messages ------------------------------------------------------------

  function queueMessage(text) {
    var environment = getEnvironment();
    var message = Queue.queueMessage(text, null, environment);
    if (!message) {
      // Thrown inside the app's try/catch, which shows "could not be added".
      throw new Error('The message could not be saved on this device.');
    }
    return {
      id: message.id,
      text: message.text,
      environment: message.environment,
      createdAt: message.createdAt,
      status: message.status,
      countdownEnd: new Date(message.sendAt).toISOString()
    };
  }

  function getOutbox() {
    return Queue.listMessages().map(function (message) {
      return {
        id: message.id,
        text: message.text,
        environment: message.environment,
        createdAt: message.createdAt,
        status: message.status,
        countdownEnd: new Date(message.sendAt).toISOString()
      };
    });
  }

  // ---- triage --------------------------------------------------------------

  // The backend triage is stateful; the UI calls it statelessly by step number.
  // The adapter keeps the answers it has seen so it can rebuild the backend
  // state when the UI goes Back and answers an earlier step again.
  var triageAnswers = [];

  function triageStepShape(step) {
    return {
      question: step.question,
      answers: step.options.map(function (option) { return option.label; }),
      stepNumber: step.step,
      totalSteps: 4
    };
  }

  function getTriageStep(scenario, stepNumber) {
    if (stepNumber < 1 || stepNumber > Triage.STEPS.length) {
      throw new RangeError('No triage step ' + stepNumber + '.');
    }
    return triageStepShape(Triage.STEPS[stepNumber - 1]);
  }

  function indexOfAnswer(step, answer) {
    for (var i = 0; i < step.options.length; i += 1) {
      if (step.options[i].label === answer) return i;
    }
    // Fall back to the first word ("Yes" / "No" / "Not sure").
    var firstWord = String(answer).split(' ')[0];
    for (var j = 0; j < step.options.length; j += 1) {
      if (step.options[j].label.indexOf(firstWord) === 0) return j;
    }
    return -1;
  }

  function triageOutcomeShape(outcome) {
    var join = function (lines) {
      return Array.isArray(lines) ? lines.join(' ') : String(lines || '');
    };
    var level = outcome.level === 'red'
      ? { level: 'red', levelLabel: 'Act now' }
      : { level: 'amber', levelLabel: 'Warn' };
    return {
      level: level.level,
      levelLabel: level.levelLabel,
      doNow: join(outcome.doNow),
      checkNext: join(outcome.checkNext),
      prepare: join(outcome.prepare),
      tellEarth: outcome.tellEarth || ''
    };
  }

  function rebuildTriage(uptoStep) {
    Triage.startTriage();
    var answers = triageAnswers.slice(0, uptoStep - 1);
    for (var i = 0; i < answers.length; i += 1) {
      var current = Triage.getCurrent();
      if (!current || current.type !== 'step') break;
      var index = indexOfAnswer(current.step, answers[i]);
      if (index < 0) break;
      Triage.answerTriage(index);
    }
  }

  function answerTriageStep(scenario, stepNumber, answer) {
    var current = Triage.getCurrent();
    if (!current || current.type !== 'step' || current.step.step !== stepNumber) {
      rebuildTriage(stepNumber);
      current = Triage.getCurrent();
    }
    if (!current || current.type !== 'step') {
      throw new Error('The triage step could not be loaded.');
    }
    var index = indexOfAnswer(current.step, answer);
    if (index < 0) {
      throw new TypeError('Unsupported triage answer: ' + answer);
    }
    triageAnswers[stepNumber - 1] = answer;
    triageAnswers.length = stepNumber;
    var next = Triage.answerTriage(index);
    if (next && next.type === 'step') {
      return { stepNumber: next.step.step };
    }
    if (next && next.type === 'outcome') {
      return triageOutcomeShape(next.outcome);
    }
    throw new Error('The triage step could not be answered.');
  }

  function getTriageOutcome(scenario, answers) {
    Triage.startTriage();
    var list = Array.isArray(answers) ? answers : [];
    for (var i = 0; i < list.length; i += 1) {
      var current = Triage.getCurrent();
      if (!current || current.type !== 'step') break;
      var index = indexOfAnswer(current.step, list[i]);
      if (index < 0) break;
      Triage.answerTriage(index);
    }
    var final = Triage.getCurrent();
    if (!final || final.type !== 'outcome') {
      throw new Error('The triage answers do not reach an outcome.');
    }
    return triageOutcomeShape(final.outcome);
  }

  // ---- inventory -----------------------------------------------------------

  function getInventory() {
    return Data.inventory.map(function (item) {
      return {
        name: item.name,
        quantity: item.quantity,
        expiry: item.expiryDate,
        lowStockLevel: item.lowStockAt
      };
    });
  }

  // ---- publish -------------------------------------------------------------
  // Plain globals, so stubs.js (loaded after this file) sees them as defined
  // and does not install its stand-ins.

  window.getCrew = getCrew;
  window.getAstronaut = getAstronaut;
  window.getReadings = getReadings;
  window.getBaseline = getBaseline;
  window.getLatestSummary = getLatestSummary;
  window.getChartData = getChartData;
  window.getRadiation = getRadiation;
  window.saveReading = saveReading;
  window.guidance = guidance;
  window.getEvidence = getEvidence;
  window.getStatus = getStatus;
  window.getSystemStatus = getSystemStatus;
  window.getEnvironment = getEnvironment;
  window.setEnvironment = setEnvironment;
  window.queueMessage = queueMessage;
  window.getOutbox = getOutbox;
  window.getTriageStep = getTriageStep;
  window.answerTriageStep = answerTriageStep;
  window.getTriageOutcome = getTriageOutcome;
  window.getInventory = getInventory;

  window.CrewCareAdapter = {
    getCrew: getCrew,
    getAstronaut: getAstronaut,
    getReadings: getReadings,
    getBaseline: getBaseline,
    getLatestSummary: getLatestSummary,
    getChartData: getChartData,
    getRadiation: getRadiation,
    saveReading: saveReading,
    getEvidence: getEvidence,
    getStatus: getStatus,
    getSystemStatus: getSystemStatus,
    getEnvironment: getEnvironment,
    setEnvironment: setEnvironment,
    queueMessage: queueMessage,
    getOutbox: getOutbox,
    getTriageStep: getTriageStep,
    answerTriageStep: answerTriageStep,
    getTriageOutcome: getTriageOutcome,
    getInventory: getInventory
  };
})();
