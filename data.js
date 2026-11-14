// data.js — PLACEHOLDER — Henry's backend, replace with your own code.
// This file is a thin stub: just enough sample data for the frontend to demo.
// Henry is building the real backend himself and will replace this file.
//
// SIMULATED DATA, DEMO ONLY. All crew readings are made up for the
// NASA Space Apps 2026 demo. They are NOT real astronaut data.
// There is no live NASA astronaut feed.
// Shape (from the Backend PRD, section 3):
//   astronaut: { id, name, role, story, storyLabel, baseline: {bpSys, bpDia, heartRate, bloodSugar, temp, sleepHours, mood} }
//   reading:   { astronautId, date, source, bpSys, bpDia, heartRate, bloodSugar, temp, sleepHours, mood, radiationMsvCumulative, eyeChangeUm }
//   inventory: { id, name, quantity, expiryDate, lowStockAt }
(function () {
  'use strict';

  var ASTRONAUTS = [
    { id: 'a1', name: 'Crew Member 1', role: 'Commander', story: 'healthy', storyLabel: 'Healthy — steady readings',
      baseline: { bpSys: 118, bpDia: 76, heartRate: 62, bloodSugar: 5.1, temp: 36.6, sleepHours: 7.8, mood: 8 } },
    { id: 'a2', name: 'Crew Member 2', role: 'Crew Medical Officer', story: 'sleep-drift', storyLabel: 'Sleep drift — sleeping less night after night',
      baseline: { bpSys: 116, bpDia: 74, heartRate: 60, bloodSugar: 5.0, temp: 36.6, sleepHours: 7.6, mood: 8 } },
    { id: 'a3', name: 'Crew Member 3', role: 'Mission Specialist', story: 'bp-rise', storyLabel: 'Rising blood pressure — climbing over 30 days',
      baseline: { bpSys: 118, bpDia: 76, heartRate: 64, bloodSugar: 5.2, temp: 36.7, sleepHours: 7.5, mood: 8 } },
    { id: 'a4', name: 'Crew Member 4', role: 'Flight Engineer', story: 'emergency', storyLabel: 'Becomes the chest-pain emergency in the demo',
      baseline: { bpSys: 120, bpDia: 78, heartRate: 64, bloodSugar: 5.3, temp: 36.6, sleepHours: 7.7, mood: 8 } }
  ];

  // Sample 30-day readings, 2026-10-16 to 2026-11-14, built from each baseline
  // with a small daily drift so each story shows up. Replace with Henry's real data.
  function buildReadings() {
    var out = [];
    var start = new Date(2026, 9, 16); // 2026-10-16
    ASTRONAUTS.forEach(function (a) {
      var b = a.baseline;
      for (var i = 0; i < 30; i++) {
        var d = new Date(start.getTime() + i * 86400000);
        var r = {
          astronautId: a.id, date: d.toISOString().slice(0, 10), source: 'simulated',
          bpSys: b.bpSys, bpDia: b.bpDia, heartRate: b.heartRate,
          bloodSugar: b.bloodSugar, temp: b.temp, sleepHours: b.sleepHours, mood: b.mood,
          radiationMsvCumulative: Math.round((110 + i * 1.0) * 10) / 10,
          eyeChangeUm: 8
        };
        if (a.id === 'a2') { r.sleepHours = Math.round((b.sleepHours - i * 0.05) * 10) / 10; r.mood = Math.max(6, Math.round(b.mood - i * 0.03)); r.heartRate = b.heartRate + Math.round(i * 0.15); }
        if (a.id === 'a3') { r.bpSys = Math.round(b.bpSys + i * 0.48); r.bpDia = Math.round(b.bpDia + i * 0.2); }
        if (a.id === 'a4') { r.bpSys = Math.round(b.bpSys + i * 0.85); r.bpDia = Math.round(b.bpDia + i * 0.35); r.heartRate = Math.round(b.heartRate + i * 0.75); r.sleepHours = Math.round((b.sleepHours - i * 0.06) * 10) / 10; r.mood = Math.max(5, Math.round(b.mood - i * 0.1)); r.eyeChangeUm = Math.round(10 + i * 0.38); }
        out.push(r);
      }
    });
    return out;
  }

  // Sample inventory. One item expires soon, one is low stock — replace with Henry's list.
  var INVENTORY = [
    { id: 'inv1', name: 'Paracetamol 500 mg tablets', quantity: 48, expiryDate: '2027-06-30', lowStockAt: 10 },
    { id: 'inv2', name: 'Ibuprofen 200 mg tablets', quantity: 6, expiryDate: '2027-03-15', lowStockAt: 10 },
    { id: 'inv3', name: 'Oral rehydration salts (sachets)', quantity: 24, expiryDate: '2026-11-28', lowStockAt: 5 },
    { id: 'inv4', name: 'Adhesive dressings (box)', quantity: 3, expiryDate: '2027-01-20', lowStockAt: 5 },
    { id: 'inv5', name: 'Pulse oximeter', quantity: 2, expiryDate: '2028-01-01', lowStockAt: 1 }
  ];

  window.CREWCARE_DATA = { astronauts: ASTRONAUTS, readings: buildReadings(), inventory: INVENTORY };
})();
