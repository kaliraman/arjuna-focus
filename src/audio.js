// Tiny procedural sound via WebAudio — no asset files. Created lazily on first
// user gesture (browsers block audio before interaction). Easily muted.

let ctx = null;
let muted = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

function blip({ freq = 440, type = "sine", dur = 0.12, gain = 0.18, slideTo = null }) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A resonant struck-bell tone (stacked partials, long decay) for the payoff.
// Placeholder for a real temple-bell / conch sample, to be curated for approval.
function bell({ freq = 528, dur = 0.9, gain = 0.22 }) {
  if (muted) return;
  const ac = ensure();
  if (!ac) return;
  const t0 = ac.currentTime;
  const partials = [[1, 1], [2.0, 0.5], [3.0, 0.28], [4.2, 0.16]];
  const master = ac.createGain();
  master.gain.setValueAtTime(gain, t0);
  master.connect(ac.destination);
  for (const [mult, amp] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * mult, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * (0.55 + 0.45 / mult));
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}

export const Audio = {
  // Call once on a user gesture to unlock the context.
  unlock() { ensure(); },

  toggleMute() { muted = !muted; return muted; },
  isMuted() { return muted; },

  twang() { blip({ freq: 300, type: "triangle", dur: 0.14, slideTo: 150, gain: 0.14 }); },
  bullseye() {
    bell({ freq: 528, dur: 1.5, gain: 0.3 });
    setTimeout(() => bell({ freq: 792, dur: 1.0, gain: 0.12 }), 60);
  },
  chime() { bell({ freq: 680, dur: 0.55, gain: 0.18 }); },
  hit() {
    blip({ freq: 620, type: "sine", dur: 0.16, gain: 0.14 });
    setTimeout(() => blip({ freq: 930, type: "sine", dur: 0.16, gain: 0.07 }), 70);
  },
  // Gentle, never a buzzer — the brief's "soft landing" miss.
  softMiss() { blip({ freq: 240, type: "sine", dur: 0.2, slideTo: 150, gain: 0.1 }); },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "sine", dur: 0.16, gain: 0.16 }), i * 100)
    );
  },
  gameOver() {
    [392, 330, 262].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "triangle", dur: 0.3, gain: 0.16 }), i * 160)
    );
  },
};
