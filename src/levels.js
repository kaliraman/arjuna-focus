// Level table — walks the difficulty curve along two independent axes:
//   motion      : how fast the fish reflection spins (radians/sec)
//   distraction : 0..1 density of drifting clutter in the pool
//   ripple      : base water distortion (calmed by Focus)
//   clarityFlash: if true, the eye is occluded and only clear in brief windows
//   arrows      : shots allowed this level
//   target      : score needed to advance
//
// Each level dials the axes up independently, exactly as the user described:
// first a steady aim-and-timing shot, escalating into a reflex one-tap.

export const LEVELS = [
  { name: "Calibration",      motion: 0.20, distraction: 0.00, ripple: 0.3, clarityFlash: false, arrows: 3, target: 0, calibration: true },
  { name: "The Still Pool",   motion: 0.35, distraction: 0.00, ripple: 0.5, clarityFlash: false, arrows: 5, target: 200 },
  { name: "First Current",    motion: 0.55, distraction: 0.12, ripple: 0.8, clarityFlash: false, arrows: 5, target: 450 },
  { name: "Drifting Leaves",  motion: 0.80, distraction: 0.28, ripple: 1.0, clarityFlash: false, arrows: 5, target: 750 },
  { name: "Restless Water",   motion: 1.10, distraction: 0.42, ripple: 1.3, clarityFlash: false, arrows: 6, target: 1150 },
  { name: "The Crowded Sky",  motion: 1.45, distraction: 0.60, ripple: 1.5, clarityFlash: false, arrows: 6, target: 1650 },
  { name: "Veil of Glare",    motion: 1.80, distraction: 0.75, ripple: 1.7, clarityFlash: true,  arrows: 6, target: 2250 },
  { name: "The Whirling Eye", motion: 2.30, distraction: 0.88, ripple: 1.9, clarityFlash: true,  arrows: 7, target: 3000 },
  { name: "Arjuna's Gaze",    motion: 2.90, distraction: 1.00, ripple: 2.1, clarityFlash: true,  arrows: 7, target: 4000 },
];

export function getLevel(i) {
  // Clamp; beyond the last level we keep scaling for an endless finale.
  if (i < LEVELS.length) return LEVELS[i];
  const last = LEVELS[LEVELS.length - 1];
  const over = i - LEVELS.length + 1;
  return {
    ...last,
    name: `Endless ${over}`,
    motion: last.motion + over * 0.5,
    distraction: 1.0,
    ripple: last.ripple + over * 0.15,
    clarityFlash: true,
    target: last.target + over * 1200,
  };
}

export const LEVEL_COUNT = LEVELS.length;
