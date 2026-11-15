const HOME_HEADLINE = "Health checks for crews with no doctor on board.";

(function () {
  const app = document.getElementById("app");
  const offlineNote = document.getElementById("offline-note");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const environmentNames = ["ISS", "Moon", "Mars"];
  const environmentDelays = {
    ISS: "Near-instant",
    Moon: "About 1.3 seconds",
    Mars: "About 22 minutes (20 to 24)"
  };
  const inventoryExpiryWindowDays = 30;
  // Entry limits: team-defined demo values, entry limits only, Henry to confirm.
  const checkinIndicators = [
    { key: "bloodPressureSystolic", label: "Systolic blood pressure", unit: "mmHg", min: 60, max: 260, minLabel: "60", maxLabel: "260", step: 1 },
    { key: "bloodPressureDiastolic", label: "Diastolic blood pressure", unit: "mmHg", min: 30, max: 160, minLabel: "30", maxLabel: "160", step: 1 },
    { key: "heartRate", label: "Heart rate", unit: "beats per minute", min: 20, max: 250, minLabel: "20", maxLabel: "250", step: 1 },
    { key: "bloodSugar", label: "Blood sugar", unit: "mmol/L", min: 1, max: 35, minLabel: "1.0", maxLabel: "35.0", step: 0.1 },
    { key: "temperature", label: "Body temperature", unit: "degrees Celsius", min: 30, max: 43, minLabel: "30.0", maxLabel: "43.0", step: 0.1 },
    { key: "sleepHours", label: "Sleep", unit: "hours", min: 0, max: 24, minLabel: "0", maxLabel: "24", step: 0.5 }
  ];
  // TODO(content): Replace the provisional mood labels when approved.
  const moodOptions = [
    { value: 1, label: "Very low" },
    { value: 2, label: "Low" },
    { value: 3, label: "Okay" },
    { value: 4, label: "Good" },
    { value: 5, label: "Very good" }
  ];
  const checkinState = {
    crewId: "crew-a",
    values: {},
    lastSave: null
  };
  const checkinConfig = {
    mood: { label: "Mood", unit: "score out of 5", min: 1, max: 5, step: 1 }
  };
  const triageScenario = "chest-pain";
  const triageState = {
    stepNumber: 1,
    totalSteps: null,
    answers: [],
    outcome: null,
    queuedMessage: null
  };
  const systemDetails = {
    heart: { label: "Heart", indicators: ["heartRate"] },
    lungs: { label: "Lungs", indicators: [] },
    brain: { label: "Brain and sleep", indicators: ["sleepHours"], evidence: "OSD-1032" },
    eyes: { label: "Eyes", indicators: [], evidence: "OSD-816" },
    muscle: { label: "Muscle and bone", indicators: [], evidence: "OSD-1040" },
    blood: {
      label: "Blood",
      indicators: ["bloodPressureSystolic", "bloodPressureDiastolic"]
    },
    mood: { label: "Mood", indicators: ["mood"] }
  };
  const guidanceIndicators = [
    { key: "bloodPressure", label: "Blood pressure" },
    { key: "heartRate", label: "Heart rate" },
    { key: "bloodSugar", label: "Blood sugar" },
    { key: "temperature", label: "Temperature" },
    { key: "sleep", label: "Sleep" },
    { key: "mood", label: "Mood" }
  ];
  const systemGuidance = {
    heart: "heartRate",
    brain: "sleep",
    blood: "bloodPressure",
    mood: "mood"
  };
  const chartInstances = [];
  let activeSystem = "heart";
  let activeCrewId = null;
  let currentRouteHash = null;
  let previousRouteHash = "#/crew";
  let messagesTimer = null;

  const routes = {
    "#/crew": { heading: "Crew", section: "crew" },
    "#/checkin": { heading: "Check-in", section: "checkin" },
    "#/emergency": { heading: "Emergency", section: "emergency" },
    "#/more": { heading: "More", section: "more" },
    "#/guidance": { heading: "Guidance", section: "more" },
    "#/messages": { heading: "Messages", section: "more" },
    "#/inventory": { heading: "Inventory", section: "more" }
  };

  function renderIcons() {
    document.querySelectorAll("[data-icon]").forEach(function (container) {
      const iconName = container.dataset.icon;
      if (Object.prototype.hasOwnProperty.call(window.CrewCareIcons, iconName)) {
        container.innerHTML = window.CrewCareIcons[iconName];
      }
    });
  }

  function resolveRoute(hash) {
    const crewMatch = hash.match(/^#\/crew\/([^/?]+)$/);
    if (crewMatch) {
      return { heading: "Crew member", section: "crew", crewId: crewMatch[1] };
    }

    const guidanceMatch = hash.match(/^#\/guidance\/([^/?]+)$/);
    if (guidanceMatch) {
      return {
        heading: "Guidance",
        section: "more",
        guidanceIndicator: normalizeGuidanceIndicator(guidanceMatch[1])
      };
    }

    if (/^#\/guidance(?:\?.*)?$/.test(hash)) {
      return { heading: "Guidance", section: "more" };
    }

    return routes[hash] || null;
  }

  function normalizeGuidanceIndicator(indicator) {
    const aliases = {
      bloodPressureSystolic: "bloodPressure",
      bloodPressureDiastolic: "bloodPressure",
      sleepHours: "sleep"
    };
    const normalized = aliases[indicator] || indicator;
    return guidanceIndicators.some(function (item) {
      return item.key === normalized;
    }) ? normalized : null;
  }

  function guidanceHref(indicator) {
    const normalized = normalizeGuidanceIndicator(indicator);
    return normalized
      ? "#/guidance/" + encodeURIComponent(normalized)
      : "#/guidance";
  }

  function createElement(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function createStatusBadge(status) {
    const badge = createElement(
      "span",
      "status-badge status-badge--" + status.colour
    );
    const arrows = {
      rising: "arrow-up",
      falling: "arrow-down",
      steady: "arrow-flat"
    };
    const iconName = arrows[status.trend];
    const icon = createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = window.CrewCareIcons[iconName];
    badge.append(icon, createElement("span", "", status.word));
    return badge;
  }

  function createCrewCard(member) {
    const card = createElement("a", "card crew-card");
    card.href = "#/crew/" + encodeURIComponent(member.id);

    const title = createElement("h2", "crew-card__name", member.name);
    const role = createElement("p", "crew-card__role", member.role);
    const story = createElement("p", "crew-card__story", member.storyLabel);
    const status = createStatusBadge(getStatus(member.id));
    const summary = getLatestSummary(member.id);
    const reading = summary
      ? summary.label + ": " + summary.value + " " + summary.unit
      : "No latest reading yet.";

    card.append(
      title,
      role,
      story,
      status,
      createElement("p", "crew-card__reading reading", reading)
    );
    return { card: card, hasReading: summary !== null };
  }

  function updateEnvironmentDisplay(details) {
    const control = app.querySelector(".environment-switch");
    if (!control) {
      return;
    }

    control.querySelectorAll("[data-environment]").forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.environment === details.name)
      );
    });
    control.querySelector("[data-environment-delay]").textContent =
      "One-way delay: " + details.delayLabel;
  }

  function renderEnvironmentSwitch(container) {
    const section = createElement("section", "environment-switch");
    const title = createElement("h2", "environment-switch__title", "Environment");
    const group = createElement("div", "environment-switch__options");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Mission environment");

    environmentNames.forEach(function (name) {
      const button = createElement("button", "environment-switch__button", name);
      button.type = "button";
      button.dataset.environment = name;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () {
        updateEnvironmentDisplay(setEnvironment(name));
      });
      group.append(button);
    });

    const delay = createElement("p", "environment-switch__delay");
    delay.dataset.environmentDelay = "";
    section.append(title, group, delay);
    container.append(section);
  }

  function renderCrewScreen() {
    destroyCharts();
    activeCrewId = null;
    const screen = createElement("section", "home-screen");
    const heading = createElement("h1", "page-header__title", "Crew");
    heading.tabIndex = -1;

    const header = createElement("header", "home-screen__header");
    header.append(
      heading,
      createElement("p", "home-screen__headline", HOME_HEADLINE),
      createElement("p", "simulated-label", "Simulated data"),
      createElement("p", "simulated-label__note", "Alert bands: team-defined demo values.")
    );

    const crew = getCrew();
    const cards = crew.map(createCrewCard);
    const crewGrid = createElement("div", "crew-grid");
    cards.forEach(function (result) {
      crewGrid.append(result.card);
    });

    screen.append(header);
    renderEnvironmentSwitch(screen);

    if (!cards.some(function (result) { return result.hasReading; })) {
      const emptyState = createElement("section", "empty-state crew-empty-state");
      emptyState.setAttribute("aria-labelledby", "crew-empty-title");
      const emptyTitle = createElement("h2", "", "No readings yet");
      emptyTitle.id = "crew-empty-title";
      const checkIn = createElement("button", "button button--primary", "Do today's check-in");
      checkIn.type = "button";
      checkIn.addEventListener("click", function () {
        window.location.hash = "#/checkin";
      });
      emptyState.append(emptyTitle, checkIn);
      screen.append(emptyState);
    }

    screen.append(crewGrid);
    app.replaceChildren(screen);
    updateEnvironmentDisplay(setEnvironment(getEnvironment()));
    heading.focus();
  }

  function createSvgElement(tagName, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(function (entry) {
      element.setAttribute(entry[0], entry[1]);
    });
    return element;
  }

  function destroyCharts() {
    chartInstances.forEach(function (chart) {
      chart.destroy();
    });
    chartInstances.length = 0;
  }

  function bodyRegionCoordinates() {
    return [
      { system: "brain", x: 8, y: 12 },
      { system: "eyes", x: 212, y: 12 },
      { system: "heart", x: 8, y: 104 },
      { system: "lungs", x: 212, y: 104 },
      { system: "muscle", x: 8, y: 196 },
      { system: "blood", x: 212, y: 196 },
      { system: "mood", x: 110, y: 288 }
    ];
  }

  function createBodyFigure(memberId) {
    const figure = createSvgElement("svg", {
      class: "body-figure",
      viewBox: "0 0 360 366",
      role: "group",
      "aria-label": "Body systems and their current status"
    });
    figure.append(
      createSvgElement("circle", { class: "body-figure__body", cx: "180", cy: "64", r: "25" }),
      createSvgElement("path", {
        class: "body-figure__body",
        d: "M157 95 Q180 85 203 95 L216 205 L207 222 L203 286 L191 286 L180 224 L169 286 L157 286 L153 222 L144 205 Z"
      }),
      createSvgElement("path", {
        class: "body-figure__body",
        d: "M153 104 L137 113 L119 196 L130 200 L153 148 M207 104 L223 113 L241 196 L230 200 L207 148"
      })
    );

    bodyRegionCoordinates().forEach(function (region) {
      const status = getSystemStatus(memberId, region.system);
      const details = systemDetails[region.system];
      const link = createSvgElement("a", {
        href: "#system-" + region.system,
        class: "body-figure__region body-figure__region--" + status.colour,
        "data-system": region.system,
        "aria-label": details.label + ", " + status.word
      });
      const tile = createSvgElement("rect", {
        x: String(region.x),
        y: String(region.y),
        width: "140",
        height: "64",
        rx: "4"
      });
      const name = createSvgElement("text", {
        x: String(region.x + 8),
        y: String(region.y + 25),
        class: "body-figure__label"
      });
      name.textContent = details.label;
      const statusText = createSvgElement("text", {
        x: String(region.x + 8),
        y: String(region.y + 48),
        class: "body-figure__status"
      });
      statusText.textContent = status.word;
      link.append(tile, name, statusText);
      link.addEventListener("click", function (event) {
        event.preventDefault();
        openSystemPanel(memberId, region.system);
      });
      figure.append(link);
    });

    return figure;
  }

  function formatFullDate(date) {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "long",
      timeZone: "UTC"
    }).format(new Date(date + "T00:00:00Z"));
  }

  function createChartTable(chartData) {
    const hiddenTable = createElement("div", "visually-hidden");
    const table = createElement("table", "trend-chart__table");
    const caption = createElement("caption", "", chartData.label + " over the last 30 days");
    const head = createElement("thead");
    const headerRow = createElement("tr");
    headerRow.append(
      createElement("th", "", "Date"),
      createElement("th", "", "Reading, " + chartData.unit)
    );
    head.append(headerRow);
    const body = createElement("tbody");

    chartData.points.forEach(function (point) {
      const row = createElement("tr");
      row.append(
        createElement("td", "", formatFullDate(point.date)),
        createElement("td", "", point.value + " " + chartData.unit)
      );
      body.append(row);
    });

    const baselineRow = createElement("tr");
    baselineRow.append(
      createElement("th", "", "Baseline"),
      createElement("td", "", chartData.baseline.value + " " + chartData.baseline.unit)
    );
    body.append(baselineRow);
    table.append(caption, head, body);
    hiddenTable.append(table);
    return hiddenTable;
  }

  function chartColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      line: style.getPropertyValue("--accent").trim(),
      text: style.getPropertyValue("--text-muted").trim(),
      grid: style.getPropertyValue("--border").trim()
    };
  }

  function createTrendChart(chartData, systemLabel) {
    const figure = createElement("figure", "trend-chart");
    const caption = createElement(
      "figcaption",
      "trend-chart__caption",
      chartData.caption || "TODO(content)"
    );
    const canvasWrap = createElement("div", "trend-chart__canvas-wrap");
    const canvas = createElement("canvas", "trend-chart__canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", systemLabel + ", " + chartData.label + " over 30 days");
    canvasWrap.append(canvas);
    figure.append(caption, canvasWrap, createChartTable(chartData));

    const colors = chartColors();
    const labels = chartData.points.map(function (point) {
      return point.date;
    });
    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: chartData.label,
            data: chartData.points.map(function (point) { return point.value; }),
            borderColor: colors.line,
            backgroundColor: colors.line,
            pointBackgroundColor: colors.line,
            pointRadius: 2,
            borderWidth: 2,
            tension: 0.2
          },
          {
            label: "Baseline, " + chartData.baseline.value + " " + chartData.baseline.unit,
            data: labels.map(function () { return chartData.baseline.value; }),
            borderColor: colors.text,
            pointRadius: 0,
            borderWidth: 2,
            borderDash: [6, 4]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: colors.text,
        plugins: {
          legend: { labels: { color: colors.text } },
          tooltip: {
            callbacks: {
              title: function (items) {
                return items.length ? formatFullDate(items[0].label) : "";
              },
              label: function (item) {
                if (item.datasetIndex === 1) {
                  return item.dataset.label;
                }
                return item.dataset.label + ": " + item.formattedValue + " " + chartData.unit;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: "Date", color: colors.text },
            ticks: {
              color: colors.text,
              autoSkip: true,
              maxRotation: 0,
              callback: function (value, index) {
                return formatFullDate(labels[index]);
              }
            },
            grid: { color: colors.grid }
          },
          y: {
            title: { display: true, text: "Reading, " + chartData.unit, color: colors.text },
            ticks: { color: colors.text },
            grid: { color: colors.grid }
          }
        }
      }
    });
    chartInstances.push(chart);
    return figure;
  }

  function appendEvidence(panel, system) {
    const studyId = systemDetails[system].evidence;
    if (!studyId) {
      return;
    }

    const evidence = getEvidence(studyId);
    const section = createElement("section", "evidence-panel");
    section.append(
      createElement("h3", "", evidence.title),
      createElement("p", "evidence-panel__id", evidence.studyId),
      createElement("p", "", evidence.summary)
    );
    panel.append(section);
  }

  function appendSystemReadings(panel, memberId, system) {
    const indicators = systemDetails[system].indicators;
    let hasReading = false;

    indicators.forEach(function (indicator) {
      const chartData = getChartData(memberId, indicator);
      if (!chartData || !chartData.points.length) {
        return;
      }

      hasReading = true;
      const latest = chartData.points[chartData.points.length - 1];
      const reading = createElement("p", "system-panel__reading reading");
      reading.textContent = chartData.label + ": " + latest.value + " " + chartData.unit +
        ", " + formatFullDate(latest.date);
      panel.append(reading, createTrendChart(chartData, systemDetails[system].label));
    });

    if (!hasReading) {
      panel.append(createElement("p", "system-panel__empty", "No reading available for this system."));
    }
  }

  function openSystemPanel(memberId, system) {
    destroyCharts();
    activeSystem = system;
    const member = getAstronaut(memberId);
    const panel = createElement("section", "card system-panel");
    panel.id = "system-" + system;
    panel.setAttribute("aria-labelledby", "system-panel-title");

    const heading = createElement("h2", "", systemDetails[system].label);
    heading.id = "system-panel-title";
    heading.tabIndex = -1;
    const status = getSystemStatus(memberId, system);
    const statusRow = createElement("div", "system-panel__status");
    statusRow.append(createStatusBadge(status), createElement("p", "", "Trend: " + status.trend));

    panel.append(heading, statusRow);
    appendSystemReadings(panel, memberId, system);
    panel.append(
      createElement("p", "system-panel__reason", status.reason),
      createElement("a", "button button--secondary", "Open guidance")
    );
    panel.lastElementChild.href = guidanceHref(systemGuidance[system]);
    appendEvidence(panel, system);

    const previousPanel = app.querySelector(".system-panel");
    if (previousPanel) {
      previousPanel.replaceWith(panel);
    } else {
      app.querySelector(".crew-detail").append(panel);
    }
    chartInstances.forEach(function (chart) {
      chart.resize();
    });

    app.querySelectorAll(".body-figure__region").forEach(function (regionLink) {
      regionLink.setAttribute("aria-current", String(regionLink.dataset.system === system));
    });
    heading.focus();
  }

  function createRadiationSleepSection(memberId) {
    const section = createElement("section", "card radiation-sleep");
    const title = createElement("h2", "", "Radiation and sleep");
    const simulated = createElement("p", "simulated-label", "Simulated data");
    const radiationSection = createElement("section", "radiation-sleep__block");
    const radiationHeading = createElement("h3", "", "Radiation");
    const radiation = getRadiation(memberId);
    const radiationReading = createElement("p", "reading");
    radiationReading.textContent = Number(radiation.cumulativeMsv).toFixed(1) +
      " mSv (millisieverts) over " + radiation.days + " days";
    radiationSection.append(
      radiationHeading,
      radiationReading,
      createElement(
        "p",
        "radiation-sleep__context",
        "ISS average is about 1 mSv per day. Context only, not a safety limit."
      )
    );

    const sleepSection = createElement("section", "radiation-sleep__block");
    const sleepHeading = createElement("h3", "", "Sleep");
    const readings = getReadings(memberId, "sleepHours", 30);
    const latest = Array.isArray(readings) && readings.length
      ? readings[readings.length - 1]
      : null;
    sleepSection.append(sleepHeading);
    if (latest) {
      const hours = Number(latest.value);
      const scheduledHours = 8.5;
      const difference = Math.round(Math.abs(hours - scheduledHours) * 10) / 10;
      const comparison = hours < scheduledHours
        ? difference.toFixed(1) + " hours below schedule"
        : hours > scheduledHours
          ? difference.toFixed(1) + " hours above schedule"
          : "matching the scheduled hours";
      sleepSection.append(
        createElement(
          "p",
          "reading",
          hours.toFixed(1) + " hours slept, " + comparison
        ),
        createElement("p", "radiation-sleep__scheduled", "8.5 hours scheduled")
      );
      const progress = createElement("progress", "sleep-bar");
      progress.max = scheduledHours;
      progress.value = Math.max(0, Math.min(hours, scheduledHours));
      progress.setAttribute("aria-label", "Sleep compared with scheduled hours");
      sleepSection.append(progress);
    } else {
      sleepSection.append(
        createElement("p", "radiation-sleep__empty", "No sleep reading available.")
      );
    }
    sleepSection.append(
      createElement(
        "p",
        "radiation-sleep__context",
        "ISS crews average about 6.1 hours of sleep against 8.5 scheduled."
      )
    );
    section.append(title, simulated, radiationSection, sleepSection);

    // TODO: Add a readiness view after its data contract is defined.
    return section;
  }

  function renderCrewDetail(memberId) {
    const member = getAstronaut(memberId);
    if (!member) {
      destroyCharts();
      activeCrewId = null;
      const missing = createElement("section", "page-header");
      const heading = createElement("h1", "page-header__title", "Crew member not found");
      heading.tabIndex = -1;
      missing.append(heading, createElement("a", "button button--secondary", "Return to Crew"));
      missing.lastElementChild.href = "#/crew";
      app.replaceChildren(missing);
      heading.focus();
      return;
    }

    if (activeCrewId !== memberId) {
      activeSystem = "heart";
      destroyCharts();
    }
    activeCrewId = memberId;

    destroyCharts();
    const screen = createElement("section", "crew-detail");
    const header = createElement("header", "crew-detail__header");
    const heading = createElement("h1", "page-header__title", member.name);
    heading.tabIndex = -1;
    const overallStatus = getStatus(memberId);
    header.append(
      heading,
      createElement("p", "crew-detail__role", member.role),
      createElement("p", "simulated-label", "Simulated data"),
      createStatusBadge(overallStatus),
      createElement("p", "crew-detail__reason", overallStatus.reason)
    );

    const bodyFigure = createBodyFigure(memberId);
    screen.append(header, bodyFigure, createRadiationSleepSection(memberId));
    app.replaceChildren(screen);
    openSystemPanel(memberId, activeSystem);
    heading.focus();
  }

  function checkinValue(indicator) {
    return checkinState.values[indicator] === undefined
      ? ""
      : String(checkinState.values[indicator]);
  }

  function addGuidanceLink(container, indicator) {
    const link = createElement("a", "checkin-field__guidance", "How to take this");
    link.href = guidanceHref(indicator);
    container.append(link);
  }

  function createCheckinError(id) {
    const error = createElement("p", "form-error");
    error.id = id;
    error.setAttribute("aria-live", "polite");
    return error;
  }

  function createNumericCheckinField(indicator) {
    const field = createElement("div", "form-field checkin-field");
    const inputId = "checkin-" + indicator.key;
    const errorId = inputId + "-error";
    const label = createElement("label", "", indicator.label);
    label.htmlFor = inputId;

    const input = createElement("input");
    input.type = "number";
    input.id = inputId;
    input.name = indicator.key;
    input.min = String(indicator.min);
    input.max = String(indicator.max);
    input.step = String(indicator.step);
    input.inputMode = "decimal";
    input.required = true;
    input.value = checkinValue(indicator.key);
    input.dataset.checkinIndicator = indicator.key;
    input.setAttribute("aria-describedby", errorId);

    const unit = createElement("span", "checkin-field__unit", "Unit: " + indicator.unit);
    const bounds = createElement(
      "span",
      "checkin-field__bounds",
      "Entry limits: " + indicator.minLabel + " to " + indicator.maxLabel + " " + indicator.unit + "."
    );
    const error = createCheckinError(errorId);
    field.append(label, input, unit, bounds, error);
    addGuidanceLink(field, indicator.key);
    return field;
  }

  function createMoodCheckinField() {
    const field = createElement("fieldset", "form-field checkin-field checkin-mood");
    const legend = createElement("legend", "", "Mood");
    const unit = createElement("span", "checkin-field__unit", "Unit: score out of 5");
    const bounds = createElement(
      "span",
      "checkin-field__bounds",
      "Entry limits: 1 to 5 score out of 5."
    );
    const choices = createElement("div", "checkin-mood__options");
    const error = createCheckinError("checkin-mood-error");
    field.setAttribute("aria-describedby", error.id);

    moodOptions.forEach(function (option) {
      const label = createElement("label", "checkin-mood__option");
      const input = createElement("input");
      input.type = "radio";
      input.name = "mood";
      input.value = String(option.value);
      input.required = true;
      input.checked = checkinValue("mood") === input.value;
      input.dataset.checkinIndicator = "mood";
      label.append(input, createElement("span", "", option.value + " " + option.label));
      choices.append(label);
    });

    field.append(legend, unit, bounds, choices, error);
    addGuidanceLink(field, "mood");
    return field;
  }

  function getCheckinError(indicator, rawValue) {
    const config = indicator.key === "mood" ? checkinConfig.mood : indicator;
    const value = Number(rawValue);
    if (rawValue === "" || !Number.isFinite(value) ||
        value < config.min || value > config.max) {
      return "Enter a number between " + (config.minLabel || config.min) + " and " +
        (config.maxLabel || config.max) +
        " " + config.unit + ".";
    }

    const stepCount = (value - config.min) / config.step;
    if (Math.abs(stepCount - Math.round(stepCount)) > 0.000001) {
      return config.key === "sleepHours"
        ? "Enter sleep in 0.5-hour steps."
        : "Enter a value using the listed step size.";
    }
    return "";
  }

  function validateCheckin(form) {
    let firstInvalid = null;
    const indicators = checkinIndicators.concat([{
      key: "mood",
      label: checkinConfig.mood.label,
      unit: checkinConfig.mood.unit,
      min: checkinConfig.mood.min,
      max: checkinConfig.mood.max,
      step: checkinConfig.mood.step
    }]);

    indicators.forEach(function (indicator) {
      const input = indicator.key === "mood"
        ? form.querySelector('input[name="mood"]:checked')
        : form.elements.namedItem(indicator.key);
      const value = input ? input.value : "";
      const errorText = getCheckinError(indicator, value);
      const error = form.querySelector("#checkin-" + indicator.key + "-error");
      error.textContent = errorText;

      const field = indicator.key === "mood" ? form.querySelector(".checkin-mood") : input;
      if (errorText) {
        field.setAttribute("aria-invalid", "true");
        firstInvalid = firstInvalid || (indicator.key === "mood"
          ? form.querySelector('input[name="mood"]')
          : field);
      } else {
        field.removeAttribute("aria-invalid");
      }

      if (!errorText) {
        checkinState.values[indicator.key] = Number(value);
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function updateCheckinError(form, indicatorKey) {
    const indicator = checkinIndicators.find(function (item) {
      return item.key === indicatorKey;
    }) || {
      key: "mood",
      unit: checkinConfig.mood.unit,
      min: checkinConfig.mood.min,
      max: checkinConfig.mood.max,
      step: checkinConfig.mood.step
    };
    const input = indicatorKey === "mood"
      ? form.querySelector('input[name="mood"]:checked')
      : form.elements.namedItem(indicatorKey);
    const field = indicatorKey === "mood"
      ? form.querySelector(".checkin-mood")
      : input;
    const error = form.querySelector("#checkin-" + indicatorKey + "-error");
    const errorText = input ? getCheckinError(indicator, input.value) : "";

    if (input) {
      checkinState.values[indicatorKey] = input.value === "" ? "" : Number(input.value);
    }
    error.textContent = errorText;
    if (errorText) {
      field.setAttribute("aria-invalid", "true");
    } else {
      field.removeAttribute("aria-invalid");
    }
  }

  function appendGuidanceList(container, items) {
    const list = createElement("ol", "guidance-list");
    const entries = Array.isArray(items) ? items : ["TODO(content)"];
    entries.forEach(function (item) {
      list.append(createElement("li", "", item || "TODO(content)"));
    });
    container.append(list);
  }

  function appendGuidanceParagraph(container, text) {
    container.append(createElement("p", "", text || "TODO(content)"));
  }

  function createGuidanceBlock(title) {
    const block = createElement("section", "card guidance-block");
    block.append(createElement("h2", "", title));
    return block;
  }

  function renderGuidanceIndex(message) {
    const screen = createElement("section", "guidance-screen");
    const back = createElement("a", "guidance-back", "Back");
    back.href = previousRouteHash;
    const heading = createElement("h1", "page-header__title", "Guidance");
    heading.tabIndex = -1;
    const list = createElement("ul", "guidance-index");
    guidanceIndicators.forEach(function (indicator) {
      const item = createElement("li", "guidance-index__item");
      const link = createElement("a", "", indicator.label);
      link.href = guidanceHref(indicator.key);
      item.append(link);
      list.append(item);
    });
    screen.append(back, heading);
    if (message) {
      screen.append(createElement("p", "guidance-error", message));
    }
    screen.append(list);
    app.replaceChildren(screen);
    heading.focus();
  }

  function renderGuidancePage(indicatorKey) {
    const indicator = guidanceIndicators.find(function (item) {
      return item.key === indicatorKey;
    });
    if (!indicator) {
      renderGuidanceIndex("This guidance page is unavailable.");
      return;
    }

    const guidanceContent = typeof guidance === "undefined"
      ? window.guidance
      : guidance;
    if (!guidanceContent || !guidanceContent[indicator.key]) {
      renderGuidanceIndex("Guidance content is unavailable.");
      return;
    }

    const content = guidanceContent[indicator.key];
    const screen = createElement("article", "guidance-screen");
    const back = createElement("a", "guidance-back", "Back");
    back.href = previousRouteHash;
    const heading = createElement("h1", "page-header__title", indicator.label);
    heading.tabIndex = -1;

    const howTo = createGuidanceBlock("How to take it");
    appendGuidanceList(howTo, content.howTo);
    const why = createGuidanceBlock("Why it matters");
    appendGuidanceParagraph(why, content.whyItMatters);
    const goodReading = createGuidanceBlock("A good reading looks like");
    appendGuidanceParagraph(goodReading, content.goodReading);
    const ifOff = createGuidanceBlock("If it is off");
    appendGuidanceList(ifOff, content.ifOff);
    const quality = createGuidanceBlock("Quality check");
    appendGuidanceParagraph(quality, content.qualityCheck);

    screen.append(back, heading, howTo, why, goodReading, ifOff, quality);
    app.replaceChildren(screen);
    heading.focus();
  }

  function renderGuidanceScreen(indicatorKey) {
    destroyCharts();
    if (!indicatorKey) {
      renderGuidanceIndex(null);
      return;
    }
    renderGuidancePage(indicatorKey);
  }

  function formatCreatedTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "TODO(content)";
    }
    return new Intl.DateTimeFormat("en", {
      dateStyle: "full",
      timeStyle: "long"
    }).format(date);
  }

  function createOutboxStatusBadge(status) {
    const isSent = status === "sent";
    const badge = createElement(
      "span",
      "status-badge status-badge--" + (isSent ? "green" : "amber")
    );
    const icon = createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = window.CrewCareIcons[isSent ? "check" : "clock"];
    badge.append(icon, createElement("span", "", isSent ? "Sent" : "Pending"));
    return badge;
  }

  function formatCountdown(countdownEnd, now) {
    const seconds = Math.max(0, Math.ceil((Date.parse(countdownEnd) - now) / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes + " min " + remainingSeconds + " s remaining";
  }

  function renderOutboxMessages(list, statusNode) {
    let messages;
    try {
      messages = getOutbox();
      if (!Array.isArray(messages)) {
        throw new TypeError("The outbox did not return a message list.");
      }
    } catch (error) {
      console.error("CrewCare could not load messages.", error);
      statusNode.textContent = "Messages could not be loaded from this device.";
      list.replaceChildren();
      return;
    }

    messages = messages.slice().sort(function (first, second) {
      return Date.parse(second.createdAt) - Date.parse(first.createdAt);
    });
    statusNode.textContent = "";
    if (!messages.length) {
      list.replaceChildren(createElement("p", "messages-empty", "No messages yet."));
      return;
    }

    const now = Date.now();
    const cards = messages.map(function (message) {
      const card = createElement("article", "card message-card");
      const text = createElement("p", "message-card__text", message.text);
      const metadata = createElement("dl", "message-card__metadata");
      const environmentTerm = createElement("dt", "", "Environment");
      const environmentValue = createElement("dd", "", message.environment);
      const createdTerm = createElement("dt", "", "Created");
      const createdValue = createElement("dd", "", formatCreatedTime(message.createdAt));
      metadata.append(environmentTerm, environmentValue, createdTerm, createdValue);
      const messageStatus = message.status === "sent" ||
        Date.parse(message.countdownEnd) <= now
        ? "sent"
        : "pending";
      const status = createOutboxStatusBadge(messageStatus);
      card.append(text, metadata, status);
      if (messageStatus === "pending") {
        const countdown = createElement(
          "p",
          "message-card__countdown",
          formatCountdown(message.countdownEnd, now)
        );
        countdown.dataset.countdownEnd = message.countdownEnd;
        countdown.setAttribute("aria-live", "off");
        card.append(countdown);
      }
      return card;
    });
    list.replaceChildren.apply(list, cards);
  }

  function updateMessagesEnvironment(details) {
    const environment = details && details.name
      ? details.name
      : getEnvironment();
    const delay = details && details.delayLabel
      ? details.delayLabel
      : environmentDelays[environment];
    const display = app.querySelector("[data-current-environment]");
    if (display) {
      display.textContent =
        "Current environment: " + environment + ". One-way delay: " + delay + ".";
    }
  }

  function clearMessagesTimer() {
    if (messagesTimer !== null) {
      window.clearInterval(messagesTimer);
      messagesTimer = null;
    }
  }

  function renderMessagesScreen() {
    destroyCharts();
    const screen = createElement("section", "messages-screen");
    const heading = createElement("h1", "page-header__title", "Messages");
    heading.tabIndex = -1;
    const environment = createElement("p", "messages-environment");
    environment.dataset.currentEnvironment = "";
    const explanation = createElement(
      "p",
      "messages-explanation",
      "Messages are stored on this device and sent when the link allows. The crew does not wait for Earth to act."
    );
    const status = createElement("p", "messages-error");
    status.setAttribute("role", "alert");
    const list = createElement("div", "messages-list");
    list.setAttribute("aria-label", "Outbox messages");
    screen.append(heading, environment, explanation, status, list);
    app.replaceChildren(screen);
    updateMessagesEnvironment();
    renderOutboxMessages(list, status);
    heading.focus();

    if (list.querySelector("[data-countdown-end]")) {
      messagesTimer = window.setInterval(function () {
        if (window.location.hash !== "#/messages") {
          clearMessagesTimer();
          return;
        }
        renderOutboxMessages(list, status);
        if (!list.querySelector("[data-countdown-end]")) {
          clearMessagesTimer();
        }
      }, 1000);
    }
  }

  function inventoryDateAtUtcMidnight(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const date = new Date(value + "T00:00:00Z");
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
      ? null
      : date;
  }

  function inventoryFlags(item, today) {
    const flags = [];
    const expiry = inventoryDateAtUtcMidnight(item.expiry);
    if (expiry) {
      const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
      if (daysUntilExpiry < 0) {
        flags.push({ label: "Expired", colour: "red", icon: "warning" });
      } else if (daysUntilExpiry <= inventoryExpiryWindowDays) {
        flags.push({ label: "Expiring soon", colour: "amber", icon: "clock" });
      }
    }
    if (Number.isFinite(Number(item.quantity)) &&
        Number.isFinite(Number(item.lowStockLevel)) &&
        Number(item.quantity) <= Number(item.lowStockLevel)) {
      flags.push({ label: "Low stock", colour: "amber", icon: "warning" });
    }
    return flags;
  }

  function createInventoryFlag(flag) {
    const badge = createElement(
      "span",
      "inventory-flag inventory-flag--" + flag.colour
    );
    const icon = createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = window.CrewCareIcons[flag.icon];
    badge.append(icon, createElement("span", "", flag.label));
    return badge;
  }

  function formatInventoryExpiry(value) {
    const date = inventoryDateAtUtcMidnight(value);
    if (!date) {
      return "TODO(content)";
    }
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function inventoryItemCard(item, flags) {
    const card = createElement("article", "card inventory-card");
    const heading = createElement("h2", "", item.name || "TODO(content)");
    const details = createElement("dl", "inventory-card__details");
    [
      ["Quantity", String(item.quantity) + (Number(item.quantity) === 1 ? " item" : " items")],
      ["Expiry", formatInventoryExpiry(item.expiry)]
    ].forEach(function (entry) {
      details.append(
        createElement("dt", "", entry[0]),
        createElement("dd", "", entry[1])
      );
    });
    const flagList = createElement("ul", "inventory-card__flags");
    if (flags.length) {
      flags.forEach(function (flag) {
        const row = createElement("li");
        row.append(createInventoryFlag(flag));
        flagList.append(row);
      });
    } else {
      flagList.append(createElement("li", "inventory-card__clear", "No flags"));
    }
    card.append(heading, details, flagList);
    return card;
  }

  function renderInventoryList(container, searchText, statusNode) {
    let items;
    try {
      items = getInventory();
      if (!Array.isArray(items)) {
        throw new TypeError("The inventory did not return an item list.");
      }
    } catch (error) {
      console.error("CrewCare could not load inventory.", error);
      statusNode.textContent = "Inventory could not be loaded from this device.";
      container.replaceChildren();
      return;
    }

    const todayDate = new Date();
    const today = new Date(Date.UTC(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      todayDate.getDate()
    ));
    const records = items.map(function (item) {
      return { item: item, flags: inventoryFlags(item, today) };
    }).filter(function (record) {
      return String(record.item.name || "")
        .toLocaleLowerCase()
        .includes(searchText.trim().toLocaleLowerCase());
    }).sort(function (first, second) {
      const firstFlagged = first.flags.length > 0;
      const secondFlagged = second.flags.length > 0;
      if (firstFlagged !== secondFlagged) {
        return firstFlagged ? -1 : 1;
      }
      return String(first.item.name || "")
        .localeCompare(String(second.item.name || ""), "en");
    });

    statusNode.textContent = "";
    if (!records.length) {
      container.replaceChildren(createElement("p", "inventory-empty", "No items match."));
      return;
    }
    container.replaceChildren.apply(container, records.map(function (record) {
      return inventoryItemCard(record.item, record.flags);
    }));
  }

  function updateInventoryEnvironment() {
    const notice = app.querySelector("[data-mars-inventory-notice]");
    if (notice) {
      notice.hidden = getEnvironment() !== "Mars";
    }
  }

  function renderInventoryScreen() {
    destroyCharts();
    const screen = createElement("section", "inventory-screen");
    const heading = createElement("h1", "page-header__title", "Inventory");
    heading.tabIndex = -1;
    const notice = createElement(
      "p",
      "inventory-mars-notice",
      "No resupply on this mission. Plan how you use stock."
    );
    notice.dataset.marsInventoryNotice = "";
    notice.setAttribute("role", "note");
    const note = createElement(
      "p",
      "inventory-note",
      "Simulated inventory. TODO(content): Replace the placeholder items, quantities, and expiry dates."
    );
    const searchField = createElement("div", "form-field inventory-search");
    const label = createElement("label", "", "Search inventory by name");
    label.htmlFor = "inventory-search";
    const input = createElement("input");
    input.id = "inventory-search";
    input.type = "search";
    input.autocomplete = "off";
    input.setAttribute("aria-controls", "inventory-items");
    const footnote = createElement(
      "p",
      "inventory-footnote",
      "Expiring soon rule: within 30 days, a team-defined demo value."
    );
    const error = createElement("p", "inventory-error");
    error.setAttribute("role", "alert");
    const list = createElement("div", "inventory-list");
    list.id = "inventory-items";
    list.setAttribute("aria-live", "polite");
    searchField.append(label, input);
    screen.append(heading, notice, note, searchField, footnote, error, list);
    app.replaceChildren(screen);
    updateInventoryEnvironment();
    renderInventoryList(list, "", error);
    input.addEventListener("input", function () {
      renderInventoryList(list, input.value, error);
    });
    heading.focus();
  }

  function appendCheckinResults(saveResult) {
    const section = createElement("section", "card checkin-results");
    section.setAttribute("aria-labelledby", "checkin-results-title");
    const title = createElement("h2", "", "Reading saved");
    title.id = "checkin-results-title";
    title.setAttribute("role", "status");
    title.setAttribute("aria-live", "polite");
    section.append(
      title,
      createElement("p", "", "Saved on this device for " + formatFullDate(saveResult.date) + "."),
      createStatusBadge(getStatus(saveResult.crewId))
    );

    const quality = saveResult.qualityMessage ||
      (saveResult.qualityOk ? "No quality message." : "TODO(content)");
    section.append(createElement("p", "checkin-results__quality", "Quality check: " + quality));
    app.append(section);

    checkinIndicators.concat([{
      key: "mood",
      label: checkinConfig.mood.label,
      unit: checkinConfig.mood.unit
    }]).forEach(function (indicator) {
      const readings = getReadings(saveResult.crewId, indicator.key, 30);
      const chartData = getChartData(saveResult.crewId, indicator.key);
      const latest = readings.length ? readings[readings.length - 1] : null;
      if (latest) {
        const latestReading = createElement("p", "reading checkin-results__reading");
        latestReading.textContent = indicator.label + ": " + latest.value + " " +
          latest.unit + ", " + formatFullDate(latest.date);
        section.append(latestReading);
      }
      if (chartData && chartData.points.length) {
        section.append(createTrendChart(chartData, "Check-in"));
      }
    });

    chartInstances.forEach(function (chart) {
      chart.resize();
    });
  }

  function submitCheckin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveError = form.querySelector(".checkin-form__error");
    saveError.textContent = "";
    if (!validateCheckin(form)) {
      return;
    }

    const now = new Date();
    const readingObject = {
      date: [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
      ].join("-"),
      bloodPressureSystolic: Number(checkinState.values.bloodPressureSystolic),
      bloodPressureDiastolic: Number(checkinState.values.bloodPressureDiastolic),
      heartRate: Number(checkinState.values.heartRate),
      bloodSugar: Number(checkinState.values.bloodSugar),
      temperature: Number(checkinState.values.temperature),
      sleepHours: Number(checkinState.values.sleepHours),
      mood: Number(checkinState.values.mood)
    };
    let result;
    try {
      result = saveReading(checkinState.crewId, readingObject);
    } catch (error) {
      console.error("CrewCare could not save the check-in.", error);
      saveError.textContent = "The reading could not be saved on this device.";
      return;
    }
    if (!result || !result.saved) {
      saveError.textContent = result && result.qualityMessage
        ? result.qualityMessage
        : "The reading could not be saved on this device.";
      return;
    }

    checkinState.lastSave = {
      crewId: checkinState.crewId,
      date: readingObject.date,
      qualityOk: result.qualityOk,
      qualityMessage: result.qualityMessage
    };
    destroyCharts();
    const previousResults = app.querySelector(".checkin-results");
    if (previousResults) {
      previousResults.remove();
    }
    appendCheckinResults(checkinState.lastSave);
  }

  function renderCheckinScreen() {
    destroyCharts();
    const screen = createElement("section", "checkin-screen");
    const heading = createElement("h1", "page-header__title", "Today's check-in");
    heading.tabIndex = -1;
    const form = createElement("form", "card checkin-form");
    form.noValidate = true;
    form.setAttribute("aria-label", "Daily health check-in");

    const crewField = createElement("div", "form-field checkin-field");
    const crewLabel = createElement("label", "", "Crew member");
    crewLabel.htmlFor = "checkin-crew";
    const crewSelect = createElement("select");
    crewSelect.id = "checkin-crew";
    crewSelect.name = "crewId";
    getCrew().forEach(function (member) {
      const option = createElement("option", "", member.name);
      option.value = member.id;
      option.selected = member.id === checkinState.crewId;
      crewSelect.append(option);
    });
    crewSelect.addEventListener("change", function () {
      checkinState.crewId = crewSelect.value;
    });
    crewField.append(crewLabel, crewSelect);

    const boundsNote = createElement(
      "p",
      "checkin-entry-note",
      "Entry limits: team-defined demo values, entry limits only, Henry to confirm."
    );
    const fields = createElement("div", "checkin-fields");
    fields.append(
      createNumericCheckinField(checkinIndicators[0]),
      createNumericCheckinField(checkinIndicators[1]),
      createNumericCheckinField(checkinIndicators[2]),
      createNumericCheckinField(checkinIndicators[3]),
      createNumericCheckinField(checkinIndicators[4]),
      createNumericCheckinField(checkinIndicators[5]),
      createMoodCheckinField()
    );
    const submit = createElement("button", "button button--primary", "Save check-in");
    submit.type = "submit";
    const saveError = createElement("p", "form-error checkin-form__error");
    saveError.setAttribute("role", "alert");
    form.append(crewField, boundsNote, fields, saveError, submit);
    form.addEventListener("input", function (event) {
      const indicator = event.target.dataset.checkinIndicator;
      if (indicator && (indicator !== "mood" || event.target.checked)) {
        updateCheckinError(form, indicator);
      }
    });
    form.addEventListener("change", function (event) {
      const indicator = event.target.dataset.checkinIndicator;
      if (indicator === "mood") {
        updateCheckinError(form, indicator);
      }
    });
    form.addEventListener("submit", submitCheckin);
    screen.append(heading, form);
    app.replaceChildren(screen);
    if (checkinState.lastSave) {
      appendCheckinResults(checkinState.lastSave);
    }
    heading.focus();
  }

  function triageErrorMessage(error) {
    console.error("CrewCare could not continue the triage flow.", error);
    const alert = app.querySelector(".emergency-error");
    if (alert) {
      alert.textContent = "This step could not be loaded. Use Back to try again.";
    }
  }

  function renderTriageStep(step) {
    if (!step || !Number.isInteger(step.stepNumber) ||
        !Number.isInteger(step.totalSteps) || !Array.isArray(step.answers)) {
      throw new TypeError("The triage step returned an unsupported shape.");
    }

    triageState.stepNumber = step.stepNumber;
    triageState.totalSteps = step.totalSteps;
    triageState.outcome = null;
    const screen = createElement("section", "emergency-screen");
    screen.setAttribute("aria-labelledby", "emergency-question");
    const back = createElement("button", "button button--secondary emergency-back", "Back");
    back.type = "button";
    back.addEventListener("click", function () {
      if (triageState.stepNumber > 1) {
        triageState.stepNumber -= 1;
        try {
          renderTriageStep(getTriageStep(triageScenario, triageState.stepNumber));
        } catch (error) {
          triageErrorMessage(error);
        }
      } else {
        window.location.hash = "#/crew";
      }
    });

    const heading = createElement("h1", "page-header__title", "Emergency");
    heading.tabIndex = -1;
    const counter = createElement(
      "p",
      "emergency-step-counter",
      "Step " + step.stepNumber + " of " + step.totalSteps
    );
    const question = createElement(
      "h2",
      "emergency-question emergency-action",
      step.question || "TODO(content)"
    );
    question.id = "emergency-question";
    const choices = createElement("div", "emergency-answers");
    choices.setAttribute("aria-label", "Answer the triage question");
    step.answers.forEach(function (answer) {
      const button = createElement("button", "button button--secondary emergency-answer", answer);
      button.type = "button";
      button.addEventListener("click", function () {
        let response;
        try {
          response = answerTriageStep(
            triageScenario,
            step.stepNumber,
            answer
          );
        } catch (error) {
          triageErrorMessage(error);
          return;
        }

        triageState.answers[step.stepNumber - 1] = answer;
        triageState.answers.length = step.stepNumber;
        if (response && Number.isInteger(response.stepNumber)) {
          try {
            renderTriageStep(getTriageStep(triageScenario, response.stepNumber));
          } catch (error) {
            triageErrorMessage(error);
          }
          return;
        }

        try {
          renderTriageOutcome(getTriageOutcome(
            triageScenario,
            triageState.answers.slice()
          ));
        } catch (error) {
          triageErrorMessage(error);
        }
      });
      choices.append(button);
    });

    const error = createElement("p", "emergency-error");
    error.setAttribute("role", "alert");
    screen.append(back, heading, counter, question, choices, error);
    app.replaceChildren(screen);
    heading.focus();
  }

  function triageOutcomeColour(outcome) {
    const level = String(outcome.level || "").toLowerCase();
    const label = String(outcome.levelLabel || "").toLowerCase();
    if (label === "act now" || level === "act" || level === "red") {
      return "red";
    }
    if (label === "keep monitoring" || level === "watch" || level === "warn" ||
        level === "amber") {
      return "amber";
    }
    if (label === "handle on board" || level === "handle on board" ||
        level === "handle-on-board" || level === "ok" || level === "green") {
      return "green";
    }
    return null;
  }

  function renderTriageOutcome(outcome) {
    if (!outcome) {
      throw new TypeError("The triage outcome is missing.");
    }

    triageState.outcome = outcome;
    const screen = createElement("section", "emergency-screen emergency-outcome");
    screen.setAttribute("aria-labelledby", "emergency-outcome-title");
    const back = createElement("button", "button button--secondary emergency-back", "Back");
    back.type = "button";
    back.addEventListener("click", function () {
      const previousStep = triageState.totalSteps || triageState.stepNumber;
      try {
        renderTriageStep(getTriageStep(triageScenario, previousStep));
      } catch (error) {
        triageErrorMessage(error);
      }
    });
    const heading = createElement("h1", "page-header__title", "Emergency outcome");
    heading.id = "emergency-outcome-title";
    heading.tabIndex = -1;
    const outcomeColour = triageOutcomeColour(outcome);
    const outcomeLabel = outcome.levelLabel || "TODO(content)";
    const outcomeStatus = outcomeColour
      ? createStatusBadge({
        colour: outcomeColour,
        trend: "steady",
        word: outcomeLabel
      })
      : createElement("p", "emergency-outcome__label", outcomeLabel);
    const sections = [
      ["Do now", outcome.doNow],
      ["Check next", outcome.checkNext],
      ["Prepare", outcome.prepare],
      ["Tell Earth", outcome.tellEarth]
    ];
    const content = createElement("div", "emergency-outcome__sections");
    sections.forEach(function (entry) {
      const section = createElement("section", "emergency-outcome__section");
      section.append(
        createElement("h2", "", entry[0]),
        createElement("p", "", entry[1] || "TODO(content)")
      );
      content.append(section);
    });

    const sendButton = createElement("button", "button button--primary emergency-send", "Send to outbox");
    sendButton.type = "button";
    const sendStatus = createElement("p", "emergency-send__status");
    sendStatus.setAttribute("role", "status");
    sendStatus.setAttribute("aria-live", "polite");
    if (triageState.queuedMessage) {
      sendButton.disabled = true;
      sendStatus.textContent = "Pending in outbox.";
    } else {
      sendButton.addEventListener("click", function () {
        try {
          triageState.queuedMessage = queueMessage(String(outcome.tellEarth || "TODO(content)"));
        } catch (error) {
          console.error("CrewCare could not add the message to the outbox.", error);
          sendStatus.textContent = "The message could not be added to the outbox.";
          return;
        }
        sendButton.disabled = true;
        sendStatus.textContent =
          "Pending in outbox: " + triageState.queuedMessage.status + ".";
      });
    }

    screen.append(back, heading, outcomeStatus, content, sendButton, sendStatus);
    app.replaceChildren(screen);
    heading.focus();
  }

  function renderEmergencyScreen() {
    destroyCharts();
    if (triageState.outcome) {
      renderTriageOutcome(triageState.outcome);
      return;
    }

    try {
      renderTriageStep(getTriageStep(triageScenario, triageState.stepNumber));
    } catch (error) {
      const screen = createElement("section", "emergency-screen");
      const heading = createElement("h1", "page-header__title", "Emergency");
      heading.tabIndex = -1;
      const errorText = createElement(
        "p",
        "emergency-error",
        "This step could not be loaded. Try again."
      );
      errorText.setAttribute("role", "alert");
      const retry = createElement("button", "button button--secondary", "Retry");
      retry.type = "button";
      retry.addEventListener("click", renderEmergencyScreen);
      screen.append(heading, errorText, retry);
      app.replaceChildren(screen);
      console.error("CrewCare could not load the triage step.", error);
      heading.focus();
    }
  }

  function updateChartTheme() {
    const colors = chartColors();
    chartInstances.forEach(function (chart) {
      chart.options.color = colors.text;
      chart.options.plugins.legend.labels.color = colors.text;
      chart.options.scales.x.title.color = colors.text;
      chart.options.scales.x.ticks.color = colors.text;
      chart.options.scales.x.grid.color = colors.grid;
      chart.options.scales.y.title.color = colors.text;
      chart.options.scales.y.ticks.color = colors.text;
      chart.options.scales.y.grid.color = colors.grid;
      chart.data.datasets[0].borderColor = colors.line;
      chart.data.datasets[0].backgroundColor = colors.line;
      chart.data.datasets[0].pointBackgroundColor = colors.line;
      chart.data.datasets[1].borderColor = colors.text;
      chart.update();
    });
  }

  function renderRoute() {
    const routeHash = window.location.hash;
    clearMessagesTimer();
    if (currentRouteHash && !currentRouteHash.startsWith("#/guidance")) {
      previousRouteHash = currentRouteHash;
    }
    currentRouteHash = routeHash;
    const route = resolveRoute(routeHash);
    if (!route) {
      window.location.hash = "#/crew";
      return;
    }

    const emergencyMode = route.section === "emergency";
    document.body.classList.toggle("emergency-mode", emergencyMode);
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      const isCurrent = link.dataset.nav === route.section;
      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (window.location.hash === "#/crew") {
      renderCrewScreen();
      return;
    }

    if (route.section === "checkin") {
      renderCheckinScreen();
      return;
    }

    if (route.heading === "Guidance") {
      renderGuidanceScreen(route.guidanceIndicator);
      return;
    }

    if (routeHash === "#/messages") {
      renderMessagesScreen();
      return;
    }

    if (routeHash === "#/inventory") {
      renderInventoryScreen();
      return;
    }

    if (emergencyMode) {
      renderEmergencyScreen();
      return;
    }

    if (route.crewId) {
      renderCrewDetail(route.crewId);
      return;
    }

    destroyCharts();
    const page = createElement("section", "page-header");
    const heading = createElement("h1", "page-header__title", route.heading);
    heading.tabIndex = -1;
    page.append(heading);
    app.replaceChildren(page);
    heading.focus();
  }

  function updateOfflineNote() {
    offlineNote.hidden = navigator.onLine;
  }

  function updateThemeColor() {
    themeColor.setAttribute(
      "content",
      getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()
    );
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("./sw.js").catch(function (error) {
        console.error("CrewCare could not enable offline support.", error);
      });
    }
  }

  renderIcons();
  updateOfflineNote();
  updateThemeColor();

  if (!window.location.hash) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + "#/crew"
    );
  }

  renderRoute();
  window.addEventListener("hashchange", renderRoute);
  window.addEventListener("crewcare:environment", function (event) {
    if (window.location.hash === "#/crew") {
      updateEnvironmentDisplay(setEnvironment(getEnvironment()));
    }
    if (window.location.hash === "#/messages") {
      updateMessagesEnvironment(event.detail);
    }
    if (window.location.hash === "#/inventory") {
      updateInventoryEnvironment();
    }
  });
  window.addEventListener("online", updateOfflineNote);
  window.addEventListener("offline", updateOfflineNote);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    updateThemeColor();
    updateChartTheme();
  });
  registerServiceWorker();
})();
