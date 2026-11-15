# Status: PROPOSED, Henry to confirm

All functions are synchronous, run offline, and make no network calls. Temporary implementations live in `stubs.js`. Real functions in the logic files take precedence when loaded before the stand-ins.

## Crew (`data.js`)

- `getCrew()` returns four records shaped as `{ id, name, role, storyLabel, simulated: true }`.
- Crew IDs are `crew-a`, `crew-b`, `crew-c`, and `crew-d`.
- Story labels are `Healthy`, `Sleep drift`, `Rising blood pressure`, and `Chest-pain emergency`.
- Names are placeholders: `Crew member A`, `Crew member B`, `Crew member C`, and `Crew member D`.
- `role` is placeholder text, for example `Crew member`.
- `getAstronaut(id)` returns one crew record or `null`.

## Readings (`data.js`)

- Indicator keys: `bloodPressureSystolic`, `bloodPressureDiastolic`, `heartRate`, `bloodSugar`, `temperature`, `sleepHours`, and `mood`.
- Units: blood pressure uses `mmHg`; heart rate uses `beats per minute`; blood sugar uses `mmol/L` (TODO: confirm with Henry); temperature uses `degrees Celsius`; sleep uses `hours`; mood uses `score out of 5`.
- `getReadings(id, indicator, days)` returns `{ date: "YYYY-MM-DD", value, unit, qualityOk }` records, oldest first, for up to 30 days of deterministic simulated data. Do not use `Math.random` at run time.
- `getBaseline(id, indicator)` returns `{ value, unit }`.
- `getLatestSummary(id)` returns `{ indicator, label, value, unit, date }` or `null`. This is the single most notable latest reading for a crew card.
- `getChartData(id, indicator)` returns `{ label, unit, points: [{ date, value }], baseline: { value, unit }, caption }` or `null`. The detail screen requests 30-day chart data for one indicator at a time. If caption copy is not available, return `TODO(content)`.

## Check-in (`data.js`, proposed)

- `saveReading(crewId, readingObject)` returns `{ saved, status, qualityOk, qualityMessage }`. `readingObject` is `{ date, bloodPressureSystolic, bloodPressureDiastolic, heartRate, bloodSugar, temperature, sleepHours, mood }`.
- `date` is `YYYY-MM-DD`. Each measurement is numeric. `status` has the same shape as `getStatus(crewId)`. `qualityOk` is a boolean. `qualityMessage` is one plain sentence, or an empty string when the reading looks fine.
- Save readings on the device in localStorage under `crewcare.readings`. Wrap storage reads and writes in `try/catch`; return `saved: false` if storage fails. The screen refreshes readings and status after a successful save, without reloading.
- Entry limits are **team-defined demo values, entry limits only, Henry to confirm**. They are not health thresholds and must not be presented as normal or alert ranges:
  - Systolic blood pressure: 60 to 260 mmHg
  - Diastolic blood pressure: 30 to 160 mmHg
  - Heart rate: 20 to 250 beats per minute
  - Blood sugar: 1.0 to 35.0 mmol/L
  - Body temperature: 30.0 to 43.0 degrees Celsius
  - Sleep: 0 to 24 hours, in steps of 0.5
  - Mood: whole numbers 1 to 5, score out of 5
- Mood option labels are provisional `TODO(content)`: `1 Very low`, `2 Low`, `3 Okay`, `4 Good`, and `5 Very good`.
- The temporary stand-in stores the submitted record with `qualityOk: true` and an empty quality message. No quality assessment or medical interpretation is implemented by the stand-in.

## Guidance (`data.js`, proposed)

- `guidance` is an object keyed by `bloodPressure`, `heartRate`, `bloodSugar`, `temperature`, `sleep`, and `mood`.
- Each indicator maps to `{ howTo, whyItMatters, goodReading, ifOff, qualityCheck }`.
- `howTo` and `ifOff` are ordered arrays of text. `whyItMatters`, `goodReading`, and `qualityCheck` are text strings.
- Missing copy remains `TODO(content)`. The temporary object in `stubs.js` is only a content-shape stand-in and contains no medical instructions.
- The temporary stand-in is installed only when no `guidance` object is defined by a logic file loaded before it.
- The user interface uses ordered lists for `howTo` and `ifOff`, and paragraphs for the other three fields.
- Routes use `#/guidance/:indicator`, where `:indicator` is one of the six keys above. The systolic and diastolic check-in links both map to `bloodPressure`; sleep maps to `sleep`. A route without an indicator displays the six-link index.
- Body-system links map heart to `heartRate`, brain and sleep to `sleep`, blood to `bloodPressure`, and mood to `mood`. Systems without a matching indicator link to the guidance index.

## Status (`trends.js`)

- `getStatus(id)` returns `{ level, levelLabel, colour, trend, word, reason }`.
- `level` is `ok`, `watch`, `warn`, or `act`.
- `levelLabel` is `Normal`, `Watch`, `Warn`, or `Act now`.
- `colour` is `green`, `amber`, or `red`. The `ok` level uses green, `watch` and `warn` use amber, and `act` uses red.
- `trend` is `rising`, `falling`, or `steady`.
- `word` combines colour and trend, for example `Amber, rising`. Status is never conveyed by colour alone.
- `reason` is one plain-English sentence for a non-doctor to read aloud. Missing copy is marked `TODO(content)`.
- `getSystemStatus(id, system)` returns the same shape. Systems: `heart`, `lungs`, `brain`, `eyes`, `muscle`, `blood`, and `mood`.
- Detail screen indicator mapping: heart uses `heartRate`; brain and sleep uses `sleepHours`; blood uses `bloodPressureSystolic` and `bloodPressureDiastolic`; mood uses `mood`. Lungs, eyes, and muscle and bone have no supplied indicator yet, so the detail screen shows their status and guidance link without inventing a reading or chart.
- Evidence panels are requested for eyes (`OSD-816`), brain and sleep (`OSD-1032`), and muscle and bone (`OSD-1040`). Stand-in titles and summaries remain `TODO(content)`.
- Story mapping: `crew-a` is `ok` and steady; `crew-b` is `watch` with falling sleep; `crew-c` is `warn` with rising blood pressure; `crew-d` is `act` with rising heart rate.
- Alert bands are labelled `team-defined demo values`.

## Environment (stubs or app state)

- `getEnvironment()` returns `ISS`, `Moon`, or `Mars`. Default is `ISS`; persist with localStorage key `crewcare.environment`, with storage access wrapped in `try/catch`.
- `setEnvironment(name)` returns `{ name, delaySeconds, delayLabel }`:
  - ISS: `0`, `Near-instant`
  - Moon: `1.3`, `About 1.3 seconds`
  - Mars: `1320`, `About 22 minutes (20 to 24)`
- Dispatch a `crewcare:environment` `CustomEvent` on `window` when the selection changes.

## Messages and triage (stubs for later screens)

- `queueMessage(text)` returns `{ id, text, environment, createdAt, status: "pending", countdownEnd }`. Capture the selected environment when queued. `countdownEnd` is `createdAt` plus that environment's one-way delay: ISS is 0 seconds, Moon is 1.3 seconds, and Mars is 1320 seconds.
- `getOutbox()` returns an array of the same records, persisted on the device in localStorage under `crewcare.outbox`. Storage reads and writes are wrapped in `try/catch` and failures are logged and surfaced.
- Once `countdownEnd` is reached, the message status changes to `sent` and is persisted. Expired pending messages are returned as sent on the next `getOutbox()` call, including after reload. The Messages screen sorts newest first and formats the countdown from `countdownEnd`, not from the current environment.
- `getTriageStep(scenario, stepNumber)` returns `{ question, answers: ["Yes", "No", "Not sure"], stepNumber, totalSteps }`.
- `answerTriageStep(scenario, stepNumber, answer)` returns the next step or an outcome object.
- `getTriageOutcome(scenario, answers)` returns `{ level, levelLabel, doNow, checkNext, prepare, tellEarth }`.
- The scenario is `chest-pain` and has five steps. Missing wording is marked `TODO(content)`.

## Inventory and evidence (stubs for later screens)

- `getInventory()` returns `{ name, quantity, expiry: "YYYY-MM-DD", lowStockLevel }` records. The temporary stand-in supplies six simulated generic records named Item A through Item F, with quantities expressed as item counts and expiry dates relative to the device date. The names, quantities and dates are placeholders marked `TODO(content)` in the Inventory screen.
- Inventory flags are text, an icon and a status colour: `Expired` for past expiry dates, `Expiring soon` for dates from today through 30 days from today, and `Low stock` when quantity is at or below `lowStockLevel`. The 30-day window is a team-defined demo value. Items with flags appear before unflagged items, with names sorted alphabetically within each group. Mars mode shows the no-resupply notice.
- `getEvidence(studyId)` returns `{ studyId, title, summary }`. Supported study IDs: `OSD-816`, `OSD-1032`, and `OSD-1040`. Missing titles and summaries are marked `TODO(content)`.

## Temporary simulated crew card readings

These are simulated stand-ins, not live crew data or medical guidance. The latest summary date is the device's current date.

| Crew ID | Latest reading |
|---|---|
| `crew-a` | Heart rate: 62 beats per minute |
| `crew-b` | Sleep: 5.8 hours |
| `crew-c` | Blood pressure: 138 over 88 mmHg |
| `crew-d` | Heart rate: 96 beats per minute |
