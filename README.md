# CrewCare

CrewCare is an offline-first health companion that helps a non-doctor Crew Medical Officer check crew health, spot problems early from each person's own baseline, and act in an emergency when Earth is 20–24 minutes away.

NASA Space Apps Challenge 2026 — "Create Health Monitoring Software for Astronauts on Space Missions". Takoradi local event.

## Backend files are Henry's — placeholders only

Henry is building the backend himself and has his own plans for it. These files are thin stubs with the agreed function names and data shapes from the Backend PRD, just enough for the frontend to demo. He will replace them with his own code — do not build on top of them as if they were final:

- `data.js` — sample simulated crew, baselines, 30 days of readings, inventory
- `trends.js` — simple baseline/drift status (green / amber / red)
- `store.js` — localStorage save/load of user readings
- `queue.js` — Mars delay message queue (pending → sent)
- `triage.js` — chest-pain step tree

## Frontend (this scaffold)

- `index.html` — single-page app: crew dashboard, clickable body dashboard, check-in (6 indicators), 30-day charts, emergency triage, just-in-time guidance, messages to Earth, radiation + sleep watch, medical inventory, Earth remote-clinic mode flip
- `style.css` — mobile-first, plain, readable. Status is always colour + word + arrow, never colour alone.
- `app.js` — navigation, rendering, environment switch
- `guidance.js` — how-to guidance for all 6 indicators + OSDR evidence panels (OSD-816, OSD-1032, OSD-1040/1023) as bundled text — evidence, not a live feed
- `vendor/chart.umd.min.js` — Chart.js v4.4.1, bundled locally. Never loaded from a CDN — a CDN breaks offline.
- `manifest.json` + `sw.js` — PWA. The service worker caches every file on first load, so the app works with Wi-Fi off.

## How to run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` on your phone or laptop (same Wi-Fi: use your laptop's address, e.g. `http://192.168.0.105:8000`). Or just open `index.html` directly — everything works except the service worker, which needs http.

## Simulated data — demo only

All crew data is simulated and labelled "Simulated data" in the app. It is NOT real astronaut data. There is no live NASA astronaut feed.

## Honest thresholds

Alert bands are team-defined demo values — not NASA medical limits. The only published threshold in this app is the SANS eye threshold: retinal thickening +20 micrometres is an early sign, +55 micrometres is concerning.

This app does not diagnose. It guides checks and next steps for a non-doctor.

## Branches

- `dev` — where the team works
- `main` — final code only, merged from `dev`

## Hosting

Demo hosted on Vercel for judging. In flight, the same app runs on the spacecraft's onboard computer — no cloud connection needed.

## How to test offline

1. Load the app once (online or on local Wi-Fi).
2. Turn Wi-Fi and mobile data off.
3. Reload — every screen, chart and triage step must still work.
4. Enter a reading, send a Mars message, run triage — all saved on the device.
5. Reset demo (More → Reset demo) clears your entries and restores the simulated data.
