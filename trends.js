// trends.js — PLACEHOLDER — Henry's backend, replace with your own code.
// Thin stub with the agreed function names from the Backend PRD, section 4.
// Just enough simple logic for the frontend to demo. Henry will replace this
// with his own trend engine.
//
// Compares each astronaut to their OWN pre-flight baseline, never to Earth averages alone.
//
// HONESTY: all alert bands below are TEAM-DEFINED DEMO VALUES, not NASA medical limits.
// The ONLY published threshold used here is the SANS eye threshold:
//   retinal thickening of +20 micrometres = early sign, +55 micrometres = concerning.
//   That one is published. Do not present any other band as a NASA rule.
(function () {
  'use strict';

  // Team-defined demo values - not NASA medical limits.
  var THRESHOLDS = {
    pctGreen: 5, pctAmber: 10, pctRed: 10, pctSharp: 15,
    bloodSugarGreen: 0.5, bloodSugarAmber: 1.0, // mmol/L
    tempGreen: 0.3, tempAmber: 0.6,             // degrees C
    sleepGreen: 1.0, sleepAmber: 1.5,           // hours below baseline
    moodGreen: 1, moodAmber: 2                  // points below baseline (1-10 scale)
  };

  var INDICATORS = {
    bpSys:      { label: 'Blood pressure (systolic)', unit: 'mmHg',   field: 'bpSys' },
    bpDia:      { label: 'Blood pressure (diastolic)', unit: 'mmHg',  field: 'bpDia' },
    heartRate:  { label: 'Heart rate',                 unit: 'bpm',    field: 'heartRate' },
    bloodSugar: { label: 'Blood sugar',                unit: 'mmol/L', field: 'bloodSugar' },
    temp:       { label: 'Body temperature',           unit: '°C',     field: 'temp' },
    sleepHours: { label: 'Sleep',                      unit: 'hours',  field: 'sleepHours' },
    mood:       { label: 'Mood',                       unit: '1-10',   field: 'mood' }
  };

  function driftPct(reading, baseline) {
    if (reading === null || reading === undefined || !baseline) return 0;
    return ((reading - baseline) / baseline) * 100;
  }

  function rank(level) { return level === 'red' ? 3 : level === 'amber' ? 2 : 1; }

  // Simple demo rule: compare the latest reading to the astronaut's own baseline.
  // Henry's version will use the 3-day average and 10-day direction too (PRD 4.2).
  function indicatorStatus(astronaut, indicator, readings) {
    if (!astronaut || !readings || !readings.length) return 'green';
    var key = indicator, base = astronaut.baseline[key];
    if (base === null || base === undefined) return 'green';
    var latest = readings[readings.length - 1][INDICATORS[key].field];
    if (latest === null || latest === undefined) return 'green';
    var drift = latest - base, a = Math.abs(drift);
    if (key === 'bloodSugar') return a > THRESHOLDS.bloodSugarAmber ? 'red' : a >= THRESHOLDS.bloodSugarGreen ? 'amber' : 'green';
    if (key === 'temp') return a > THRESHOLDS.tempAmber ? 'red' : a >= THRESHOLDS.tempGreen ? 'amber' : 'green';
    if (key === 'sleepHours') return drift < -THRESHOLDS.sleepAmber ? 'red' : drift <= -THRESHOLDS.sleepGreen ? 'amber' : 'green';
    if (key === 'mood') return drift <= -THRESHOLDS.moodAmber ? 'red' : drift <= -THRESHOLDS.moodGreen ? 'amber' : 'green';
    var pct = Math.abs(driftPct(latest, base));
    return pct > THRESHOLDS.pctRed ? 'red' : pct > THRESHOLDS.pctGreen ? 'amber' : 'green';
  }

  function overallStatus(astronaut, readings) {
    var worst = 'green', driving = null;
    Object.keys(INDICATORS).forEach(function (key) {
      var s = indicatorStatus(astronaut, key, readings);
      if (rank(s) > rank(worst)) { worst = s; driving = key; }
    });
    return { level: worst, drivingIndicator: driving };
  }

  function trendSeries(astronaut, indicator, readings, days) {
    var list = readings.slice(-(days || 30));
    var field = INDICATORS[indicator].field;
    return {
      labels: list.map(function (r) { return r.date; }),
      values: list.map(function (r) { return r[field]; }),
      baseline: astronaut.baseline[indicator],
      unit: INDICATORS[indicator].unit,
      label: INDICATORS[indicator].label
    };
  }

  // Readiness 0-100 from sleep vs 8.5 hours scheduled, mood, and heart-rate drift.
  // Team-defined demo values - not NASA medical limits.
  function readinessScore(astronaut, readings) {
    if (!readings || !readings.length) return 100;
    var latest = readings[readings.length - 1];
    var sleepScore = Math.max(0, Math.min(100, (latest.sleepHours / 8.5) * 100));
    var moodScore = (latest.mood / 10) * 100;
    var hrScore = Math.max(0, 100 - Math.abs(driftPct(latest.heartRate, astronaut.baseline.heartRate)) * 5);
    return Math.round(sleepScore * 0.5 + moodScore * 0.3 + hrScore * 0.2);
  }

  // SANS eye status — the ONLY published threshold in this app.
  // Published: retinal thickening +20 micrometres = early sign, +55 = concerning.
  function sansStatus(eyeChangeUm) {
    if (eyeChangeUm === null || eyeChangeUm === undefined) return 'green';
    if (eyeChangeUm >= 55) return 'red';
    if (eyeChangeUm >= 20) return 'amber';
    return 'green';
  }

  function trendArrow(astronaut, indicator, readings) {
    if (!readings || readings.length < 2) return '→';
    var field = INDICATORS[indicator].field;
    var first = readings[0][field], last = readings[readings.length - 1][field];
    if (first === null || last === null) return '→';
    if (last > first) return '↑';
    if (last < first) return '↓';
    return '→';
  }

  function plainReason(astronaut, indicator, readings) {
    if (!readings || !readings.length) return 'No readings yet.';
    var key = indicator, base = astronaut.baseline[key];
    var latest = readings[readings.length - 1][INDICATORS[key].field];
    var level = indicatorStatus(astronaut, key, readings);
    var label = INDICATORS[key].label;
    if (level === 'green') return label + ' is close to this astronaut\u2019s own baseline (' + base + ' ' + INDICATORS[key].unit + '). No action.';
    if (level === 'amber') return label + ' has drifted from baseline (' + base + ' ' + INDICATORS[key].unit + ', latest ' + latest + '). Recheck it, follow the guidance, and log it again tomorrow.';
    return label + ' is well away from baseline (' + base + ' ' + INDICATORS[key].unit + ', latest ' + latest + '). Act now — follow the action steps and tell Earth.';
  }

  window.CrewCareTrends = {
    THRESHOLDS: THRESHOLDS, INDICATORS: INDICATORS,
    driftPct: driftPct, indicatorStatus: indicatorStatus, overallStatus: overallStatus,
    trendSeries: trendSeries, readinessScore: readinessScore, sansStatus: sansStatus,
    trendArrow: trendArrow, plainReason: plainReason
  };
})();
