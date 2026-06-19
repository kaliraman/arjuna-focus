// Scoring: distance from the pupil at the moment of release maps to a ring.
// Points scale with ring, level, a reaction-speed bonus, and current Focus —
// rewarding the decisive, focused shot the story is about.

// Ring radii are expressed as a fraction of the fish's overall radius.
export const RINGS = [
  { key: "bullseye", label: "BULLSEYE!", max: 0.10, base: 100, color: "#ffcf6b" },
  { key: "iris",     label: "Iris",      max: 0.22, base: 55,  color: "#76e0a0" },
  { key: "body",     label: "Body",      max: 0.70, base: 20,  color: "#9fb6bd" },
  { key: "miss",     label: "Miss",      max: Infinity, base: 0, color: "#ff7a7a" },
];

// dist: pixel distance from pupil center; fishRadius: pixel radius of the fish.
export function classify(dist, fishRadius) {
  const frac = dist / fishRadius;
  for (const r of RINGS) {
    if (frac <= r.max) return r;
  }
  return RINGS[RINGS.length - 1];
}

// reactionMs: time from level/clarity start to the shot. Faster => bigger bonus.
// focus: 0..1 current focus meter. level: 0-based level index.
export function scoreShot({ dist, fishRadius, reactionMs, focus, level }) {
  const ring = classify(dist, fishRadius);
  if (ring.base === 0) return { ring, points: 0 };

  const levelMult = 1 + level * 0.25;

  // Reaction bonus: full bonus under 350ms, fading to 0 by 2500ms. Only counts
  // when the shot actually lands (ring.base > 0), so it never rewards spamming.
  const react = clamp01(1 - (reactionMs - 350) / 2150);
  const reactionBonus = 1 + react * 0.6;

  const focusBonus = 1 + focus * 0.4;

  const points = Math.round(ring.base * levelMult * reactionBonus * focusBonus);
  return { ring, points, react };
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
