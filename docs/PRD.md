# CrewCare: Frontend and Backend PRD

NASA Space Apps Challenge 2026.
Source: team PRD, Parts A and B. The content and demo team guide (Parts C to E) is not included here.

One line: CrewCare is an offline-first health companion that helps a non-doctor crewmate check health, spot problems early from each person's own baseline, and act in an emergency when Earth is 20 to 24 minutes away.

If anything in `.github/copilot-instructions.md` is stricter than this file on look and feel, the instructions file wins.

## Agreed decisions (do not re-open without the team)

- Stack: HTML, CSS and vanilla JavaScript. No React, no build step.
- Charts: Chart.js, downloaded into the project. Never loaded from a CDN.
- Data: on the device, in localStorage / IndexedDB. No cloud database, no login.
- Offline: Progressive Web App (PWA) with a service worker.
- Code: GitHub. Public demo link: Vercel. In-person demo: laptop on local Wi-Fi or hotspot, with a QR code.
- In space, the same app runs on the spacecraft computer. Vercel is only the delivery route for judging.
- Simulated crew data must always be labelled "simulated".

## 1. The product, the user and the problem

### The problem
On the International Space Station (ISS), health checks are periodic, devices are separate, and flight surgeons on Earth do the interpreting. That works near Earth. On a Mars transit it breaks: a message takes 20 to 24 minutes one way, there is no evacuation and no resupply, and the person giving care is usually not a doctor.

### The user
- Primary user: the Crew Medical Officer (CMO). A crewmate with basic medical training (roughly 40 to 80 hours), who may not have used the kit for months. The app must assume low confidence, high stress, and gloves or shaky hands in an emergency.
- Secondary user: any crewmate doing their own daily check-in.

### Design principles
1. Personal baseline, not Earth normal. Compare each astronaut to their own pre-flight baseline and show drift over time.
2. Local first, always. Every screen works with no internet. Nothing waits for Earth.
3. Guide, do not diagnose. The app gives steps, flags and next actions. It never claims a diagnosis.
4. Plain language. No medical word appears without a short explanation.
5. Honest data. Crew data is simulated and labelled simulated. Only published thresholds are presented as real.

### In scope (build)
- 7 modules listed in section 3
- 4 simulated astronauts, 30 days of readings
- ISS / Moon / Mars environment switch
- Earth remote-clinic flip in the demo
- Offline PWA, phone-first layout

### Out of scope (do not build)
- A new wearable or sensor
- An ECG interpreter or "AI doctor"
- A cloud dashboard that needs internet
- Accounts, logins or live astronaut data
- Earth thresholds presented as NASA rules

### Success in judging terms
A judge opens the link on a phone, understands the story in under 30 seconds, watches a drift become an emergency, sees the Mars delay handled locally, and sees the app still working after Wi-Fi is turned off.

# Part A: Frontend

## 2. Structure and navigation

### App map

| Screen | Purpose | Key elements |
|---|---|---|
| Home / Crew | See the whole crew at a glance | 4 crew cards, status, trend arrow, environment switch |
| Body dashboard | Open one astronaut by body system | Clickable body figure: heart, lungs, brain / sleep, eyes, muscle / bone, blood, mood |
| Astronaut detail | See drift from personal baseline | 30-day charts, baseline line, latest readings, evidence panel |
| Daily check-in | Enter today's 6 indicators | Form, guidance link per field, quality check, save locally |
| Emergency triage | Act step by step in an emergency | Large buttons, one question per screen, red / amber / green outcome |
| Guidance | Learn how to take a reading | How, why, good reading, if it is off, retake check |
| Messages to Earth | See the delay queue honestly | Outbox, pending / sent status, countdown by environment |
| Inventory | Know what medicine and supplies remain | Item, quantity, expiry, low / expiring flags |

### Navigation rules
- Bottom navigation on phones: Crew, Check-in, Emergency, More (guidance, messages, inventory).
- Emergency is always visible and reachable in one tap from every screen.
- Back always returns to the previous screen without losing entered data.
- Every screen works at 360px wide first, then scales up to laptop.
- No screen requires a network request to render.

### Global states the frontend must handle

| State | What the user sees |
|---|---|
| First load | App installs / caches, simulated crew loads, "Simulated data" label visible |
| Offline | Small "Offline: saving on this device" note; all features still work |
| No readings yet | Friendly empty state with a "Do today's check-in" action |
| Alert | Status changes on crew card, astronaut detail and home, consistently everywhere |

## 3. The seven modules: frontend specification

| Module | Frontend requirements |
|---|---|
| 1. Body dashboard | Clickable body figure on the astronaut detail screen. Tapping a part opens that system with its latest reading, status and trend. Status shown with colour and text (never colour alone). |
| 2. Check-in and trend engine | Form for the 6 indicators: blood pressure, heart rate, blood sugar, body temperature, sleep hours, mood. On save, show the new status and an updated chart immediately. Charts show 30 days, the personal baseline as a line, and a clear watch / warn / act label. |
| 3. Emergency triage | Starts with the chest-pain scenario. One step per screen: responsiveness, breathing, pulse, chest-pain questions. Large tap targets, short sentences, a visible step counter (Step 2 of 5), and an outcome screen: what to do now, what to check next, what to prepare, what to tell Earth. |
| 4. Just-in-time guidance | Linked from every check-in field and every body system. Five blocks per measurement: how to take it, why it matters, what a good reading looks like, what to do if it is off, and a quality check (for example, "Was the cuff on right? Retake it."). |
| 5. Offline record and Mars delay | Environment switch: ISS, Moon, Mars. Switching changes the delay shown and the message countdown. Messages go to an outbox list with pending status and a live countdown. The app never blocks on sending. |
| 6. Radiation and sleep watch | Cumulative radiation in millisieverts (mSv), with the ISS average of about 1 mSv per day labelled as context only, not a limit. Sleep: hours slept against 8.5 hours scheduled, plus a readiness view from sleep, mood and resting heart-rate drift. |
| 7. Medical inventory | Searchable list with quantity and expiry date. Flags: expiring soon, low stock. No resupply warning shown in Mars mode. |

Alert wording rule: all flag bands in Modules 2 and 6 are labelled in the app as "team-defined demo values", except the eye (SANS) threshold in Part B, which is published.

## 4. Design, files and frontend acceptance

### Files

| File | Job |
|---|---|
| index.html | All screens and structure |
| style.css | Mobile-first layout, status colours, emergency sizing |
| app.js | Navigation, rendering, environment switch |
| data.js | Simulated crew, baselines, 30 days of readings, inventory |
| trends.js | Baseline comparison, drift and alert logic (see Part B) |
| triage.js | Triage steps and outcomes |
| chart.js (library, local) | Chart.js file bundled in the repo. No CDN link anywhere |
| sw.js + manifest.json | Service worker caching and PWA install |

Frontend owns: index.html, style.css, app.js, sw.js, manifest.json.
Henry owns: data.js, trends.js, triage.js.

### Design rules
- Status is always colour plus word plus arrow, for example "Amber, rising". A colour-blind user must lose nothing.
- Emergency screens: minimum 18pt action text (18pt is 24px in CSS), buttons at least 56px high, one decision per screen.
- Charts: one indicator per chart, baseline line labelled, units on every axis, no chart without a plain-English caption ("Resting heart rate has risen for 10 days").
- Every number shows its unit. Every date shows in full. No unexplained abbreviations.
- "Simulated data" appears on the home screen and the astronaut detail screen.

### Frontend acceptance checklist
- [ ] Opens on a phone at 360px with no horizontal scrolling
- [ ] All 7 modules reachable and working with Wi-Fi off after first load
- [ ] Entering a check-in updates status and chart without a reload
- [ ] Triage completable start to finish with one hand, in under 2 minutes
- [ ] Switching to Mars changes the message countdown to 20 to 24 minutes
- [ ] No CDN, font or image loads from the internet at run time
- [ ] Works from the Vercel link and from the local laptop address

Note on testing: service workers only register on HTTPS or localhost. A phone opening a plain `http://192.168.x.x` address will not cache the app for offline use. The Wi-Fi-off demo must use the Vercel HTTPS link, or a laptop on localhost.

# Part B: Backend (local-first, no server)

## 5. Architecture

CrewCare has no cloud backend by design. The "backend" is the data layer, logic and storage that run on the device, in flight on the spacecraft computer.

| Layer | Where it runs | Job |
|---|---|---|
| Interface | Browser on phone / tablet | Screens in Part A |
| Logic | JavaScript on the device | Trend engine, triage flow, readiness, delay queue |
| Storage | Device: localStorage / IndexedDB | Readings, baselines, inventory, outbox, saved instantly, offline |
| Static data | Bundled in the app | Simulated crew data, guidance text, evidence panels |
| Delivery (judging only) | GitHub to Vercel | Delivers the files once. Vercel does no thinking and holds no health data |
| Local demo | Laptop on same Wi-Fi / hotspot | Serves the same files; phones open the laptop address or scan a QR code |

### Non-functional requirements
- Offline: service worker caches every file on first load. App must pass a full test with Wi-Fi and mobile data off.
- Speed: save a reading and show its status in under 1 second on a mid-range phone.
- Durability: closing and reopening the app loses nothing. Data survives a browser restart.
- Privacy: no health data leaves the device. No accounts, no analytics, no tracking.
- Python's role (offline, not in the app): Henry may use Python to generate the simulated dataset and check the trend maths, then export it as data for data.js. The shipped app needs no Python server.

### Environments and delay model

| Environment | One-way delay used in app | App behaviour |
|---|---|---|
| ISS | Near-instant | Messages send when a link is available; evacuation exists |
| Moon | About 1.3 seconds | Near-real-time, with blackout note |
| Mars | 20 to 24 minutes (use 22 in the demo) | Store-and-forward only; no evacuation, no resupply flags on |

## 6. Data model, logic and backend acceptance

### Data model

| Record | Fields |
|---|---|
| Astronaut | id, name, role, story label, baseline set, status |
| Baseline | astronaut id, indicator, pre-flight average, unit |
| Reading | astronaut id, date, indicator, value, unit, quality-check result |
| Alert | astronaut id, indicator, level (watch / warn / act), reason in plain English, date raised |
| Inventory | item name, quantity, expiry date, low-stock level |
| Outbox | message text, environment, created time, status (pending / sent), countdown end |
| Evidence panel | study id, title, 2 to 3 line summary, where it appears in the app |

### Trend engine rules
- Compare each new reading to that astronaut's own baseline, never to a population average alone.
- Small, short drift = watch. Sustained drift over several days = warn. Sharp change = act now.
- Every alert carries a reason a non-doctor can read aloud, for example: "Sleep below 6.5 hours for 5 nights, and resting heart rate up 9 beats from baseline."
- All bands are team-defined demo values and are labelled as such in the app.
- One published threshold: eye change for SANS (spaceflight-associated neuro-ocular syndrome). Retinal thickening of +20 micrometres is an early sign, +55 micrometres is concerning. Cite it as published. Do not invent others.
- Reference facts, labelled as context: ISS crew sleep averages about 6.1 hours against 8.5 scheduled; ISS radiation averages about 1 mSv per day.

### Simulated crew: four stories
1. One healthy astronaut.
2. One with sleep drift.
3. One with rising blood pressure.
4. One who becomes the chest-pain emergency in the demo.

Data is generated once, fixed for the demo, and labelled simulated everywhere it appears.

### Backend acceptance checklist
- [ ] Readings persist after closing and reopening the app
- [ ] Outbox message stays pending, counts down, then marks sent, with no network
- [ ] Trend maths matches Henry's Python check on the same dataset
- [ ] No network request is made when entering, saving or charting a reading
- [ ] Evidence panels (OSD-816, OSD-1032, OSD-1040 / OSD-1023) display offline
