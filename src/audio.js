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

export const Audio = {
  // Call once on a user gesture to unlock the context.
  unlock() { ensure(); },

  toggleMute() { muted = !muted; return muted; },
  isMuted() { return muted; },

  twang() { blip({ freq: 320, type: "triangle", dur: 0.16, slideTo: 140, gain: 0.16 }); },
  bullseye() {
    blip({ freq: 660, type: "sine", dur: 0.14, gain: 0.2 });
    setTimeout(() => blip({ freq: 990, type: "sine", dur: 0.18, gain: 0.18 }), 90);
  },
  hit() { blip({ freq: 520, type: "sine", dur: 0.14, gain: 0.16 }); },
  miss() { blip({ freq: 150, type: "sawtooth", dur: 0.22, slideTo: 80, gain: 0.14 }); },
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
