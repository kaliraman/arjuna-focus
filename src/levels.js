// Level table — the scene's complexity rises each level along two axes:
//   motion      : how fast the fish reflection spins (radians/sec)
//   distraction : 0..1 density of drifting clutter in the pool
//   ripple      : water distortion (jitters the eye's path)
//   clarityFlash: if true, the eye is veiled and only clear in brief windows
//   eyeHits     : eye strikes (iris or bullseye) needed to advance
//
// Difficulty stays UNDER the complexity curve: the scene gets busier and faster,
// but the number of eye-strikes to pass stays gentle. Arrows are unlimited.

// eyeHits is reversed on purpose: MANY strikes when it's slow and easy (a calm,
// confidence-building warm-up), FEW when it's fast and chaotic — ending on a
// single decisive arrow (Arjuna at the swayamvara). Keeps difficulty under the
// complexity curve.
export const LEVELS = [
  { key: "calibration",    name: "Calibration",      motion: 0.20, distraction: 0.00, ripple: 0.3, clarityFlash: false, eyeHits: 1, calibration: true },
  { key: "stillpool",      name: "The Still Pool",   motion: 0.35, distraction: 0.00, ripple: 0.5, clarityFlash: false, eyeHits: 4 },
  { key: "firstcurrent",   name: "First Current",    motion: 0.55, distraction: 0.12, ripple: 0.8, clarityFlash: false, eyeHits: 4 },
  { key: "driftingleaves", name: "Drifting Leaves",  motion: 0.80, distraction: 0.28, ripple: 1.0, clarityFlash: false, eyeHits: 3 },
  { key: "restlesswater",  name: "Restless Water",   motion: 1.10, distraction: 0.42, ripple: 1.3, clarityFlash: false, eyeHits: 3 },
  { key: "crowdedsky",     name: "The Crowded Sky",  motion: 1.45, distraction: 0.60, ripple: 1.5, clarityFlash: false, eyeHits: 2 },
  { key: "veilofglare",    name: "Veil of Glare",    motion: 1.80, distraction: 0.75, ripple: 1.7, clarityFlash: true,  eyeHits: 2 },
  { key: "whirlingeye",    name: "The Whirling Eye", motion: 2.30, distraction: 0.88, ripple: 1.9, clarityFlash: true,  eyeHits: 1 },
  { key: "arjunasgaze",    name: "Arjuna's Gaze",    motion: 2.90, distraction: 1.00, ripple: 2.1, clarityFlash: true,  eyeHits: 1 },
];

export function getLevel(i) {
  if (i < LEVELS.length) return LEVELS[i];
  // Beyond the curated levels: endless, scaling motion + eye-strikes needed.
  const last = LEVELS[LEVELS.length - 1];
  const over = i - LEVELS.length + 1;
  return {
    ...last,
    key: "endless",
    name: `Endless ${over}`,
    endlessN: over,
    motion: last.motion + over * 0.5,
    distraction: 1.0,
    ripple: last.ripple + over * 0.15,
    clarityFlash: true,
    eyeHits: last.eyeHits + over,
  };
}

export const LEVEL_COUNT = LEVELS.length;
// Numbered challenge levels (everything after the unnumbered Calibration warm-up).
export const CHALLENGE_COUNT = LEVELS.length - 1;
