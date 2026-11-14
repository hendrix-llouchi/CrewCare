// All alert bands in this file are TEAM-DEFINED DEMO VALUES, not NASA medical limits.
// The only published threshold used here is SANS retinal thickening: +20 µm (amber)
// and +55 µm (red). This app does not diagnose.
(function () {
  'use strict';

  // Demo-only comparison bands; these are not NASA rules or medical limits.
  var THRESHOLDS = {
    pctGreen: 5,
    pctAmber: 10,
    pctRed: 10,
    pctSharp: 15,
    bloodSugarGreen: 0.5,
    bloodSugarAmber: 1.0,
    tempGreen: 0.3,
    tempAmber: 0.6,
    sleepGreen: 1.0,
    sleepAmber: 1.5,
    moodGreen: 1,
    moodAmber: 2
  };

  var INDICATORS = {
    bpSys: { label: 'Blood pressure (systolic)', unit: 'mmHg', field: 'bpSys' },
    bpDia: { label: 'Blood pressure (diastolic)', unit: 'mmHg', field: 'bpDia' },
    heartRate: { label: 'Heart rate', unit: 'bpm', field: 'heartRate' },
    bloodSugar: { label: 'Blood sugar', unit: 'mmol/L', field: 'bloodSugar' },
    temp: { label: 'Body temperature', unit: 'degrees C', field: 'temp' },
    sleepHours: { label: 'Sleep', unit: 'hours', field: 'sleepHours' },
    mood: { label: 'Mood', unit: '1-10', field: 'mood' }
  };

  function validNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  function validIndicator(indicator) {
    return Object.prototype.hasOwnProperty.call(INDICATORS, indicator);
  }

  function sortedReadings(readings) {
    if (!Array.isArray(readings)) return [];
    return readings.filter(function (reading) {
      return reading && typeof reading === 'object';
    }).slice().sort(function (a, b) {
      var dateA = a.date || '';
      var dateB = b.date || '';
      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });
  }

  function validBaseline(astronaut, indicator) {
    return !!(astronaut && astronaut.baseline && validIndicator(indicator) &&
      validNumber(astronaut.baseline[indicator]));
  }

  function driftPct(reading, baseline) {
    if (!validNumber(reading) || !validNumber(baseline) || baseline === 0) return 0;
    return ((reading - baseline) / baseline) * 100;
  }

  function average(values) {
    var total = 0;
    var count = 0;
    values.forEach(function (value) {
      if (validNumber(value)) {
        total += value;
        count += 1;
      }
    });
    return count ? total / count : null;
  }

  function fieldValues(readings, indicator) {
    if (!validIndicator(indicator)) return [];
    var field = INDICATORS[indicator].field;
    return sortedReadings(readings).filter(function (reading) {
      return validNumber(reading[field]);
    }).map(function (reading) {
      return reading[field];
    });
  }

  function recentAverage(readings, indicator, count) {
    var values = fieldValues(readings, indicator);
    return average(values.slice(-count));
  }

  // Compare the latest three valid readings with up to ten valid readings before them.
  function directionWindow(readings, indicator) {
    var values = fieldValues(readings, indicator);
    var latest = values.slice(-3);
    var previous = values.slice(Math.max(0, values.length - 13), Math.max(0, values.length - 3));
    return {
      recent: average(latest),
      previous: average(previous)
    };
  }

  function rank(level) {
    return level === 'red' ? 3 : level === 'amber' ? 2 : 1;
  }

  function indicatorStatus(astronaut, indicator, readings) {
    if (!validBaseline(astronaut, indicator)) return 'green';

    var recent = recentAverage(readings, indicator, 3);
    if (recent === null) return 'green';

    var baseline = astronaut.baseline[indicator];
    var drift = recent - baseline;
    var distance = Math.abs(drift);

    if (indicator === 'sleepHours') {
      if (drift >= 0) return 'green';
      if (distance > THRESHOLDS.sleepAmber) return 'red';
      return distance >= THRESHOLDS.sleepGreen ? 'amber' : 'green';
    }

    if (indicator === 'mood') {
      if (drift >= 0) return 'green';
      if (distance >= THRESHOLDS.moodAmber) return 'red';
      return distance >= THRESHOLDS.moodGreen ? 'amber' : 'green';
    }

    if (indicator === 'bloodSugar') {
      if (distance > THRESHOLDS.bloodSugarAmber) return 'red';
      return distance >= THRESHOLDS.bloodSugarGreen ? 'amber' : 'green';
    }

    if (indicator === 'temp') {
      if (distance > THRESHOLDS.tempAmber) return 'red';
      return distance >= THRESHOLDS.tempGreen ? 'amber' : 'green';
    }

    var pct = Math.abs(driftPct(recent, baseline));
    if (pct > THRESHOLDS.pctRed) return 'red';
    if (pct > THRESHOLDS.pctGreen) return 'amber';
    return 'green';
  }

  function overallStatus(astronaut, readings) {
    var worst = 'green';
    var driving = null;
    Object.keys(INDICATORS).forEach(function (key) {
      var status = indicatorStatus(astronaut, key, readings);
      if (rank(status) > rank(worst)) {
        worst = status;
        driving = key;
      }
    });
    return { level: worst, drivingIndicator: driving };
  }

  function emptySeries(astronaut, indicator) {
    var known = validIndicator(indicator);
    return {
      labels: [],
      values: [],
      baseline: validBaseline(astronaut, indicator) ? astronaut.baseline[indicator] : null,
      unit: known ? INDICATORS[indicator].unit : '',
      label: known ? INDICATORS[indicator].label : ''
    };
  }

  function trendSeries(astronaut, indicator, readings, days) {
    if (!validBaseline(astronaut, indicator) || !Array.isArray(readings) || !readings.length) {
      return emptySeries(astronaut, indicator);
    }

    var limit = validNumber(days) && days > 0 ? Math.floor(days) : 30;
    var field = INDICATORS[indicator].field;
    var list = sortedReadings(readings).filter(function (reading) {
      return validNumber(reading[field]);
    }).slice(-limit);

    if (!list.length) return emptySeries(astronaut, indicator);

    return {
      labels: list.map(function (reading) { return reading.date || ''; }),
      values: list.map(function (reading) { return reading[field]; }),
      baseline: astronaut.baseline[indicator],
      unit: INDICATORS[indicator].unit,
      label: INDICATORS[indicator].label
    };
  }

  // Team-defined demo readiness score: sleep (50%), mood (30%), and heart-rate
  // drift (20%). Missing components are omitted and remaining weights are normalized.
  function readinessScore(astronaut, readings) {
    if (!Array.isArray(readings) || !readings.length) return 100;

    var scores = [];
    var sleep = recentAverage(readings, 'sleepHours', 3);
    var mood = recentAverage(readings, 'mood', 3);
    var heartRate = recentAverage(readings, 'heartRate', 3);

    if (sleep !== null) {
      scores.push({ score: Math.max(0, Math.min(100, (sleep / 8.5) * 100)), weight: 0.5 });
    }
    if (mood !== null) {
      scores.push({ score: Math.max(0, Math.min(100, (mood / 10) * 100)), weight: 0.3 });
    }
    if (heartRate !== null && validBaseline(astronaut, 'heartRate')) {
      var heartRateScore = Math.max(0, 100 - Math.abs(driftPct(heartRate, astronaut.baseline.heartRate)) * 5);
      scores.push({ score: heartRateScore, weight: 0.2 });
    }

    if (!scores.length) return 100;
    var weighted = 0;
    var totalWeight = 0;
    scores.forEach(function (part) {
      weighted += part.score * part.weight;
      totalWeight += part.weight;
    });
    return Math.max(0, Math.min(100, Math.round(weighted / totalWeight)));
  }

  // Published SANS thresholds: +20 µm is an early sign, +55 µm is concerning.
  function sansStatus(eyeChangeUm) {
    if (!validNumber(eyeChangeUm)) return 'green';
    if (eyeChangeUm >= 55) return 'red';
    if (eyeChangeUm >= 20) return 'amber';
    return 'green';
  }

  function trendArrow(astronaut, indicator, readings) {
    var values = fieldValues(readings, indicator);
    if (values.length < 2) return 'flat';
    var first = values[0];
    var last = values[values.length - 1];
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'flat';
  }

  function plainReason(astronaut, indicator, readings) {
    if (!validIndicator(indicator)) return 'No valid indicator is available to describe.';
    var descriptor = INDICATORS[indicator];
    var baselineAvailable = validBaseline(astronaut, indicator);
    var recent = recentAverage(readings, indicator, 3);

    if (!baselineAvailable || recent === null) {
      return 'No recent ' + descriptor.label.toLowerCase() + ' average or personal baseline is available yet.';
    }

    var baseline = astronaut.baseline[indicator];
    var windows = directionWindow(readings, indicator);
    var direction;
    var relation;

    if (windows.previous === null || windows.recent === null) {
      direction = 'steady because there are not enough earlier readings to compare';
      relation = 'the earlier direction is not available yet';
    } else if (windows.recent > windows.previous) {
      direction = 'up';
      relation = Math.abs(windows.recent - baseline) > Math.abs(windows.previous - baseline)
        ? 'worsening by moving farther from baseline'
        : 'improving by moving closer to baseline';
    } else if (windows.recent < windows.previous) {
      direction = 'down';
      relation = Math.abs(windows.recent - baseline) > Math.abs(windows.previous - baseline)
        ? 'worsening by moving farther from baseline'
        : 'improving by moving closer to baseline';
    } else {
      direction = 'steady';
      relation = 'staying at a similar distance from baseline';
    }

    var averageText = Math.round(recent * 100) / 100;
    return descriptor.label + ' has a recent 3-day average of ' + averageText + ' ' + descriptor.unit +
      ' versus this astronaut\'s personal baseline of ' + baseline + ' ' + descriptor.unit +
      '; its 10-day direction is ' + direction + ' (' + relation + ').';
  }

  window.CrewCareTrends = {
    THRESHOLDS: THRESHOLDS,
    INDICATORS: INDICATORS,
    driftPct: driftPct,
    indicatorStatus: indicatorStatus,
    overallStatus: overallStatus,
    trendSeries: trendSeries,
    readinessScore: readinessScore,
    sansStatus: sansStatus,
    trendArrow: trendArrow,
    plainReason: plainReason
  };
})();
