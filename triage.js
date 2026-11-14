// Offline, simulated decision tree for guiding a crew medical officer through checks.
// It guides actions only; it does not diagnose or replace flight-surgeon guidance.
(function () {
  'use strict';

  var STEPS = [
    {
      id: 'responsive',
      step: 1,
      total: 4,
      question: 'Is the crewmate responsive? Shout their name and tap their shoulder.',
      options: [
        { label: 'Yes — they respond', next: 'breathing' },
        { label: 'No — no response', next: 'outcome-red-unresponsive' },
        { label: 'Not sure', next: 'breathing' }
      ]
    },
    {
      id: 'breathing',
      step: 2,
      total: 4,
      question: 'Are they breathing? Watch the chest for 10 seconds.',
      options: [
        { label: 'Yes — breathing normally', next: 'pulse' },
        { label: 'No — not breathing', next: 'outcome-red-notbreathing' },
        { label: 'Not sure / gasping', next: 'outcome-red-notbreathing' }
      ]
    },
    {
      id: 'pulse',
      step: 3,
      total: 4,
      question: 'Can you feel a pulse? Two fingers on the side of the neck, 10 seconds.',
      options: [
        { label: 'Yes — pulse felt', next: 'chestpain' },
        { label: 'No — no pulse', next: 'outcome-red-nopulse' },
        { label: 'Not sure', next: 'chestpain' }
      ]
    },
    {
      id: 'chestpain',
      step: 4,
      total: 4,
      question: 'Is the chest pain still there? Is it crushing or spreading to the arm or jaw?',
      options: [
        { label: 'Yes — severe or spreading', next: 'outcome-red-chestpain' },
        { label: 'Yes — mild, staying put', next: 'outcome-amber-chestpain' },
        { label: 'No — pain has gone', next: 'outcome-amber-chestpain' }
      ]
    }
  ];

  var OUTCOMES = {
    'outcome-red-unresponsive': {
      level: 'red',
      title: 'Possible emergency — act now',
      doNow: [
        'Call for help from the rest of the crew.',
        'Stay with the crewmate and keep them lying down.',
        'If they are not breathing normally, start CPR if you are trained.'
      ],
      checkNext: [
        'Check breathing every minute.',
        'Check for a pulse every minute.',
        'Look for any injury from the fall.'
      ],
      prepare: [
        'Bring the defibrillator (AED) and oxygen, if available.',
        'Bring the medical kit to the crewmate.'
      ],
      tellEarth: 'Emergency: a crewmate had chest pain, collapsed, and is unresponsive. We are checking breathing and calling the crew for help. Please provide flight surgeon guidance now.'
    },
    'outcome-red-notbreathing': {
      level: 'red',
      title: 'Possible emergency — act now',
      doNow: [
        'Call for help from the rest of the crew.',
        'If you are trained, start CPR now.',
        'Ask another crew member to bring the defibrillator (AED).'
      ],
      checkNext: [
        'Keep checking breathing and follow the device prompts if available.',
        'Watch for any change and tell the crew member helping you.'
      ],
      prepare: [
        'Bring the defibrillator (AED) and oxygen, if available.',
        'Bring the medical kit to the crewmate.'
      ],
      tellEarth: 'Emergency: a crewmate had chest pain, collapsed, and is not breathing normally. We have called for crew help and are starting CPR if trained. Please provide flight surgeon guidance now.'
    },
    'outcome-red-nopulse': {
      level: 'red',
      title: 'Possible emergency — act now',
      doNow: [
        'Call for help from the rest of the crew.',
        'If you are trained, start CPR now.',
        'Ask another crew member to bring the defibrillator (AED).'
      ],
      checkNext: [
        'Keep checking breathing and pulse.',
        'Watch for any change and tell the crew member helping you.'
      ],
      prepare: [
        'Bring the defibrillator (AED) and oxygen, if available.',
        'Bring the medical kit to the crewmate.'
      ],
      tellEarth: 'Emergency: a crewmate had chest pain, collapsed, and no pulse could be felt. We have called for crew help and are starting CPR if trained. Please provide flight surgeon guidance now.'
    },
    'outcome-red-chestpain': {
      level: 'red',
      title: 'Possible emergency — act now',
      doNow: [
        'Keep the crewmate resting and calm; do not let them walk around.',
        'Loosen tight clothing and stay with them.',
        'Call another crew member to help.'
      ],
      checkNext: [
        'Recheck blood pressure, heart rate, and oxygen every 5 minutes.',
        'Ask whether the pain is spreading to the arm, jaw, or back.',
        'Watch for sweating, pale skin, or trouble breathing.'
      ],
      prepare: [
        'Keep the defibrillator (AED) nearby.',
        'Bring oxygen, if available, and the medical kit.'
      ],
      tellEarth: 'Urgent: a crewmate collapsed and still has severe or spreading chest pain. They are resting while we monitor their readings and call for crew help. Please provide flight surgeon guidance now.'
    },
    'outcome-amber-chestpain': {
      level: 'amber',
      title: 'Needs close watching — warn',
      doNow: [
        'Keep the crewmate resting; do not let them do heavy work.',
        'Recheck blood pressure, heart rate, and oxygen now.',
        'Stay with them and call another crew member to help watch.'
      ],
      checkNext: [
        'Repeat the readings every 15 minutes for one hour.',
        'Ask again about pain, trouble breathing, and sweating.',
        'Record each check in the app.'
      ],
      prepare: [
        'Keep the defibrillator (AED) nearby, if available.',
        'Keep the medical kit within reach.'
      ],
      tellEarth: 'Update: a crewmate collapsed after chest pain; the pain is now mild or has gone. They are resting while we repeat checks and record readings. Please provide flight surgeon guidance.'
    }
  };

  var state = { currentStepId: null, history: [], outcome: null };

  function findStep(stepId) {
    return STEPS.find(function (step) { return step.id === stepId; }) || null;
  }

  function startTriage() {
    state = { currentStepId: 'responsive', history: [], outcome: null };
    return getCurrent();
  }

  function getCurrent() {
    if (state.outcome) return { type: 'outcome', outcome: state.outcome };
    var step = findStep(state.currentStepId);
    return step ? { type: 'step', step: step } : null;
  }

  function answerTriage(optionIndex) {
    var current = getCurrent();
    if (!current || current.type !== 'step') return current;
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= current.step.options.length) {
      return current;
    }

    var option = current.step.options[optionIndex];
    state.history.push({ step: current.step.id, answer: option.label });

    var nextStep = findStep(option.next);
    if (nextStep) {
      state.currentStepId = nextStep.id;
      return getCurrent();
    }

    if (Object.prototype.hasOwnProperty.call(OUTCOMES, option.next)) {
      state.outcome = OUTCOMES[option.next];
      state.currentStepId = null;
      return getCurrent();
    }

    return current;
  }

  function resetTriage() {
    state = { currentStepId: null, history: [], outcome: null };
  }

  window.CrewCareTriage = {
    STEPS: STEPS,
    OUTCOMES: OUTCOMES,
    startTriage: startTriage,
    answerTriage: answerTriage,
    resetTriage: resetTriage,
    getCurrent: getCurrent
  };
})();
