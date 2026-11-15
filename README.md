# CrewCare

CrewCare is an offline-first health companion for astronauts on long missions. It was built by **Team Lunar** (George, Spencer, Eli, Henry Cobbinah, Priscilla, Adwoa) for the **Create Health Monitoring Software for Astronauts on Space Missions** challenge at **NASA Space Apps Challenge 2026, Takoradi**.

Live demo: https://crewcare-seven.vercel.app/

## The problem

On the International Space Station, help from Earth is minutes away and evacuation is possible. On a Mars mission, a message takes about 22 minutes each way, with no evacuation and no resupply. The crew must be able to check their own health and know the next step without waiting for Earth.

## What it does

- **Crew dashboard** — four astronauts, each with a green (fine), amber (watch) or red (act now) badge and a rising / falling / steady arrow.
- **Personal baselines, not population averages** — every reading is judged against that astronaut's own pre-flight baseline (last 3 days vs baseline, plus 10-day direction). Blood pressure, heart rate, blood sugar, temperature, sleep and mood are charted over 30 days, with radiation exposure and eye change tracked alongside.
- **Check-in** — new readings are entered by hand, with guidance on how to take each measurement and why it matters.
- **Guided emergency triage** — four questions (responsive? breathing? pulse? chest pain?) leading to a red or amber outcome with Do now / Check next / Prepare / Tell Earth steps. It never names a disease and never gives a drug or dose.
- **Messages with the real delay** — messages to Earth use store-and-forward: saved as pending on the device, then sent after the communication delay for the mission environment (ISS near-instant, Moon about 1.3 seconds, Mars about 22 minutes). In the demo the Mars delay is shortened to 30 seconds and labelled as a demo delay on screen.
- **Medical inventory** — what is available, with low-stock and expiry warnings; on Mars the app shows a "No resupply on this mission" notice.
- **Environment switch** — ISS / Moon / Mars. It changes only the delay label and the delay on newly queued messages, and the Mars inventory notice. It does not change any health data.

## Offline first

There is no server and no cloud database. The app is a static site:

- A service worker (`sw.js`) saves every file of the app on the device on the first visit, then serves the app from that saved copy when there is no connection.
- Readings, the message outbox and the environment setting live in the browser's own storage on the device (`localStorage`) and never leave it.
- First load needs internet (that is how the files arrive). After that, Wi-Fi off + reload still loads the whole app — verified by test.

In flight, the same app would run on the spacecraft's onboard computer, opened from the crew's tablets over the ship's local Wi-Fi. The public link above exists only so judges can load it.

## Data — what is real and what is not

- **Simulated crew data.** The four astronauts and their 30 days of readings are simulated demo data created by the team. They are labelled "Simulated demo data" in the app. They are not NASA data and not real astronaut data.
- **NASA data is the evidence behind the design.** The check-in fields follow the NASA Human Research Program Standard Measures; the design draws on the HRP 5 Hazards of Human Spaceflight and Risks pages, and on NASA Open Science Data Repository study OSD-816 (spaceflight-associated neuro-ocular syndrome, eyes). Radiation context (ISS average about 1 mSv/day) comes from the Canadian Space Agency.
- **Alert bands are team-defined demo values — except one.** The only published threshold used is the SANS retinal-thickening threshold from NASA Medical Technical Brief OCHMO-MTB-001 (Feb 2024): greater than about 20 µm is the earliest sign, 55 µm is concerning. Every other green / amber / red band is a team-defined demo value, labelled as such in the app.

## Tech stack

- HTML + CSS + vanilla JavaScript. No framework, no build step, no server.
- Charts are hand-built inline SVG. No chart library is loaded.
- Fonts: IBM Plex Sans and IBM Plex Mono, bundled locally (SIL Open Font License 1.1).
- Storage: `localStorage`. Offline: service worker + web app manifest (installable).
- Backend logic (`data.js`, `trends.js`, `store.js`, `queue.js`, `triage.js`, `guidance.js`) runs in the browser on the device; the frontend calls it through `adapter.js`. There is no API and no network call at runtime.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Do not double-click `index.html` — the service worker (offline mode) only works over HTTP.

## Tests

```bash
node --test tests/*.test.js
```

25 tests, all passing. They cover the backend logic (data, trends, storage, message queue, triage) and run on every push via GitHub Actions (`.github/workflows/backend-tests.yml`).

## Project structure

| File | What it is |
| --- | --- |
| `index.html` | App shell and navigation |
| `app.js` | Screens, rendering, charts (SVG) |
| `style.css` | Blue-and-white theme (accent `#0B5ED7`) |
| `data.js` | Simulated crew, readings, inventory |
| `trends.js` | Baseline / drift / status engine |
| `store.js` | Reading storage (localStorage) |
| `queue.js` | Mars-delay message queue |
| `triage.js` | 4-step emergency triage tree |
| `guidance.js` | How-to guidance + OSDR evidence panels |
| `adapter.js` | Maps the UI's function calls onto the backend |
| `sw.js`, `manifest.json` | Offline support (PWA) |
| `privacy.html`, `terms.html` | Privacy and terms pages |
| `tests/` | Backend tests (Node) |
| `docs/` | Interface, PRD and proposal notes |

## Submission

The project demo submitted to NASA Space Apps is a 7-slide deck (the slide-deck option in the submission rules). The app link above is the final project link. Team Lunar, six members, Takoradi local event.

## License

MIT. See `LICENSE`.
