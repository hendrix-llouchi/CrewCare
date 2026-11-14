# CrewCare frontend: rules for every task

You are helping build the frontend of CrewCare for NASA Space Apps 2026.
CrewCare is an offline-first health companion for a non-doctor crewmate
(the Crew Medical Officer) on a Mars transit, where Earth is 20-24 minutes
away. Read docs/PRD.md and docs/PROPOSAL.md before changing anything.
If a request conflicts with the PRD, stop and ask. Do not guess.

## Stack (fixed, do not change)
- Plain HTML, CSS and vanilla JavaScript. No React, no build step, no frameworks,
  no Tailwind, no component libraries.
- Chart.js is a local file in the repo. Never load it from a CDN.
- Fonts are self-hosted .woff2 files in /fonts. No Google Fonts, no external requests.
- No images, scripts, styles or fonts load from the internet at run time.
- Data lives on the device (localStorage / IndexedDB). No network request when
  entering, saving or charting a reading.
- PWA: manifest.json plus sw.js caching every file. Must work fully with Wi-Fi off.
- File layout: index.html, style.css, app.js, data.js, trends.js, triage.js,
  sw.js, manifest.json. Do not edit data.js, trends.js or triage.js logic
  unless I ask. Call their functions and ask me if a function is missing.

## Product rules
- Phone first: design at 360px wide, no horizontal scroll, then scale to laptop.
- Bottom nav: Crew, Check-in, Emergency, More. Emergency is reachable in one
  tap from every screen.
- Status is always colour + word + arrow (example: "Amber, rising"). Never colour alone.
- Emergency screens: action text at least 18pt, buttons at least 56px high,
  one decision per screen, visible step counter ("Step 2 of 5").
- Every number shows its unit. Every date shows in full. No unexplained abbreviations.
- Every chart: one indicator, labelled baseline line, units on axes, and a
  plain-English caption.
- "Simulated data" is visible on the home screen and astronaut detail screen.
- Alert bands are labelled "team-defined demo values". Only the SANS eye
  threshold (+20 and +55 micrometres) is presented as published.
- The app guides, it never diagnoses. Never write wording that claims a diagnosis.
- Never invent medical facts, study findings, numbers or astronaut names.
  Use only text I paste in. If copy is missing, insert a clearly marked
  TODO(content) and tell me.

## Design rules (strict)
Never do any of these:
- Purple or violet gradients, or any gradient used as decoration.
- Pill-shaped or fully rounded buttons. Border radius is 2px to 6px, one value
  used everywhere.
- Fake reviews, testimonials, fake metrics, fake customer counters, fake logos.
- Vague hero text such as "Revolutionising health" or "The future of care".
  Headlines say plainly what the product does.
- Emoji as icons. Use a small hand-checked inline SVG set, one stroke weight.
- Em dashes anywhere in copy or code comments. Use commas, colons or full stops.
- Scroll-triggered or parallax animations, cursor effects or custom cursors,
  bouncing or floating elements, glassmorphism, glowing shadows.
- Stock or AI-generated photos. Use no photos. Diagrams are SVG that we draw.
- A "made with AI" badge or any generator watermark.
- Lorem ipsum or placeholder text in anything committed.
Motion: only functional transitions (150ms or less, ease-out) on state changes
such as button press and panel open. Respect prefers-reduced-motion.

## Visual direction
Calm, precise, clinical instrument panel. Not a startup landing page.
- Palette: deep ink (#101820 range) and a warm off-white surface, one muted
  teal-blue accent, plus status colours red, amber, green that stay readable
  against both. Define all colours as CSS custom properties in :root. Check
  contrast at WCAG AA or better.
- Type: one sans for UI, one mono for numbers and units. Fixed type scale.
- Layout: 4px spacing grid, strong alignment, generous tap targets, real
  hierarchy. Cards are flat with 1px borders, no heavy shadows.
- Dark and light themes via prefers-color-scheme using the same variables.

## Code quality
- Semantic HTML (header, nav, main, section, button, label). Every input has a
  label. Every icon-only button has an aria-label. Keyboard focus is visible.
- No inline styles, no !important, no duplicated CSS. Reuse components.
- Small, commented functions. No dead code, no console.log left behind.
- Escape any text inserted into the DOM.

## How to work
1. Before coding, restate the task and list the files you will touch.
2. Make the smallest change that completes the task. No unrelated refactors.
3. After coding, check your work against every rule above and list any rule
   you could not meet. Do not say "done" until you have checked.
4. If anything is ambiguous, ask one question instead of guessing.