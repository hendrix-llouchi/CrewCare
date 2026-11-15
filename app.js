const HOME_HEADLINE = "Health checks for crews with no doctor on board.";

(function () {
  const app = document.getElementById("app");
  const offlineNote = document.getElementById("offline-note");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const environmentNames = ["ISS", "Moon", "Mars"];
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
  const chartInstances = [];
  let activeSystem = "heart";
  let activeCrewId = null;

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
      return { heading: "Guidance", section: "more" };
    }

    if (/^#\/guidance(?:\?.*)?$/.test(hash)) {
      return { heading: "Guidance", section: "more" };
    }

    return routes[hash] || null;
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
    panel.lastElementChild.href = "#/guidance?system=" + encodeURIComponent(system);
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
    screen.append(header, bodyFigure);
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
    link.href = "#/guidance/" + encodeURIComponent(indicator);
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
    const route = resolveRoute(window.location.hash);
    if (!route) {
      window.location.hash = "#/crew";
      return;
    }

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
    if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
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
  window.addEventListener("crewcare:environment", function () {
    if (window.location.hash === "#/crew") {
      updateEnvironmentDisplay(setEnvironment(getEnvironment()));
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
