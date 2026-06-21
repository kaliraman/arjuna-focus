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
//
// Each level also carries a palette + distraction mix so the scene MOOD shifts
// across the run (calm teal → warm dusk → stormy indigo) — fighting monotony.
// palette: { bg: [top, mid, bottom], fishA, fishB, vig }
const PALETTES = {
  calm:    { bg: ["#12455a", "#0c2a38", "#05141c"], fishA: "#285e74", fishB: "#5aa0b4", vig: "rgba(0,0,0,0.45)" },
  current: { bg: ["#125052", "#0a2f32", "#04181a"], fishA: "#1f6a64", fishB: "#48c0a8", vig: "rgba(0,8,8,0.45)" },
  leaf:    { bg: ["#1e5240", "#102f24", "#06180f"], fishA: "#2a6e50", fishB: "#5ab488", vig: "rgba(0,12,6,0.46)" },
  deep:    { bg: ["#173a6a", "#0c2240", "#050f22"], fishA: "#2a4a78", fishB: "#6a90c0", vig: "rgba(0,0,12,0.5)" },
  dusk:    { bg: ["#5b466a", "#2e2440", "#120a1e"], fishA: "#7a5a78", fishB: "#c89aa8", vig: "rgba(20,0,20,0.5)" },
  glare:   { bg: ["#7e8aa0", "#3e4a64", "#161f30"], fishA: "#5a6a84", fishB: "#aac0d8", vig: "rgba(0,0,0,0.4)" },
  dusky:   { bg: ["#463a72", "#241a40", "#0c0822"], fishA: "#5a4a88", fishB: "#9a7ac0", vig: "rgba(10,0,20,0.55)" },
  storm:   { bg: ["#3a3066", "#191333", "#070318"], fishA: "#4a3f80", fishB: "#8470b8", vig: "rgba(0,0,0,0.62)" },
};

export const LEVELS = [
  { key: "calibration",    name: "Calibration",      motion: 0.20, distraction: 0.00, ripple: 0.3, clarityFlash: false, eyeHits: 1, calibration: true, palette: PALETTES.calm,    kinds: ["leaf"],                          fish: "minnow" },
  { key: "stillpool",      name: "The Still Pool",   motion: 0.35, distraction: 0.00, ripple: 0.5, clarityFlash: false, eyeHits: 4, palette: PALETTES.calm,    kinds: ["leaf"],                          fish: "minnow" },
  { key: "firstcurrent",   name: "First Current",    motion: 0.55, distraction: 0.12, ripple: 0.8, clarityFlash: false, eyeHits: 4, palette: PALETTES.current, kinds: ["leaf", "bird"],                  fish: "finned" },
  { key: "driftingleaves", name: "Drifting Leaves",  motion: 0.80, distraction: 0.28, ripple: 1.0, clarityFlash: false, eyeHits: 3, palette: PALETTES.leaf,    kinds: ["leaf", "leaf", "bird"],          fish: "halibut" },
  { key: "restlesswater",  name: "Restless Water",   motion: 1.10, distraction: 0.42, ripple: 1.3, clarityFlash: false, eyeHits: 3, palette: PALETTES.deep,    kinds: ["cloud", "bird", "leaf"],         fish: "tuna" },
  { key: "crowdedsky",     name: "The Crowded Sky",  motion: 1.45, distraction: 0.60, ripple: 1.5, clarityFlash: false, eyeHits: 2, palette: PALETTES.dusk,    kinds: ["cloud", "cloud", "bird"],        fish: "finned" },
  { key: "veilofglare",    name: "Veil of Glare",    motion: 1.80, distraction: 0.75, ripple: 1.7, clarityFlash: true,  eyeHits: 2, palette: PALETTES.glare,   kinds: ["glare", "glare", "cloud"],       fish: "swordfish" },
  { key: "whirlingeye",    name: "The Whirling Eye", motion: 2.30, distraction: 0.88, ripple: 1.9, clarityFlash: true,  eyeHits: 1, palette: PALETTES.dusky,   kinds: ["cloud", "glare", "leaf", "bird"], fish: "marlin" },
  { key: "arjunasgaze",    name: "Arjuna's Gaze",    motion: 2.90, distraction: 1.00, ripple: 2.1, clarityFlash: true,  eyeHits: 1, palette: PALETTES.storm,   kinds: ["cloud", "glare", "bird"],        fish: "marlin" },
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
