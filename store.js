// CrewCare local storage for user-entered readings. Simulated readings stay in data.js.
(function () {
  'use strict';

  var READINGS_KEY = 'crewcare.readings.v1';
  var OUTBOX_KEY = 'crewcare.outbox.v1';

  var RANGES = {
    bpSys: [60, 250],
    bpDia: [30, 150],
    heartRate: [30, 220],
    bloodSugar: [1, 30],
    temp: [32, 43],
    sleepHours: [0, 16],
    mood: [1, 10]
  };

  var FALLBACK_ASTRONAUT_IDS = ['a1', 'a2', 'a3', 'a4'];

  function getStorage() {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch (e) {
      return null;
    }
  }

  function knownAstronautId(astronautId) {
    var astronauts = null;
    try {
      astronauts = typeof window !== 'undefined' && window.CREWCARE_DATA &&
        window.CREWCARE_DATA.astronauts;
    } catch (e) {
      astronauts = null;
    }

    if (Array.isArray(astronauts)) {
      return astronauts.some(function (astronaut) {
        return astronaut && astronaut.id === astronautId;
      });
    }
    return FALLBACK_ASTRONAUT_IDS.indexOf(astronautId) !== -1;
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var date = new Date(value + 'T00:00:00.000Z');
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function isMissing(value) {
    return value === null || value === undefined || value === '';
  }

  // A storage read failure is different from invalid JSON: callers must not
  // overwrite data when the browser blocks access, while malformed JSON loads as empty.
  function readStoredReadings() {
    var storage = getStorage();
    if (!storage) return { ok: false, readings: [] };

    var raw;
    try {
      raw = storage.getItem(READINGS_KEY);
    } catch (e) {
      return { ok: false, readings: [] };
    }

    if (!raw) return { ok: true, readings: [] };

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { ok: true, readings: [] };
      return {
        ok: true,
        readings: parsed.filter(function (reading) {
          return reading && typeof reading === 'object' && !Array.isArray(reading);
        })
      };
    } catch (e) {
      return { ok: true, readings: [] };
    }
  }

  function loadUserReadings() {
    return readStoredReadings().readings;
  }

  function saveReading(reading) {
    var errors = {};
    if (!reading || typeof reading !== 'object' || Array.isArray(reading)) {
      return { ok: false, errors: { _reading: 'Enter a valid reading.' } };
    }

    if (!knownAstronautId(reading.astronautId)) {
      errors.astronautId = 'Choose a valid crew member.';
    }
    if (!validDate(reading.date)) {
      errors.date = 'Enter a valid date in YYYY-MM-DD format.';
    }

    var measuredCount = 0;
    Object.keys(RANGES).forEach(function (key) {
      var value = reading[key];
      if (isMissing(value)) return;

      measuredCount += 1;
      if (typeof value !== 'number' || !isFinite(value)) {
        errors[key] = 'Enter a valid number between ' + RANGES[key][0] + ' and ' + RANGES[key][1] + '.';
        return;
      }
      if (value < RANGES[key][0] || value > RANGES[key][1]) {
        errors[key] = 'Enter a value between ' + RANGES[key][0] + ' and ' + RANGES[key][1] + '.';
      }
    });

    if (!measuredCount) {
      errors._reading = 'Enter at least one measurement.';
    }
    if (Object.keys(errors).length) return { ok: false, errors: errors };

    var stored = readStoredReadings();
    if (!stored.ok) {
      return {
        ok: false,
        errors: { _storage: 'Could not save on this device (storage is full or blocked). Nothing was saved.' }
      };
    }

    var saved = Object.assign({}, reading, { source: 'user' });
    var nextReadings = stored.readings.filter(function (existing) {
      return existing.astronautId !== saved.astronautId || existing.date !== saved.date;
    });
    nextReadings.push(saved);

    var storage = getStorage();
    if (!storage) {
      return {
        ok: false,
        errors: { _storage: 'Could not save on this device (storage is full or blocked). Nothing was saved.' }
      };
    }

    try {
      storage.setItem(READINGS_KEY, JSON.stringify(nextReadings));
    } catch (e) {
      return {
        ok: false,
        errors: { _storage: 'Could not save on this device (storage is full or blocked). Nothing was saved.' }
      };
    }

    return { ok: true, reading: saved };
  }

  function bundledReadings(astronautId) {
    try {
      var data = typeof window !== 'undefined' && window.CREWCARE_DATA;
      if (!data || !Array.isArray(data.readings)) return [];
      return data.readings.filter(function (reading) {
        return reading && reading.astronautId === astronautId;
      });
    } catch (e) {
      return [];
    }
  }

  // Combine bundled simulated data with saved user data without mutating either.
  function loadReadings(astronautId) {
    if (!astronautId) return [];

    var bundled = bundledReadings(astronautId);
    var userByDate = {};
    loadUserReadings().forEach(function (reading) {
      if (reading.astronautId === astronautId && typeof reading.date === 'string') {
        userByDate[reading.date] = reading;
      }
    });
    var userDates = Object.keys(userByDate);
    var simulatedWithoutSameDayUser = bundled.filter(function (reading) {
      return !reading || !Object.prototype.hasOwnProperty.call(userByDate, reading.date);
    });
    var user = userDates.map(function (date) { return userByDate[date]; });

    return simulatedWithoutSameDayUser.concat(user).sort(function (a, b) {
      var dateA = typeof a.date === 'string' ? a.date : '';
      var dateB = typeof b.date === 'string' ? b.date : '';
      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
  }

  function resetDemo() {
    var storage = getStorage();
    if (!storage) return;

    try {
      storage.removeItem(READINGS_KEY);
    } catch (e) {}
    try {
      storage.removeItem(OUTBOX_KEY);
    } catch (e) {}
  }

  window.CrewCareStore = {
    saveReading: saveReading,
    loadReadings: loadReadings,
    resetDemo: resetDemo,
    RANGES: RANGES
  };
})();
