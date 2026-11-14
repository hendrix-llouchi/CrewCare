// store.js — PLACEHOLDER — Henry's backend, replace with your own code.
// Thin stub with the agreed function names from the Backend PRD, section 5.1.
// Just enough localStorage save/load for the frontend demo.
// Keys are namespaced: crewcare.readings.v1, crewcare.outbox.v1, crewcare.settings.v1.
(function () {
  'use strict';

  var READINGS_KEY = 'crewcare.readings.v1';

  // Input ranges from the Backend PRD, section 3.3. Out-of-range input is rejected, never saved.
  var RANGES = {
    bpSys: [60, 250], bpDia: [30, 150], heartRate: [30, 220],
    bloodSugar: [1, 30], temp: [32, 43], sleepHours: [0, 16], mood: [1, 10]
  };

  function loadUserReadings() {
    try {
      return JSON.parse(localStorage.getItem(READINGS_KEY) || '[]');
    } catch (e) { return []; }
  }

  // Validate ranges, stamp source "user", save. Returns { ok: true, reading } or { ok: false, errors }.
  function saveReading(reading) {
    var errors = {};
    Object.keys(RANGES).forEach(function (key) {
      var v = reading[key];
      if (v === null || v === undefined || v === '') return; // missing means "not measured", never zero
      if (isNaN(v) || v < RANGES[key][0] || v > RANGES[key][1]) {
        errors[key] = 'Enter a value between ' + RANGES[key][0] + ' and ' + RANGES[key][1] + '.';
      }
    });
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    var saved = Object.assign({}, reading, { source: 'user' });
    try {
      var all = loadUserReadings();
      all.push(saved);
      localStorage.setItem(READINGS_KEY, JSON.stringify(all));
    } catch (e) {
      return { ok: false, errors: { _storage: 'Could not save on this device (storage is full or blocked). Nothing was saved.' } };
    }
    return { ok: true, reading: saved };
  }

  // Merge bundled simulated readings with saved user readings, oldest first.
  function loadReadings(astronautId) {
    var bundled = (window.CREWCARE_DATA ? window.CREWCARE_DATA.readings : []).filter(function (r) { return r.astronautId === astronautId; });
    var user = loadUserReadings().filter(function (r) { return r.astronautId === astronautId; });
    return bundled.concat(user).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  // Clear only user data; simulated data is untouched. Use before every demo.
  function resetDemo() {
    try { localStorage.removeItem(READINGS_KEY); localStorage.removeItem('crewcare.outbox.v1'); } catch (e) {}
  }

  window.CrewCareStore = { saveReading: saveReading, loadReadings: loadReadings, resetDemo: resetDemo, RANGES: RANGES };
})();
