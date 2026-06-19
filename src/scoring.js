// Scoring: distance from the pupil at the moment of release maps to a ring.
// Points scale with ring, level, reaction speed, Focus, and the current combo —
// rewarding the decisive, focused, unbroken shooting the story is about.

import { clamp01 } from "./util.js";

// Ring radii are expressed as a fraction of the fish's overall radius.
// "perfect" is a tight sweet-spot inside the pupil for expert shots.
export const RINGS = [
  { key: "perfect",  label: "PERFECT!",  max: 0.045, base: 160, color: "#ffe8a8", bull: true },
  { key: "bullseye", label: "BULLSEYE!", max: 0.10,  base: 100, color: "#ffcf6b", bull: true },
  { key: "iris",     label: "Iris",      max: 0.22,  base: 55,  color: "#76e0a0" },
  { key: "body",     label: "Body",      max: 0.70,  base: 20,  color: "#9fb6bd" },
  { key: "miss",     label: "Miss",      max: Infinity, base: 0, color: "#ff7a7a" },
];

export function classify(dist, fishRadius) {
  const frac = dist / fishRadius;
  for (const r of RINGS) {
    if (frac <= r.max) return r;
  }
  return RINGS[RINGS.length - 1];
}

// dist: pixel distance from pupil. fishRadius: pixel radius of the fish.
// reactionMs: time from arrow-ready to the shot. focus: 0..1. level: 0-based.
// combo: number of consecutive scoring hits BEFORE this shot (0 on first).
export function scoreShot({ dist, fishRadius, reactionMs, focus, level, combo = 0 }) {
  const ring = classify(dist, fishRadius);
  if (ring.base === 0) return { ring, points: 0, comboMult: 1 };

  const levelMult = 1 + level * 0.25;

  // Reaction bonus: full under 350ms, fading to 0 by 2500ms.
  const react = clamp01(1 - (reactionMs - 350) / 2150);
  const reactionBonus = 1 + react * 0.6;

  const focusBonus = 1 + focus * 0.4;

  // Combo multiplier: grows with the current unbroken hit streak, capped.
  const comboMult = 1 + Math.min(combo, 10) * 0.12;

  const points = Math.round(ring.base * levelMult * reactionBonus * focusBonus * comboMult);
  return { ring, points, react, comboMult };
}

// Star rating for a cleared level: how far past the target you scored.
export function starsFor(levelScore, target) {
  if (target <= 0) return 3; // calibration / no-fail levels
  const ratio = levelScore / target;
  if (ratio >= 1.9) return 3;
  if (ratio >= 1.4) return 2;
  if (ratio >= 1.0) return 1;
  return 0;
}
