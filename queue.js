// queue.js — PLACEHOLDER — Henry's backend, replace with your own code.
// Thin stub with the agreed function names from the Backend PRD, section 5.3.
// Store-and-forward message queue: a message is saved locally first, then
// marked sent only when its delay timer completes. Nothing is lost if the app closes.
//
// Delays (PRD 5.3): ISS near-instant (demo: 5 seconds), Moon 1.3 seconds (demo: 5 seconds),
// Mars 22 minutes in real life. The demo shortens Mars to 30 seconds and MUST label
// that on screen, so no judge is misled.
(function () {
  'use strict';

  var OUTBOX_KEY = 'crewcare.outbox.v1';

  var ENVIRONMENTS = {
    ISS:  { label: 'ISS',  delayMinutes: 0,    demoSeconds: 5,  note: 'Near-instant. Evacuation to Earth possible in hours.' },
    Moon: { label: 'Moon', delayMinutes: 0.02, demoSeconds: 5,  note: 'About 1.3 seconds one way. Return to Earth in about 3 days.' },
    Mars: { label: 'Mars', delayMinutes: 22,   demoSeconds: 30, note: '20-24 minutes one way. No evacuation, no resupply. The app decides locally. Demo delay shortened to 30 seconds — labelled on screen.' }
  };

  function loadOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveOutbox(list) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); } catch (e) {}
  }

  // Save a message as pending with a countdown end time. Returns the saved message.
  function queueMessage(text, astronautId, environment) {
    var env = ENVIRONMENTS[environment] || ENVIRONMENTS.Mars;
    var msg = {
      id: 'm' + Date.now(), astronautId: astronautId || null, text: text,
      environment: env.label, delayMinutes: env.delayMinutes,
      demoSeconds: env.demoSeconds, status: 'pending',
      createdAt: new Date().toISOString(), sendAt: Date.now() + env.demoSeconds * 1000, sentAt: null
    };
    var list = loadOutbox();
    list.push(msg);
    saveOutbox(list);
    return msg;
  }

  // Flip any due messages to sent. Call on load and every second while open.
  function tick() {
    var list = loadOutbox(), changed = false, now = Date.now();
    list.forEach(function (m) {
      if (m.status === 'pending' && now >= m.sendAt) { m.status = 'sent'; m.sentAt = new Date().toISOString(); changed = true; }
    });
    if (changed) saveOutbox(list);
    return list;
  }

  function listMessages() { return tick(); }

  window.CrewCareQueue = { ENVIRONMENTS: ENVIRONMENTS, queueMessage: queueMessage, listMessages: listMessages, tick: tick };
})();
