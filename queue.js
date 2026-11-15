// Mars-delay store-and-forward queue for simulated demo messages.
// Mars is 22 minutes one way in real life; this demo uses a labelled 30-second timer.
(function () {
  'use strict';

  var OUTBOX_KEY = 'crewcare.outbox.v1';
  var nextId = 0;

  var ENVIRONMENTS = {
    ISS:  { label: 'ISS',  delayMinutes: 0,    demoSeconds: 5,  note: 'Near-instant. Evacuation to Earth possible in hours.' },
    Moon: { label: 'Moon', delayMinutes: 0.02, demoSeconds: 5,  note: 'About 1.3 seconds one way. Return to Earth in about 3 days.' },
    Mars: { label: 'Mars', delayMinutes: 22,   demoSeconds: 30, note: '20-24 minutes one way. No evacuation, no resupply. The app decides locally. Demo delay shortened to 30 seconds — labelled on screen.' }
  };

  function loadOutbox() {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return [];
      var stored = localStorage.getItem(OUTBOX_KEY);
      if (!stored) return [];
      var parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(function (message) {
        return message && typeof message === 'object' && !Array.isArray(message);
      }) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOutbox(list) {
    try {
      if (typeof localStorage === 'undefined' || !localStorage) return false;
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  function makeId(list) {
    var id;
    var exists;
    do {
      nextId += 1;
      id = 'm' + Date.now() + '-' + nextId;
      exists = list.some(function (message) { return message.id === id; });
    } while (exists);
    return id;
  }

  // Save locally as pending first; the timer only simulates message delivery.
  function queueMessage(text, astronautId, environment) {
    if (typeof text !== 'string' || text.length > 500 || !text.trim()) return null;

    var safeAstronautId = ['a1', 'a2', 'a3', 'a4'].indexOf(astronautId) !== -1
      ? astronautId
      : null;
    var environmentKey = Object.prototype.hasOwnProperty.call(ENVIRONMENTS, environment)
      ? environment
      : 'Mars';
    var env = ENVIRONMENTS[environmentKey];
    var trimmedText = text.trim();
    var list = loadOutbox();
    var now = Date.now();
    var message = {
      id: makeId(list),
      astronautId: safeAstronautId,
      text: trimmedText,
      environment: env.label,
      delayMinutes: env.delayMinutes,
      demoSeconds: env.demoSeconds,
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      sendAt: now + env.demoSeconds * 1000,
      sentAt: null
    };

    list.push(message);
    return saveOutbox(list) ? message : null;
  }

  // Mark only due pending messages as sent and persist only when something changed.
  function tick() {
    var list = loadOutbox();
    var now = Date.now();
    var changed = false;

    list.forEach(function (message) {
      if (message.status === 'pending' && typeof message.sendAt === 'number' && now >= message.sendAt) {
        message.status = 'sent';
        message.sentAt = new Date(now).toISOString();
        changed = true;
      }
    });

    if (changed) saveOutbox(list);
    return list.sort(function (left, right) {
      var leftTime = Date.parse(left.createdAt) || 0;
      var rightTime = Date.parse(right.createdAt) || 0;
      if (leftTime !== rightTime) return leftTime - rightTime;

      // IDs end in a monotonically increasing sequence, which preserves order
      // when messages were created during the same millisecond.
      var leftSequence = Number((String(left.id).match(/-(\d+)$/) || [])[1]);
      var rightSequence = Number((String(right.id).match(/-(\d+)$/) || [])[1]);
      if (Number.isFinite(leftSequence) && Number.isFinite(rightSequence)) {
        return leftSequence - rightSequence;
      }
      return String(left.id).localeCompare(String(right.id));
    });
  }

  function listMessages() {
    return tick();
  }

  window.CrewCareQueue = {
    ENVIRONMENTS: ENVIRONMENTS,
    queueMessage: queueMessage,
    listMessages: listMessages,
    tick: tick
  };
})();
