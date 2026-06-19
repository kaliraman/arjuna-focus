// Leaderboard storage behind a small async interface.
//
// v1 implementation: localStorage (fully offline, zero setup).
// Later: swap the bodies of getTopScores/submitScore for Supabase calls — the
// rest of the game only depends on these two async functions and their shapes.
//
//   getTopScores(limit) -> Promise<Array<{ name, score, ts }>>   (sorted desc)
//   submitScore(name, score) -> Promise<{ rank, entries }>

const KEY = "arjuna_focus_scores_v1";
const MAX_STORED = 50;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
  } catch {
    /* storage may be unavailable (private mode); fail silently */
  }
}

function sortDesc(entries) {
  return [...entries].sort((a, b) => b.score - a.score || a.ts - b.ts);
}

export async function getTopScores(limit = 10) {
  return sortDesc(load()).slice(0, limit);
}

export async function submitScore(name, score) {
  const clean = String(name || "AAA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) || "AAA";
  // ts is captured at call time; main.js passes Date.now() in via the UI layer.
  const entry = { name: clean, score: Math.max(0, Math.round(score)), ts: Date.now() };
  const entries = sortDesc([...load(), entry]);
  save(entries);
  const rank = entries.findIndex((e) => e === entry) + 1;
  return { rank, entry, entries: entries.slice(0, MAX_STORED) };
}
