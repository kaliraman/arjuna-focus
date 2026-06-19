# Arjuna's Focus

A minimal browser game inspired by the Mahabharata tale of Arjuna and the fish's eye.
You aim at a fish's eye seen only in a rippling reflection, while the pool fills with
distraction. **See only the eye.**

Works on desktop (mouse) and mobile (touch). No build step, no dependencies.

## Run it locally

ES modules need to be served over HTTP (not opened as `file://`). From this folder:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser. (Any static server works, e.g.
`npx serve`.)

## How to play

- **Aim** — move the pointer (or drag on touch) to guide the reticle.
- **Loose** — click / tap to fire at the fish's eye in the reflection.
- The **pupil** is the bullseye; closer + faster shots score more.
- **Hold steady** to build **Focus**, which calms the ripples and clears the water.
- Levels escalate along two axes: the fish **spins faster** and the pool fills with
  **distraction**, until the eye is clear only in split-second flashes.

## Structure

```
index.html      # canvas + menu/HUD overlays
styles.css      # responsive, mobile-first styling
src/
  main.js        # canvas bootstrap, render loop, screen wiring
  game.js        # run state, scoring flow, level progression
  scene.js       # pool, rotating fish + eye, ripples, distractions (procedural)
  levels.js      # per-level motion / distraction / clarity tuning
  input.js       # unified pointer + touch aiming and firing
  scoring.js     # ring detection + reaction/focus bonuses
  leaderboard.js # localStorage scores (swap-in point for an online backend)
  ui.js          # screen switching, HUD, toasts, leaderboard rendering
  audio.js       # tiny procedural WebAudio sound effects
```

## Leaderboard

Scores currently persist in the browser via `localStorage`. To make it a global
online board later, only `src/leaderboard.js` needs to change — its
`getTopScores()` / `submitScore()` functions are already async, so a Supabase (or
other) backend can drop straight in.
