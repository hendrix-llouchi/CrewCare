// guidance.js — CrewCare just-in-time guidance and evidence panels (frontend content).
// Five blocks per measurement: how to take it, why it matters, what a good reading
// looks like, what to do if it is off, and a quality check. Plain language throughout.
// This app guides checks and next steps. It never gives a diagnosis.
// Alert bands in the app are team-defined demo values — the only published threshold
// cited is the SANS eye threshold (+20 micrometres early, +55 concerning).
(function () {
  'use strict';

  var GUIDANCE = {
    bpSys: {
      indicator: 'Blood pressure', unit: 'mmHg',
      howTo: ['Sit down and rest for 5 minutes first.', 'Put the cuff on the bare upper arm, snug but not tight.', 'Keep the arm supported at heart height. Stay still and quiet while it measures.', 'Take it twice, one minute apart, and write down both.'],
      whyItMatters: 'Blood pressure shows how hard the heart is working. In space, fluid shifts and stress can push it up slowly — drift over days is the warning, not one high number.',
      goodReading: 'A good reading is close to that astronaut\u2019s own pre-flight baseline, and steady day to day.',
      ifOff: ['Rest 5 minutes and retake it.', 'If it is still well above baseline, recheck heart rate too and log both.', 'If the astronaut also has chest pain or breathlessness, go to Emergency triage now.'],
      qualityCheck: 'Was the cuff too loose, or the arm hanging down? Retake it with the arm supported.' },
    heartRate: {
      indicator: 'Heart rate', unit: 'bpm',
      howTo: ['Rest for 5 minutes first — do not measure straight after exercise.', 'Use the chest strap or the finger sensor, as shown on screen.', 'Stay still for 30 seconds while it counts.'],
      whyItMatters: 'Resting heart rate rises when the body is stressed, short of sleep, or unwell. Compared with the astronaut\u2019s own baseline, a steady rise over days is an early warning.',
      goodReading: 'A good reading is close to that astronaut\u2019s own resting baseline, and steady day to day.',
      ifOff: ['Rest 5 minutes and retake it.', 'Check sleep and mood too — tiredness often lifts heart rate.', 'If it is far above baseline and the astronaut has chest pain, go to Emergency triage now.'],
      qualityCheck: 'Was the sensor loose, or had they just exercised? Retake it after resting.' },
    bloodSugar: {
      indicator: 'Blood sugar', unit: 'mmol/L',
      howTo: ['Wash and dry the hands first.', 'Use a fresh test strip and the finger prick as shown.', 'Write down the number and whether they had eaten in the last 2 hours.'],
      whyItMatters: 'Blood sugar is the body\u2019s fuel level. Food, stress and illness move it. A pattern over days matters more than one reading.',
      goodReading: 'A good reading is close to that astronaut\u2019s own baseline for the same time of day.',
      ifOff: ['Check when they last ate — a meal in the last hour explains a high reading.', 'Retake it in one hour.', 'If they feel shaky, sweaty or confused, act now and tell the crew.'],
      qualityCheck: 'Were the hands wet, or was it just after a meal? Note the meal time and retake it later.' },
    temp: {
      indicator: 'Body temperature', unit: '°C',
      howTo: ['Use the thermometer as shown — under the tongue or in the ear.', 'Do not measure straight after a hot drink or exercise.', 'Wait for the beep, then write the number down.'],
      whyItMatters: 'Temperature is the simplest sign of infection or overheating. A rise from the astronaut\u2019s own baseline, kept over a day, is worth watching.',
      goodReading: 'A good reading is close to that astronaut\u2019s own baseline, usually around 36.6 °C.',
      ifOff: ['Wait 15 minutes and retake it.', 'Check heart rate and mood too.', 'If temperature keeps rising, or the astronaut feels very unwell, tell Earth.'],
      qualityCheck: 'Was it just after a hot drink or exercise? Wait 15 minutes and retake it.' },
    sleepHours: {
      indicator: 'Sleep', unit: 'hours',
      howTo: ['Log sleep in the morning, from the wrist sensor or from memory.', 'Write the hours slept and how rested they feel, 1 to 10.', 'Do this every day — one night tells you little, a week tells you a lot.'],
      whyItMatters: 'Sleep is when the body recovers. On the ISS, crew average about 6.1 hours a night against 8.5 hours scheduled. Short sleep night after night raises heart rate, lowers mood, and makes mistakes more likely.',
      goodReading: 'A good night is close to that astronaut\u2019s own baseline, near 8 hours, and they wake up rested.',
      ifOff: ['Check light and noise in the sleeping area tonight.', 'Keep wake-up times steady.', 'If short sleep lasts 5 nights, flag it and tell Earth.'],
      qualityCheck: 'Did the wrist sensor slip off in the night? Cross-check with how rested they feel.' },
    mood: {
      indicator: 'Mood', unit: '1-10',
      howTo: ['Ask: "How are you feeling today, 1 to 10?"', '1 means very low, 10 means very good.', 'Write the number and one short sentence in their own words.'],
      whyItMatters: 'Mood is the earliest sign that isolation, tiredness or stress is building. A slow fall over a week matters more than one bad day.',
      goodReading: 'A good score is close to that astronaut\u2019s own baseline, and steady day to day.',
      ifOff: ['Ask what changed — sleep, workload, or a message from home.', 'Make time to talk, and log the score again tomorrow.', 'If mood stays low for a week, or they say they feel unsafe, tell Earth and the crew.'],
      qualityCheck: 'Was it scored in a rush? Ask again when they have a quiet minute.' }
  };

  // OSDR evidence panels — bundled text, labelled as evidence, NOT a live feed.
  // No findings, numbers or astronaut names invented here.
  var EVIDENCE = [
    { id: 'OSD-816', title: 'Eyes / SANS', system: 'eyes',
      summary: 'NASA Open Science Data Repository study on spaceflight-associated neuro-ocular syndrome (SANS) — eye and vision changes on long missions. Why eye checks matter: the published SANS threshold is retinal thickening of +20 micrometres (early sign) and +55 micrometres (concerning).',
      appearsIn: 'Body dashboard — eyes; Radiation and sleep watch.' },
    { id: 'OSD-1032', title: 'Sleep', system: 'sleep',
      summary: 'NASA Open Science Data Repository study on sleep and psychomotor vigilance in head-down bed rest, a ground model for spaceflight. Why it matters: sleep drift is a health and safety risk, not just tiredness.',
      appearsIn: 'Body dashboard — brain / sleep; Radiation and sleep watch.' },
    { id: 'OSD-1040', title: 'Exercise countermeasures', system: 'exercise',
      summary: 'NASA Open Science Data Repository study on exercise countermeasures in spaceflight. Why it matters: muscle, bone and heart fitness are tracked because exercise is the main defence against losing them.',
      appearsIn: 'Body dashboard — muscles / bones; Guidance — heart rate.' },
    { id: 'OSD-1023', title: 'Exercise countermeasures', system: 'exercise',
      summary: 'NASA Open Science Data Repository study on exercise countermeasures in spaceflight. Why it matters: muscle, bone and heart fitness are tracked because exercise is the main defence against losing them.',
      appearsIn: 'Body dashboard — muscles / bones; Guidance — heart rate.' }
  ];

  window.CREWCARE_GUIDANCE = { GUIDANCE: GUIDANCE, EVIDENCE: EVIDENCE };
})();
