// Scoring: distance from the pupil at the moment of IMPACT maps to a ring.
// Flat points per ring — no multipliers. The "eye" flag marks a hit on the eye
// (iris or bullseye), which is what counts toward advancing a level.

// Ring radii are expressed as a fraction of the fish's overall radius.
export const RINGS = [
  { key: "bullseye", label: "BULLSEYE!", max: 0.10, base: 100, color: "#ffcf6b", eye: true },
  { key: "eye",      label: "Eye",       max: 0.22, base: 50,  color: "#76e0a0", eye: true },
  { key: "body",     label: "Body",      max: 0.70, base: 10,  color: "#9fb6bd", eye: false },
  { key: "miss",     label: "Miss",      max: Infinity, base: 0, color: "#ff7a7a", eye: false },
];

export function classify(dist, fishRadius) {
  const frac = dist / fishRadius;
  for (const r of RINGS) {
    if (frac <= r.max) return r;
  }
  return RINGS[RINGS.length - 1];
}

// dist: pixel distance from pupil at impact. fishRadius: pixel radius of the fish.
export function scoreShot({ dist, fishRadius }) {
  const ring = classify(dist, fishRadius);
  return { ring, points: ring.base, eyeHit: ring.eye };
}
