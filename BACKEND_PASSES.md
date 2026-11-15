# CrewCare Backend — passes plan (Henry's branch)

Owner: Henry — backend, coded with GPT, one pass at a time.
Rule: work only on branch `henry-backend`. Nothing goes to `dev` without a PR Henry reviews first. Nothing goes to `main` until `dev` is finished and tested.

## Workflow
1. One pass = one GPT prompt, one file (or one small group), then STOP.
2. Henry tests that pass on his phone before the next pass.
3. Each pass is pushed to `henry-backend` and reviewed in the PR to `dev`.
4. Keep the same function names the frontend (`app.js`) already uses, so the frontend does not break.
5. Frontend is NOT in this branch — the other guy does that, on his own branch.

## Passes
- Pass 1 — `data.js`: real simulated crew (4 astronauts, baselines, 30 days of readings, inventory). Labelled SIMULATED.
- Pass 2 — `trends.js`: baseline/drift logic (3-day average, 10-day direction), green/amber/red. Only published threshold is SANS +20/+55 µm; all other bands are team-defined demo values.
- Pass 3 — `store.js`: save/load user readings in localStorage, reject out-of-range values, never save partial readings.
- Pass 4 — `queue.js`: Mars delay queue (ISS near-instant, Moon ~1.3s, Mars 22 min real / 30s demo, labelled on screen), store-and-forward, pending -> sent.
- Pass 5 — `triage.js`: chest-pain step tree (responsive -> breathing -> pulse -> chest pain), red/amber outcomes, Do now / Check next / Prepare / Tell Earth. Never gives a diagnosis.
- Pass 6 — Test: load once, Wi-Fi off reload, check-in, chart, triage, Mars message. Fix what fails, then ask Henry to review the PR.

## Files in this branch
Backend (Henry): `data.js`, `trends.js`, `store.js`, `queue.js`, `triage.js`
Frontend (not here): `index.html`, `style.css`, `app.js`
Shared: `guidance.js`, `manifest.json`, `sw.js`, `vendor/chart.umd.min.js`
