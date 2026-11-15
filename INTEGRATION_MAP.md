# CrewCare integration map — frontend/ui + backend (dev)

Branch: `integration/frontend-backend` (started from `dev` at `bafeab7`, all backend passes 1–5 in it).
`dev` and `frontend/ui` are NOT touched by this work. Nothing merges to `dev` until this branch is tested.

## What each side built

**Henry's backend (`dev`)** — real logic in `data.js`, `trends.js`, `store.js`, `queue.js`, `triage.js`, `guidance.js`.
Exposes `window.CREWCARE_DATA`, `window.CrewCareTrends`, `window.CrewCareStore`, `window.CrewCareQueue`, `window.CrewCareTriage`, `window.CREWCARE_GUIDANCE`.
Crew IDs `a1`–`a4` (Maya Okafor, Elias Varga, Nia Mensah, Jonas Lindberg). Mood is 1–10. Triage is 4 steps. Statuses are green / amber / red. Storage keys `crewcare.readings.v1` and `crewcare.outbox.v1`. Mars messages use a 30-second demo delay, labelled on screen (real delay 20–24 min).

**UI guy's frontend (`frontend/ui`, head `19a8a8a`)** — rebuilt from the initial commit, not from the scaffold: `app.js` (1,788 lines), `stubs.js` (545 lines), `index.html` (59 lines), `style.css`, `sw.js`, `vendor/chart.min.js`, `icons/`, `fonts/`, `docs/`.
His `app.js` never calls Henry's `window.CrewCare*` names. It calls plain global functions defined in `docs/INTERFACE.md` (`getCrew`, `getReadings`, `saveReading`, `getStatus`, `queueMessage`, `getTriageStep`, …). Today those are filled by `stubs.js` — temporary stand-ins with placeholder crew ("Crew member A") and `TODO(content)` copy.

**The good news:** his `stubs.js` only defines a function `if (typeof fn === "undefined")`, and his `index.html` loads `data.js`, `trends.js`, `triage.js` BEFORE `stubs.js`. So real functions loaded first win, and stubs fill only the gaps. The integration point already exists — we just have to supply the real functions under his names.

## Function-by-function map

| His app calls | What it expects | Henry's backend has | Adapter job |
|---|---|---|---|
| `getCrew()` | `[{id: crew-a..d, name, role, storyLabel, simulated: true}]` | `CREWCARE_DATA.astronauts` (ids `a1`–`a4`, real fictional names) | Map ids `a1`→`crew-a` etc., return Henry's names (better than his placeholders) |
| `getAstronaut(id)` | one crew record or `null` | same data | Same id map |
| `getReadings(id, indicator, days)` | `[{date, value, unit, qualityOk}]`, oldest first, ≤30 days. Indicator keys: `bloodPressureSystolic`, `bloodPressureDiastolic`, `heartRate`, `bloodSugar`, `temperature`, `sleepHours`, `mood` (score out of **5**) | `loadReadings(id)` returns full reading objects with keys `bpSys`, `bpDia`, `heartRate`, `bloodSugar`, `temp`, `sleepHours`, `mood` (1–**10**) | Rename keys; **mood scale is a decision (see below)** |
| `getBaseline(id, indicator)` | `{value, unit}` | astronaut `baseline` + `trends.driftPct` | Rename keys, add units |
| `getLatestSummary(id)` | `{indicator, label, value, unit, date}` — the single most notable latest reading | `trends.overallStatus` + latest reading | Pick driving indicator from `overallStatus` |
| `getChartData(id, indicator)` | `{label, unit, points: [{date, value}], baseline, caption}` | `trends.trendSeries(id, indicator)` (30 points) | Wrap series in his shape; caption from `plainReason` |
| `getRadiation(id)` | `{cumulativeMsv, days}` | reading field `radiationMsvCumulative` (139 mSv on day 30) | Read latest value, days = reading count |
| `saveReading(crewId, {date, …7 indicators})` | Returns `{saved, status, qualityOk, qualityMessage}`; stores under key `crewcare.readings`; entry limits: BP 60–260 / 30–160, HR 20–250, sugar 1–35, temp 30–43, sleep 0–24, mood 1–5 | `store.saveReading({astronautId, …})`; `RANGES` BP 60–250 / 30–150, HR 30–220, sugar 1–30, temp 32–43, sleep 0–16, mood 1–10; key `crewcare.readings.v1` | Rename keys + id map; **limits and storage key are decisions (see below)** |
| `guidance` object | Keyed `bloodPressure`, `heartRate`, `bloodSugar`, `temperature`, `sleep`, `mood`; each `{howTo[], whyItMatters, goodReading, ifOff[], qualityCheck}` | `guidance.js` has the same five blocks, keyed `bpSys`, `heartRate`, `bloodSugar`, `temp`, `sleepHours`, `mood` | Rename keys (`bpSys`→`bloodPressure`, `temp`→`temperature`, `sleepHours`→`sleep`); content is already written |
| `getStatus(id)` | `{level: ok/watch/warn/act, levelLabel: Normal/Watch/Warn/Act now, colour: green/amber/red, trend: rising/falling/steady, word, reason}` | `trends.overallStatus` → green/amber/red + `plainReason` + `trendArrow` | Map green→`ok`, red→`act`; **amber covers both `watch` and `warn` — decision needed** |
| `getSystemStatus(id, system)` | Same shape; systems `heart`, `lungs`, `brain`, `eyes`, `muscle`, `blood`, `mood` | No per-system status exists | Derive: heart→`heartRate`, brain/sleep→`sleepHours`, blood→BP, mood→`mood`, eyes→SANS `sansStatus`; lungs/muscle have no indicator — show status + guidance link only, per his spec |
| `getEnvironment()` / `setEnvironment(name)` | Returns `ISS` / `Moon` / `Mars`; key `crewcare.environment`; `setEnvironment` returns `{name, delaySeconds, delayLabel}` (Mars 1320 s, real delay) + fires `crewcare:environment` event | No environment state in backend; `queue.js` `ENVIRONMENTS` has ISS/Moon/Mars with `delayMinutes` + `demoSeconds` | Small new logic in adapter; **real vs demo Mars delay is a decision** |
| `queueMessage(text)` / `getOutbox()` | Returns `{id, text, environment, createdAt, status: "pending", countdownEnd}`; `countdownEnd` = createdAt + real one-way delay (Mars 1320 s); expired pending → `sent` on next read; key `crewcare.outbox` | `queue.queueMessage` / `listMessages` / `tick`; message has `sendAt` = now + `demoSeconds` (Mars 30 s); key `crewcare.outbox.v1`; `tick()` must be called | Wrap `tick()` inside `getOutbox()`; **real vs demo delay decision**; storage key decision |
| `getTriageStep(scenario, stepNumber)` / `answerTriageStep(...)` / `getTriageOutcome(scenario, answers)` | Scenario `chest-pain`, **five** steps, answers Yes / No / Not sure; outcome `{level, levelLabel, doNow, checkNext, prepare, tellEarth}` | `CrewCareTriage.startTriage` / `answerTriage` / `getCurrent`; stateful, **four** steps; outcomes `{level: red/amber, title, doNow, checkNext, prepare, tellEarth}` | Wrap stateful triage behind his stateless calls; **4 vs 5 steps is a decision** (his 5th step is unknown — his stub has no wording for it either) |
| `getInventory()` | `{name, quantity, expiry, lowStockLevel}`; flags Expired / Expiring soon (30 days) / Low stock | `CREWCARE_DATA.inventory`: `{id, name, quantity, expiryDate, lowStockAt}` (6 real items) | Rename `expiryDate`→`expiry`, `lowStockAt`→`lowStockLevel` |
| `getEvidence(studyId)` | `{studyId, title, summary}` for `OSD-816`, `OSD-1032`, `OSD-1040` | `guidance.js` `EVIDENCE` panels for OSD-816/1032/1040/1023 | Map directly |

## Decisions Henry must make (nothing built until he picks)

1. **Mood scale — his 1–5 vs Henry's 1–10.** His UI sends mood 1–5; Henry's store/trends use 1–10 (baselines 4–8). Either rescale ×2 in the adapter, or change Henry's backend to 1–5. Rescaling is less work; changing the backend is cleaner but re-tests everything.
2. **Amber = watch or warn?** His status has 4 levels, Henry's has 3. Proposed rule: amber + drift just past the band = `watch`; amber + drift near red = `warn`. Needs his yes.
3. **Triage: 4 steps or 5?** Henry's verified tree is 4 steps. His spec says 5 but has no wording for a 5th step. Proposed: keep Henry's 4 and tell the UI guy the spec is wrong — or he supplies the 5th step.
4. **Mars delay: real 22 min or 30 s demo?** His spec uses the real 1320 s (a queued message would sit pending for 22 minutes in the demo). Henry's backend shortens it to 30 s and labels it. Proposed: keep the 30 s demo delay (the demo must finish), labelled on screen.
5. **Storage keys: his (`crewcare.readings`, `crewcare.outbox`) or Henry's (`.v1` versions)?** Proposed: keep Henry's `.v1` keys — the adapter is the only reader/writer once stubs are replaced, so his keys don't matter. But anything he already saved under his keys won't carry over.
6. **Entry limits:** his ranges are wider than Henry's (e.g. HR up to 250 vs 220, sleep up to 24 h vs 16 h). Proposed: keep Henry's stricter limits — they are the ones tested.

## Build order (on this branch only)

1. New file `adapter.js`, loaded in `index.html` after `data.js`/`trends.js`/`store.js`/`queue.js`/`triage.js`/`guidance.js` and before `stubs.js`. It defines every function in the table above as a thin wrapper over Henry's backend. It does not change any backend file.
2. His `index.html` needs `<script>` tags added for `store.js`, `queue.js`, `guidance.js` (today it only loads `data.js`, `trends.js`, `triage.js`).
3. Copy his UI files (`app.js`, `style.css`, `sw.js`, `manifest.json`, `icons.js`, `icons/`, `fonts/`, `vendor/chart.min.js`) into this branch, replacing the scaffold versions. His `docs/` come too.
4. Run repo tests (`node --test tests/*.test.js`), then the Pass 6 browser test against this branch (dashboard, check-in, triage, Mars message, offline reload) and fix what fails.
5. Only then open a PR from this branch to `dev` for Henry's review.

## What NOT to do

- Do not merge `frontend/ui` straight into `dev` — both branches changed `index.html`, `app.js`, `style.css`, `sw.js` from different starting points; a direct merge would conflict everywhere and could wipe the backend wiring.
- Do not edit `frontend/ui` or `dev` while integrating — all integration work lives on this branch.
- Do not change Henry's backend files to fit the UI — the adapter absorbs the differences.
