const HOME_HEADLINE = "Health checks for crews with no doctor on board.";

(function () {
  const app = document.getElementById("app");
  const offlineNote = document.getElementById("offline-note");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const environmentNames = ["ISS", "Moon", "Mars"];

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
    if (/^#\/crew\/[^/]+$/.test(hash)) {
      return { heading: "Crew member", section: "crew" };
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
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateThemeColor);
  registerServiceWorker();
})();
