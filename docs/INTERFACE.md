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

## Status (`trends.js`)

- `getStatus(id)` returns `{ level, levelLabel, colour, trend, word, reason }`.
- `level` is `ok`, `watch`, `warn`, or `act`.
- `levelLabel` is `Normal`, `Watch`, `Warn`, or `Act now`.
- `colour` is `green`, `amber`, or `red`. The `ok` level uses green, `watch` and `warn` use amber, and `act` uses red.
- `trend` is `rising`, `falling`, or `steady`.
- `word` combines colour and trend, for example `Amber, rising`. Status is never conveyed by colour alone.
- `reason` is one plain-English sentence for a non-doctor to read aloud. Missing copy is marked `TODO(content)`.
- `getSystemStatus(id, system)` returns the same shape. Systems: `heart`, `lungs`, `brain`, `eyes`, `muscle`, `blood`, and `mood`.
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

- `queueMessage(text)` returns `{ id, text, environment, createdAt, status: "pending", countdownEnd }`.
- `getOutbox()` returns an array of the same records.
- `getTriageStep(scenario, stepNumber)` returns `{ question, answers: ["Yes", "No", "Not sure"], stepNumber, totalSteps }`.
- `answerTriageStep(scenario, stepNumber, answer)` returns the next step or an outcome object.
- `getTriageOutcome(scenario, answers)` returns `{ level, levelLabel, doNow, checkNext, prepare, tellEarth }`.
- The scenario is `chest-pain` and has five steps. Missing wording is marked `TODO(content)`.

## Inventory and evidence (stubs for later screens)

- `getInventory()` returns `{ name, quantity, expiry: "YYYY-MM-DD", lowStockLevel }` records. No inventory records have been supplied.
- `getEvidence(studyId)` returns `{ studyId, title, summary }`. Supported study IDs: `OSD-816`, `OSD-1032`, and `OSD-1040`. Missing titles and summaries are marked `TODO(content)`.

## Temporary simulated crew card readings

These are simulated stand-ins, not live crew data or medical guidance. Each latest summary date is `2026-11-14`.

| Crew ID | Latest reading |
|---|---|
| `crew-a` | Heart rate: 62 beats per minute |
| `crew-b` | Sleep: 5.8 hours |
| `crew-c` | Blood pressure: 138 over 88 mmHg |
| `crew-d` | Heart rate: 96 beats per minute |
