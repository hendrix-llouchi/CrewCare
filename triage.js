// triage.js — PLACEHOLDER — Henry's backend, replace with your own code.
// Thin stub with the agreed step-tree shape from the Backend PRD, section 6.
// Triage is a fixed step tree supplied as data, not hard-coded screens.
// It GUIDES checks and next steps. It never gives a diagnosis.
//
// Scenario: a crewmate has sharp chest pain and collapses.
// Steps in order: responsiveness, breathing, pulse, chest-pain questions, then a final action.
// Each final action is red / amber / green, with: Do now / Check next / Prepare / Tell Earth.
(function () {
  'use strict';

  var STEPS = [
    { id: 'responsive', step: 1, total: 5, question: 'Is the crewmate responsive? Shout their name and tap their shoulder.',
      options: [
        { label: 'Yes — they respond', next: 'breathing' },
        { label: 'No — no response', next: 'outcome-red-unresponsive' },
        { label: 'Not sure', next: 'breathing' } ] },
    { id: 'breathing', step: 2, total: 5, question: 'Are they breathing? Watch the chest for 10 seconds.',
      options: [
        { label: 'Yes — breathing normally', next: 'pulse' },
        { label: 'No — not breathing', next: 'outcome-red-notbreathing' },
        { label: 'Not sure / gasping', next: 'outcome-red-notbreathing' } ] },
    { id: 'pulse', step: 3, total: 5, question: 'Can you feel a pulse? Two fingers on the side of the neck, 10 seconds.',
      options: [
        { label: 'Yes — pulse felt', next: 'chestpain' },
        { label: 'No — no pulse', next: 'outcome-red-nopulse' },
        { label: 'Not sure', next: 'chestpain' } ] },
    { id: 'chestpain', step: 4, total: 5, question: 'Is the chest pain still there? Is it crushing or spreading to the arm or jaw?',
      options: [
        { label: 'Yes — severe or spreading', next: 'outcome-red-chestpain' },
        { label: 'Yes — mild, staying put', next: 'outcome-amber-chestpain' },
        { label: 'No — pain has gone', next: 'outcome-amber-chestpain' } ] }
  ];

  var OUTCOMES = {
    'outcome-red-unresponsive': { level: 'red', title: 'Possible emergency — act now',
      doNow: ['Call for help from the rest of the crew.', 'Lay them flat. Do not leave them alone.', 'Start CPR if you are trained and they are not breathing.'],
      checkNext: ['Breathing every minute.', 'Pulse every minute.', 'Any bleeding or injury from the fall.'],
      prepare: ['Defibrillator (AED) and oxygen, if available.', 'Medical kit at the bedside.'],
      tellEarth: 'EMERGENCY: crewmate unresponsive after chest pain and collapse. Starting emergency steps on board. Need flight surgeon guidance now.' },
    'outcome-red-notbreathing': { level: 'red', title: 'Possible emergency — act now',
      doNow: ['Call for help from the rest of the crew.', 'Start CPR if you are trained.', 'Send someone for the defibrillator (AED).'],
      checkNext: ['Breathing every minute.', 'Pulse every minute.'],
      prepare: ['Defibrillator (AED) and oxygen, if available.', 'Medical kit at the bedside.'],
      tellEarth: 'EMERGENCY: crewmate not breathing after chest pain and collapse. CPR started on board. Need flight surgeon guidance now.' },
    'outcome-red-nopulse': { level: 'red', title: 'Possible emergency — act now',
      doNow: ['Call for help from the rest of the crew.', 'Start CPR if you are trained.', 'Send someone for the defibrillator (AED).'],
      checkNext: ['Pulse every minute.', 'Breathing every minute.'],
      prepare: ['Defibrillator (AED) and oxygen, if available.', 'Medical kit at the bedside.'],
      tellEarth: 'EMERGENCY: crewmate has no pulse after chest pain and collapse. CPR started on board. Need flight surgeon guidance now.' },
    'outcome-red-chestpain': { level: 'red', title: 'Possible emergency — act now',
      doNow: ['Keep them resting and calm. Do not let them walk around.', 'Loosen tight clothing. Keep them warm.', 'Stay with them — do not leave them alone.'],
      checkNext: ['Blood pressure, heart rate and oxygen every 5 minutes.', 'Is the pain spreading to the arm, jaw or back?', 'Are they sweating, pale, or short of breath?'],
      prepare: ['Defibrillator (AED) nearby.', 'Oxygen, if available.', 'Medical kit at the bedside.'],
      tellEarth: 'URGENT: crewmate with severe chest pain after collapse. Resting, monitored on board. Need flight surgeon guidance now.' },
    'outcome-amber-chestpain': { level: 'amber', title: 'Needs close watching — warn',
      doNow: ['Keep them resting. Do not let them do heavy work.', 'Recheck blood pressure, heart rate and oxygen now.'],
      checkNext: ['Repeat the readings every 15 minutes for one hour.', 'Ask again about pain, breathlessness and sweating.', 'Log every reading in the app.'],
      prepare: ['Defibrillator (AED) nearby, just in case.', 'Medical kit within reach.'],
      tellEarth: 'Crewmate had chest pain, now milder. Resting and being watched. Readings attached. Please advise.' }
  };

  var state = { currentStepId: null, history: [], outcome: null };

  function startTriage() {
    state = { currentStepId: 'responsive', history: [], outcome: null };
    return getCurrent();
  }
  function getCurrent() {
    if (state.outcome) return { type: 'outcome', outcome: state.outcome };
    var step = STEPS.find(function (s) { return s.id === state.currentStepId; });
    return step ? { type: 'step', step: step } : null;
  }
  // answerTriage(optionIndex): follow the step tree. Returns the next step or the outcome.
  function answerTriage(optionIndex) {
    var cur = getCurrent();
    if (!cur || cur.type !== 'step') return cur;
    var opt = cur.step.options[optionIndex];
    if (!opt) return cur;
    state.history.push({ step: cur.step.id, answer: opt.label });
    if (OUTCOMES[opt.next]) { state.outcome = OUTCOMES[opt.next]; state.currentStepId = null; }
    else { state.currentStepId = opt.next; }
    return getCurrent();
  }
  function resetTriage() { state = { currentStepId: null, history: [], outcome: null }; }

  window.CrewCareTriage = { STEPS: STEPS, OUTCOMES: OUTCOMES, startTriage: startTriage, answerTriage: answerTriage, resetTriage: resetTriage, getCurrent: getCurrent };
})();
