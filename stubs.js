// TEMPORARY stand-ins so screens can be built. Replace with data.js, trends.js and triage.js. All data here is SIMULATED.
(function () {
  const currentDate = new Date();
  const latestDate = new Date(Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  )).toISOString().slice(0, 10);
  const environments = {
    ISS: { name: "ISS", delaySeconds: 0, delayLabel: "Near-instant" },
    Moon: { name: "Moon", delaySeconds: 1.3, delayLabel: "About 1.3 seconds" },
    Mars: { name: "Mars", delaySeconds: 1320, delayLabel: "About 22 minutes (20 to 24)" }
  };
  function dateOffsetFromToday(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  const inventory = [
    { name: "Item A", quantity: 8, expiry: dateOffsetFromToday(120), lowStockLevel: 2 },
    { name: "Item B", quantity: 3, expiry: dateOffsetFromToday(14), lowStockLevel: 1 },
    { name: "Item C", quantity: 1, expiry: dateOffsetFromToday(180), lowStockLevel: 2 },
    { name: "Item D", quantity: 5, expiry: dateOffsetFromToday(-1), lowStockLevel: 2 },
    { name: "Item E", quantity: 12, expiry: dateOffsetFromToday(90), lowStockLevel: 3 },
    { name: "Item F", quantity: 4, expiry: dateOffsetFromToday(240), lowStockLevel: 4 }
  ];
  const crew = [
    { id: "crew-a", name: "Crew member A", role: "Crew member", storyLabel: "Healthy", simulated: true },
    { id: "crew-b", name: "Crew member B", role: "Crew member", storyLabel: "Sleep drift", simulated: true },
    { id: "crew-c", name: "Crew member C", role: "Crew member", storyLabel: "Rising blood pressure", simulated: true },
    { id: "crew-d", name: "Crew member D", role: "Crew member", storyLabel: "Chest-pain emergency", simulated: true }
  ];
  const indicators = {
    bloodPressureSystolic: { label: "Blood pressure, systolic", unit: "mmHg", base: 124, step: 0.1 },
    bloodPressureDiastolic: { label: "Blood pressure, diastolic", unit: "mmHg", base: 80, step: 0.1 },
    heartRate: { label: "Heart rate", unit: "beats per minute", base: 72, step: 0.2 },
    bloodSugar: { label: "Blood sugar", unit: "mmol/L", base: 5.4, step: 0.1 },
    temperature: { label: "Body temperature", unit: "degrees Celsius", base: 36.8, step: 0.1 },
    sleepHours: { label: "Sleep", unit: "hours", base: 7, step: 0.1 },
    mood: { label: "Mood", unit: "score out of 5", base: 3, step: 0.1 }
  };
  if (typeof guidance === "undefined") {
    window.guidance = {
      bloodPressure: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      },
      heartRate: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      },
      bloodSugar: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      },
      temperature: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      },
      sleep: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      },
      mood: {
        howTo: ["TODO(content)"],
        whyItMatters: "TODO(content)",
        goodReading: "TODO(content)",
        ifOff: ["TODO(content)"],
        qualityCheck: "TODO(content)"
      }
    };
  }
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

  function loadSavedReadings() {
    const stored = window.localStorage.getItem("crewcare.readings");
    if (!stored) {
      return [];
    }

    const readings = JSON.parse(stored);
    if (!Array.isArray(readings)) {
      throw new TypeError("Saved CrewCare readings must be an array.");
    }
    return readings;
  }

  function readOutbox() {
    const stored = window.localStorage.getItem("crewcare.outbox");
    if (!stored) {
      return [];
    }

    const messages = JSON.parse(stored);
    if (!Array.isArray(messages)) {
      throw new TypeError("Saved CrewCare messages must be an array.");
    }
    return messages;
  }

  function saveOutbox(messages) {
    window.localStorage.setItem("crewcare.outbox", JSON.stringify(messages));
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

      if (count === 0) {
        return [];
      }

      const today = new Date();
      const simulated = Array.from({ length: count }, function (_, offset) {
        const dayIndex = firstDay + offset;
        const date = new Date(Date.UTC(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - (29 - dayIndex)
        ))
          .toISOString()
          .slice(0, 10);
        return {
          date: date,
          value: simulatedValue(id, indicator, dayIndex),
          unit: indicators[indicator].unit,
          qualityOk: true
        };
      });
      let saved = [];
      try {
        saved = loadSavedReadings().filter(function (reading) {
          return reading.crewId === id &&
            Object.prototype.hasOwnProperty.call(reading, indicator);
        });
      } catch (error) {
        console.error("CrewCare could not read saved check-ins.", error);
      }

      const readingsByDate = new Map();
      simulated.forEach(function (reading) {
        readingsByDate.set(reading.date, reading);
      });
      saved.forEach(function (reading) {
        readingsByDate.set(reading.date, {
          date: reading.date,
          value: reading[indicator],
          unit: indicators[indicator].unit,
          qualityOk: reading.qualityOk
        });
      });
      return Array.from(readingsByDate.values())
        .sort(function (first, second) {
          return first.date.localeCompare(second.date);
        })
        .slice(-count);
    };
  }

  if (typeof getRadiation === "undefined") {
    window.getRadiation = function (id) {
      if (getMemberIndex(id) < 0) {
        return null;
      }
      const days = 30;
      return {
        cumulativeMsv: Number((days * 1).toFixed(1)),
        days: days
      };
    };
  }

  if (typeof getChartData === "undefined") {
    window.getChartData = function (id, indicator) {
      const readings = window.getReadings(id, indicator, 30);
      if (!readings.length) {
        return null;
      }

      const baseline = window.getBaseline(id, indicator);
      if (!baseline) {
        return null;
      }

      return {
        label: indicators[indicator].label,
        unit: indicators[indicator].unit,
        points: readings.map(function (reading) {
          return { date: reading.date, value: reading.value };
        }),
        baseline: baseline,
        caption: "TODO(content)"
      };
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

  if (typeof saveReading === "undefined") {
    window.saveReading = function (crewId, readingObject) {
      if (getMemberIndex(crewId) < 0 || !readingObject ||
          !/^\d{4}-\d{2}-\d{2}$/.test(readingObject.date)) {
        throw new TypeError("A valid crew member and check-in date are required.");
      }

      Object.keys(indicators).forEach(function (indicator) {
        if (!Number.isFinite(readingObject[indicator])) {
          throw new TypeError("A numeric value is required for " + indicator + ".");
        }
      });

      try {
        const readings = loadSavedReadings();
        const storedReading = Object.assign(
          { crewId: crewId },
          readingObject,
          { qualityOk: true }
        );
        const existingIndex = readings.findIndex(function (reading) {
          return reading.crewId === crewId && reading.date === readingObject.date;
        });
        if (existingIndex < 0) {
          readings.push(storedReading);
        } else {
          readings[existingIndex] = storedReading;
        }
        window.localStorage.setItem("crewcare.readings", JSON.stringify(readings));
        return {
          saved: true,
          status: window.getStatus(crewId),
          qualityOk: true,
          qualityMessage: ""
        };
      } catch (error) {
        console.error("CrewCare could not save the check-in.", error);
        return {
          saved: false,
          status: window.getStatus(crewId),
          qualityOk: false,
          qualityMessage: "The reading could not be saved on this device."
        };
      }
    };
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
        id: "message-" + createdAt.getTime() + "-" + (++messageSequence),
        text: String(text),
        environment: environment,
        createdAt: createdAt.toISOString(),
        status: "pending",
        countdownEnd: new Date(createdAt.getTime() + details.delaySeconds * 1000).toISOString()
      };
      let messages;
      try {
        messages = readOutbox();
        messages.push(message);
        saveOutbox(messages);
      } catch (error) {
        console.error("CrewCare could not save the outbox.", error);
        throw error;
      }
      return Object.assign({}, message);
    };
  }

  if (typeof getOutbox === "undefined") {
    window.getOutbox = function () {
      let messages;
      try {
        messages = readOutbox();
        let changed = false;
        const now = Date.now();
        messages = messages.map(function (message) {
          const countdownEnd = Date.parse(message.countdownEnd);
          const status = message.status === "sent" || countdownEnd <= now
            ? "sent"
            : "pending";
          if (status !== message.status) {
            changed = true;
            return Object.assign({}, message, { status: status });
          }
          return message;
        });
        if (changed) {
          saveOutbox(messages);
        }
        return messages.map(function (message) {
          return Object.assign({}, message);
        });
      } catch (error) {
        console.error("CrewCare could not read the outbox.", error);
        throw error;
      }
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
      return inventory.map(function (item) {
        return Object.assign({}, item);
      });
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
