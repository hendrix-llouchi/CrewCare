// TEMPORARY stand-ins so screens can be built. Replace with data.js, trends.js and triage.js. All data here is SIMULATED.
(function () {
  const latestDate = "2026-11-14";
  const environments = {
    ISS: { name: "ISS", delaySeconds: 0, delayLabel: "Near-instant" },
    Moon: { name: "Moon", delaySeconds: 1.3, delayLabel: "About 1.3 seconds" },
    Mars: { name: "Mars", delaySeconds: 1320, delayLabel: "About 22 minutes (20 to 24)" }
  };
  const crew = [
    { id: "crew-a", name: "Crew member A", role: "Crew member", storyLabel: "Healthy", simulated: true },
    { id: "crew-b", name: "Crew member B", role: "Crew member", storyLabel: "Sleep drift", simulated: true },
    { id: "crew-c", name: "Crew member C", role: "Crew member", storyLabel: "Rising blood pressure", simulated: true },
    { id: "crew-d", name: "Crew member D", role: "Crew member", storyLabel: "Chest-pain emergency", simulated: true }
  ];
  const indicators = {
    bloodPressureSystolic: { label: "Blood pressure", unit: "mmHg", base: 124, step: 0.1 },
    bloodPressureDiastolic: { label: "Blood pressure", unit: "mmHg", base: 80, step: 0.1 },
    heartRate: { label: "Heart rate", unit: "beats per minute", base: 72, step: 0.2 },
    bloodSugar: { label: "Blood sugar", unit: "mmol/L", base: 5.4, step: 0.1 },
    temperature: { label: "Body temperature", unit: "degrees Celsius", base: 36.8, step: 0.1 },
    sleepHours: { label: "Sleep", unit: "hours", base: 7, step: 0.1 },
    mood: { label: "Mood", unit: "score out of 5", base: 3, step: 0.1 }
  };
  // These baselines and daily series are deterministic simulated stand-ins, not thresholds or guidance.
  const latestValues = {
    "crew-a": { heartRate: 62 },
    "crew-b": { sleepHours: 5.8 },
    "crew-c": { bloodPressureSystolic: 138, bloodPressureDiastolic: 88 },
    "crew-d": { heartRate: 96 }
  };
  const statuses = {
    "crew-a": { level: "ok", levelLabel: "Normal", colour: "green", trend: "steady", word: "Green, steady" },
    "crew-b": { level: "watch", levelLabel: "Watch", colour: "amber", trend: "falling", word: "Amber, falling" },
    "crew-c": { level: "warn", levelLabel: "Warn", colour: "amber", trend: "rising", word: "Amber, rising" },
    "crew-d": { level: "act", levelLabel: "Act now", colour: "red", trend: "rising", word: "Red, rising" }
  };
  const latestSummaries = {
    "crew-a": { indicator: "heartRate", label: "Heart rate", value: 62, unit: "beats per minute", date: latestDate },
    "crew-b": { indicator: "sleepHours", label: "Sleep", value: 5.8, unit: "hours", date: latestDate },
    "crew-c": { indicator: "bloodPressureSystolic", label: "Blood pressure", value: "138 over 88", unit: "mmHg", date: latestDate },
    "crew-d": { indicator: "heartRate", label: "Heart rate", value: 96, unit: "beats per minute", date: latestDate }
  };
  const outbox = [];
  const triageAnswers = {};
  let environmentInMemory = "ISS";
  let messageSequence = 0;

  function getMemberIndex(id) {
    return crew.findIndex(function (member) {
      return member.id === id;
    });
  }

  function roundReading(value, indicator) {
    if (indicator === "bloodPressureSystolic" || indicator === "bloodPressureDiastolic") {
      return Math.round(value);
    }
    return Math.round(value * 10) / 10;
  }

  function simulatedValue(id, indicator, dayIndex) {
    const memberIndex = getMemberIndex(id);
    const config = indicators[indicator];
    if (memberIndex < 0 || !config) {
      return null;
    }

    const latest = latestValues[id] && latestValues[id][indicator];
    let value = latest === undefined
      ? config.base + (memberIndex - 1.5) * config.step
      : latest;

    if (id === "crew-b" && indicator === "sleepHours") {
      value += (29 - dayIndex) * 0.07;
    } else if (id === "crew-c" && indicator === "bloodPressureSystolic") {
      value -= (29 - dayIndex) * 0.35;
    } else if (id === "crew-c" && indicator === "bloodPressureDiastolic") {
      value -= (29 - dayIndex) * 0.2;
    } else if (id === "crew-d" && indicator === "heartRate") {
      value -= (29 - dayIndex) * 0.62;
    } else if (id === "crew-a" && indicator === "heartRate") {
      value += [-0.4, 0, 0.4, 0, -0.4, 0][dayIndex % 6];
    } else {
      value += (((dayIndex + memberIndex * 2) % 5) - 2) * config.step;
    }

    return roundReading(value, indicator);
  }

  function createStatus(id) {
    const status = statuses[id];
    if (!status) {
      return null;
    }
    return Object.assign({}, status, {
      reason: "TODO(content): Add a plain-English reason for the simulated " +
        crew[getMemberIndex(id)].storyLabel + " status."
    });
  }

  function getEnvironmentDetails(name) {
    return Object.assign({}, environments[name]);
  }

  if (typeof getCrew === "undefined") {
    window.getCrew = function () {
      return crew.map(function (member) {
        return Object.assign({}, member);
      });
    };
  }

  if (typeof getAstronaut === "undefined") {
    window.getAstronaut = function (id) {
      const member = crew.find(function (item) {
        return item.id === id;
      });
      return member ? Object.assign({}, member) : null;
    };
  }

  if (typeof getReadings === "undefined") {
    window.getReadings = function (id, indicator, days) {
      if (getMemberIndex(id) < 0) {
        return [];
      }
      if (!Object.prototype.hasOwnProperty.call(indicators, indicator)) {
        throw new RangeError("Unknown simulated indicator: " + indicator);
      }

      const count = days === undefined || days === null
        ? 30
        : Math.max(0, Math.min(30, Math.floor(Number(days))));
      const firstDay = 30 - count;

      return Array.from({ length: count }, function (_, offset) {
        const dayIndex = firstDay + offset;
        const date = new Date(Date.UTC(2026, 9, 16 + dayIndex))
          .toISOString()
          .slice(0, 10);
        return {
          date: date,
          value: simulatedValue(id, indicator, dayIndex),
          unit: indicators[indicator].unit,
          qualityOk: true
        };
      });
    };
  }

  if (typeof getBaseline === "undefined") {
    window.getBaseline = function (id, indicator) {
      const readings = window.getReadings(id, indicator, 30);
      return readings.length
        ? { value: readings[0].value, unit: readings[0].unit }
        : null;
    };
  }

  if (typeof getLatestSummary === "undefined") {
    window.getLatestSummary = function (id) {
      const summary = latestSummaries[id];
      return summary ? Object.assign({}, summary) : null;
    };
  }

  if (typeof getStatus === "undefined") {
    window.getStatus = createStatus;
  }

  if (typeof getSystemStatus === "undefined") {
    window.getSystemStatus = function (id) {
      return window.getStatus(id);
    };
  }

  if (typeof getEnvironment === "undefined") {
    window.getEnvironment = function () {
      try {
        const saved = window.localStorage.getItem("crewcare.environment");
        if (Object.prototype.hasOwnProperty.call(environments, saved)) {
          environmentInMemory = saved;
        }
      } catch (error) {
        console.error("CrewCare could not read the saved environment.", error);
      }
      return environmentInMemory;
    };
  }

  if (typeof setEnvironment === "undefined") {
    window.setEnvironment = function (name) {
      if (!Object.prototype.hasOwnProperty.call(environments, name)) {
        throw new RangeError("Unknown environment: " + name);
      }

      const changed = environmentInMemory !== name;
      environmentInMemory = name;
      try {
        window.localStorage.setItem("crewcare.environment", name);
      } catch (error) {
        console.error("CrewCare could not save the selected environment.", error);
      }

      const details = getEnvironmentDetails(name);
      if (changed) {
        window.dispatchEvent(new CustomEvent("crewcare:environment", { detail: details }));
      }
      return details;
    };
  }

  if (typeof queueMessage === "undefined") {
    window.queueMessage = function (text) {
      const environment = window.getEnvironment();
      const details = getEnvironmentDetails(environment);
      const createdAt = new Date();
      const message = {
        id: "message-" + (++messageSequence),
        text: String(text),
        environment: environment,
        createdAt: createdAt.toISOString(),
        status: "pending",
        countdownEnd: new Date(createdAt.getTime() + details.delaySeconds * 1000).toISOString()
      };
      outbox.push(message);
      return Object.assign({}, message);
    };
  }

  if (typeof getOutbox === "undefined") {
    window.getOutbox = function () {
      return outbox.map(function (message) {
        return Object.assign({}, message);
      });
    };
  }

  if (typeof getTriageStep === "undefined") {
    window.getTriageStep = function (scenario, stepNumber) {
      if (scenario !== "chest-pain" || stepNumber < 1 || stepNumber > 5) {
        return null;
      }
      return {
        question: "TODO(content)",
        answers: ["Yes", "No", "Not sure"],
        stepNumber: stepNumber,
        totalSteps: 5
      };
    };
  }

  if (typeof answerTriageStep === "undefined") {
    window.answerTriageStep = function (scenario, stepNumber, answer) {
      if (scenario !== "chest-pain" || !["Yes", "No", "Not sure"].includes(answer)) {
        throw new TypeError("Unsupported simulated triage answer.");
      }
      triageAnswers[scenario] = triageAnswers[scenario] || [];
      triageAnswers[scenario][stepNumber - 1] = answer;
      return stepNumber < 5
        ? window.getTriageStep(scenario, stepNumber + 1)
        : window.getTriageOutcome(scenario, triageAnswers[scenario].slice());
    };
  }

  if (typeof getTriageOutcome === "undefined") {
    window.getTriageOutcome = function () {
      return {
        level: "TODO(content)",
        levelLabel: "TODO(content)",
        doNow: "TODO(content)",
        checkNext: "TODO(content)",
        prepare: "TODO(content)",
        tellEarth: "TODO(content)"
      };
    };
  }

  if (typeof getInventory === "undefined") {
    window.getInventory = function () {
      return [];
    };
  }

  if (typeof getEvidence === "undefined") {
    window.getEvidence = function (studyId) {
      return {
        studyId: studyId,
        title: "TODO(content)",
        summary: "TODO(content)"
      };
    };
  }
})();
