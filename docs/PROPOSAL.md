# CrewCare: Idea Proposal (condensed)

NASA Space Apps 2026, Health Monitoring Software challenge.
This is a condensed copy of the team's proposal, kept for context. Where it conflicts with `docs/PRD.md`, the PRD wins.

Idea in one sentence: an offline-first health companion that sits on top of the devices astronauts already have. It shows the whole body at a glance, watches each astronaut against their own baseline, guides them step by step in an emergency, and keeps working when Earth is 20 to 24 minutes away.

## The point

The ISS already has ECG machines, blood-pressure cuffs, ultrasound, blood analysers and wearable shirts, backed by doctors on the ground who can bring a sick astronaut home in hours. We are not building another sensor, ECG app or live dashboard. What does not exist yet is the software layer in between: one place that collects readings, spots drift early, tells a non-doctor what to do next, and decides locally when Earth cannot answer in time.

## 1. The challenge

Scenario from the challenge video: halfway to Mars, a crewmate gets sharp chest pain and collapses. Radio takes about 20 to 24 minutes each way, there is no way back, and astronauts are not doctors.

The software should help astronauts check their own health. It should explain how to take each measurement, why it matters, and what to do if it is not normal.

### The six indicators

| Indicator | Why it matters in space |
|---|---|
| Blood pressure | Fluid shifts and cardiovascular changes in weightlessness move it away from Earth-normal. |
| Heart rate | Basic sign of stress, illness, fitness loss and heart problems. |
| Blood sugar | Low or high sugar can cause confusion, collapse and poor decisions. |
| Body temperature | Fever is an early sign of infection in a closed spacecraft. |
| Daily sleep hours | ISS crews average about 6.1 hours against 8.5 scheduled. Poor sleep affects safety and mood. |
| Mood | Isolation and confinement affect mental health on long missions. |

### The five hazards (NASA Human Research Program)
Space radiation, isolation and confinement, distance from Earth, gravity fields, and hostile / closed environments. The app should connect each number to the hazard driving it:
- Radiation drives dose and immune risk.
- Gravity drives bone, muscle, heart and eye changes.
- Isolation drives sleep and mood.
- Distance drives the need to decide without Earth.
- A closed environment drives temperature, air and infection control.

### What the brief suggests
A clickable human body, colour coding, charts over time, reminders to measure, and gamification. It asks the app to collect, display, track and analyse data, detect early signs of illness, alert the astronaut and ground control, work with no internet, and protect personal data.

## 2. What they already have on the ISS

| System | What it does | Status |
|---|---|---|
| Bio-Monitor / Astroskin (CSA) | Smart shirt: heart rate, ECG, breathing, skin temperature, activity, blood oxygen. Worn in sessions. | Research use |
| Holter Monitor 2 | 12-lead ECG, recorded for experts to read later | Operational |
| Periodic Health Status kit | Blood-pressure cuff, pulse oximeter, thermometer, stethoscope, ECG | Operational |
| Ultrasound 2 | Heart, vessels, eye, abdomen, bladder, kidney, blood clots. Images sent to Earth. | Operational |
| i-STAT blood analyser | Blood salts, glucose, calcium, pH from a fingerstick | Operational |
| Eye imaging (OCT, fundus camera) | Retinal thickness and swelling, for SANS | Operational |
| Actiwatch wrist sensor | Movement and light, from which sleep is scored | Research |
| Radiation dosimeters | Dose, dose rate and particle type | Operational |
| Emergency packs | Defibrillator, oxygen, airway kit, medicines, CPR restraint | Operational |

Not on the ISS: no CT, no MRI, no operating theatre, no intensive care. It is like a well-equipped ambulance: stabilise and evacuate, not treat fully.

## 3. How care works today

- A flight surgeon is on call 24 hours a day in Houston.
- A private medical conference happens weekly (15 minutes).
- One crewmember is the Crew Medical Officer (CMO), usually not a doctor.
- The crew collects, the ground diagnoses.
- Evacuation is the backstop. In January 2026, Crew-11 was brought home early, the first medical evacuation in 25 years of the ISS.

NASA Standard Measures collect the same small set of tests before, during and after every mission. The app copies that schema instead of inventing one.

Being tested for deep space, not routine kit: Tempus Pro, AMOS (just-in-time ultrasound guidance, flown on ISS), CMO-DA (AI decision support, proof of concept only), xEHR (planned in-flight health record, does not exist yet), HERA and crew dosimeters.

## 4. The gap for the Moon and Mars

| Problem | ISS today | Moon | Mars |
|---|---|---|---|
| Talking to Earth | Near-instant | About 1.3 seconds one way | 20 to 24 minutes one way; 40 to 48 minutes round trip |
| Getting home | Hours | About 3 days | Months to years |
| Resupply | Regular | Limited | None. Medicines expire during the mission. |
| Medical skill on board | CMO plus live ground specialists | CMO plus delayed help | Small crew, unlikely to include a doctor |

Three software problems:
1. No one to ask in time. Triage and first steps must happen locally.
2. No single picture of the astronaut. Drift over weeks is easy to miss.
3. No guidance at the moment of use.

## 5. The idea, module by module

1. **Clickable body dashboard.** Click heart, lungs, bones, muscles, brain and mood, or eyes, to see status, trend, and the hazard affecting it. Green, amber or red at a glance.
2. **Personal-baseline trend engine (the core).** Store each astronaut's pre-flight baseline and chart the six indicators against it. Flag drift early.
3. **Emergency triage.** A large Emergency button, step-by-step plain instructions, and a clear call: handle on board, keep monitoring, or alert ground control. The chest-pain scenario is the demo.
4. **Just-in-time guidance.** How to take each measurement, with a quality check. Extends the AMOS pattern.
5. **Offline record and mission-delay simulator.** Everything stored on the device. A switch changes the mission (ISS, Moon, Mars). On Mars the app decides locally and queues messages for Earth.
6. **Radiation and sleep watch.** Cumulative dose in millisieverts. The ISS average of about 1 mSv per day is context only, not a safe limit. Sleep hours compared with the astronaut's own pattern.
7. **Medical inventory.** Track medicines and equipment, warn before expiry, suggest substitutes.

### The 2-minute demo
1. Morning check-in logged in under a minute.
2. Dashboard flags amber: resting heart rate drifting up for four days, sleep down.
3. Emergency: chest pain, triage walks through the checks.
4. Mission switch flips to Mars: alert handled locally, record queues for Earth.
5. Earth mode: the same tool for a remote clinic with no doctor nearby.

## 6. Data and honesty

- There is no live astronaut feed and no public dataset of astronaut vitals over time. We build three or four simulated astronauts and label them "simulated" everywhere.
- The NASA Open Science Data Repository (OSDR) holds real space-biology studies. It is research data, not a vitals feed. We use studies as evidence panels: OSD-816 (SANS eye condition), OSD-1032 (sleep and vigilance in bed rest), OSD-1040 and OSD-1023 (exercise countermeasures).
- The only published alert threshold we use is for the eyes: about +20 micrometres retinal thickness is the earliest sign, about +55 micrometres is concerning for SANS.
- Every other alert band is labelled "team-defined demo values". Judges should hear that from us first.

## 7. What we are NOT doing

| Not building | Why |
|---|---|
| Another wearable or sensor | Already exists, and not buildable in a weekend |
| Another ECG app or interpreter | The Holter Monitor 2 already gives a clinical 12-lead ECG |
| An "AI doctor" | Our triage gives steps and red flags and never claims a diagnosis |
| A cloud dashboard needing a live link | It fails on Mars, with a 40 to 48 minute round trip |
| New medical hardware | Tempus Pro and LifeBot are already being evaluated |
| A new set of health tests | Standard Measures already defines them |
| Earth thresholds presented as space rules | Our bands are labelled as ours |
| A replacement for the flight surgeon | The app prepares and queues information for that surgeon |

## Sources

- NASA Space Apps 2026 challenge: https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
- NASA 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- Standard Measures: https://www.nature.com/articles/s41526-025-00532-6
- CSA medical support: https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/medical-support.asp
- Future medical systems (Tempus, AMOS, xEHR, inventory): https://www.frontiersin.org/journals/spacetechnologies/articles/10.3389/frspt.2024.1384457/full
- NASA Open Science Data Repository: https://osdr.nasa.gov/
