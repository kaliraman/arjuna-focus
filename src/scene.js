// Scene: draws the reflecting pool, the rotating fish + its eye, ripple
// distortion, drifting distractions, and now the loosed arrow, impact particles,
// screen shake, and a subtle water-caustics shimmer. Purely procedural.
//
// The fish orbits the pool's center, so its eye literally sweeps a circle —
// the "motion" axis is this orbital speed. Ripple jitters the eye; Focus calms
// it. At high levels the eye is veiled and only shows in brief clarity windows.

import { easeInQuad } from "./util.js";

export class Scene {
  constructor() {
    this.t = 0;              // seconds elapsed (level clock)
    this.theta = 0;          // fish orbit angle
    this.w = 0;
    this.h = 0;
    this.cx = 0;
    this.cy = 0;
    this.fishRadius = 70;
    this.orbitR = 90;

    this.cfg = { motion: 0.4, ripple: 0.5, distraction: 0, clarityFlash: false };
    this.rng = Math.random;  // distraction randomness (injectable)

    this.distractions = [];
    this.impacts = [];       // expanding hit rings
    this.arrows = [];        // arrows in flight
    this.particles = [];     // impact sparks
    this.glows = [];         // soft radial blooms (perfect strike)
    this.petals = [];        // (legacy) generic petals — unused, lotus replaces it
    this.lotus = null;       // blooming lotus on a level clear
    this.ambientRings = [];
    this.shakeMag = 0;
    this.shakeT = 0;

    // juice + accessibility
    this.reduceMotion = false;
    this.highContrast = false;
    this._slowT = 0;         // remaining real-time of the slow-mo window
    this._slowDur = 0.5;
    this._slowFloor = 0.15;  // how far time slows (lower = nearer a freeze)
    this._ts = 1;            // current time scale (1 = normal speed)
    this._heroT = 0;         // hero-moment overlay timer (flash / zoom / vignette)
    this._heroDur = 0;
    this._heroStrength = 0;
    this._zoomAmt = 0;
    this.bow = { drawing: false, power: 0 };

    this._eye = { x: 0, y: 0 };
    this._seedAmbient();
  }

  setConfig(cfg) { this.cfg = { ...this.cfg, ...cfg }; }
  setRng(fn) { this.rng = fn || Math.random; }

  resetLevel() {
    this.t = 0;
    this.theta = Math.PI * 0.25;
    this.distractions = [];
    this.impacts = [];
    this.arrows = [];
    this.particles = [];
    this.glows = [];
    this.petals = [];
    this.lotus = null;
    this.shakeMag = 0;
    this.shakeT = 0;
    this._slowT = 0;
    this._ts = 1;
    this._heroT = 0;
    this._zoomAmt = 0;
    this.bow.drawing = false;
    this.bow.power = 0;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h / 2;
    const m = Math.min(w, h);
    this.fishRadius = m * 0.15;
    this.orbitR = m * 0.20;
  }

  _seedAmbient() {
    for (let i = 0; i < 5; i++) {
      this.ambientRings.push({ r: Math.random(), speed: 0.05 + Math.random() * 0.08 });
    }
  }

  // ---- update ---------------------------------------------------------------
  update(dt) {
    // Slow-mo envelope counts REAL time; the world advances at the scaled rate.
    if (this._slowT > 0) this._slowT = Math.max(0, this._slowT - dt);
    if (this._heroT > 0) this._heroT = Math.max(0, this._heroT - dt);
    this._ts = this._timeScale();
    const wdt = dt * this._ts; // world dt

    if (this.bow.drawing) this.bow.power = Math.min(1, this.bow.power + dt * 2.2);

    this.t += wdt;
    this.theta += this.cfg.motion * wdt;

    const amp = this.cfg.ripple * 7;
    const rx = Math.sin(this.t * 3.1 + this.theta * 2) * amp;
    const ry = Math.cos(this.t * 2.3 + this.theta * 1.5) * amp;
    const head = this.theta + Math.PI / 2;
    this._eye.x = this.cx + Math.cos(this.theta) * this.orbitR + Math.cos(head) * this.fishRadius * 0.5 + rx;
    this._eye.y = this.cy + Math.sin(this.theta) * this.orbitR + Math.sin(head) * this.fishRadius * 0.5 + ry;

    for (const r of this.ambientRings) {
      r.r += r.speed * wdt * (0.4 + this.cfg.ripple * 0.3);
      if (r.r > 1.4) r.r = 0;
    }

    const targetCount = Math.round(this.cfg.distraction * 22);
    while (this.distractions.length < targetCount) this.distractions.push(this._spawn());
    for (const d of this.distractions) {
      d.x += d.vx * wdt;
      d.y += d.vy * wdt;
      d.life -= wdt;
      d.rot += d.vr * wdt;
    }
    this.distractions = this.distractions.filter(
      (d) => d.life > 0 && d.x > -120 && d.x < this.w + 120 && d.y > -120 && d.y < this.h + 120
    );

    // Arrows in flight
    for (const a of this.arrows) {
      a.age += wdt;
      const k = Math.min(1, a.age / a.dur);
      const e = easeInQuad(k);
      a.x = a.x0 + (a.tx - a.x0) * e;
      a.y = a.y0 + (a.ty - a.y0) * e;
      a.trail.push({ x: a.x, y: a.y });
      if (a.trail.length > 9) a.trail.shift();
      if (k >= 1 && !a.landed) {
        a.landed = true;
        a.onLand && a.onLand();
      }
    }
    this.arrows = this.arrows.filter((a) => !a.landed);

    // Spark particles (gravity)
    for (const p of this.particles) {
      p.age += wdt;
      p.x += p.vx * wdt;
      p.y += p.vy * wdt;
      p.vy += 220 * wdt;
      p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    // Level-clear petals drift upward (run on real time — outside gameplay)
    for (const p of this.petals) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.petals = this.petals.filter((p) => p.age < p.life);

    if (this.lotus) {
      this.lotus.age += dt; // real time — it blooms outside gameplay
      if (this.lotus.age > this.lotus.dur) this.lotus = null;
    }

    for (const g of this.glows) g.age += wdt;
    this.glows = this.glows.filter((g) => g.age < g.dur);

    for (const im of this.impacts) im.age += wdt;
    this.impacts = this.impacts.filter((im) => im.age < im.dur);

    if (this.shakeT > 0) this.shakeT -= dt;
  }

  _timeScale() {
    if (this._slowT <= 0) return 1;
    const fl = this._slowFloor;
    const k = this._slowT / this._slowDur; // 1 at start → 0 at end
    if (k > 0.45) return fl;               // held near-frozen at impact
    return fl + (1 - fl) * (1 - k / 0.45); // ease back to normal over the tail
  }

  _spawn() {
    const kinds = ["cloud", "bird", "leaf", "glare"];
    const kind = kinds[(this.rng() * kinds.length) | 0];
    const edge = this.rng() < 0.5 ? 0 : 1;
    const x = edge ? -80 : this.w + 80;
    const dir = edge ? 1 : -1;
    return {
      kind,
      x,
      y: this.rng() * this.h,
      vx: dir * (20 + this.rng() * 50),
      vy: (this.rng() - 0.5) * 26,
      rot: this.rng() * Math.PI,
      vr: (this.rng() - 0.5) * 1.2,
      size: 18 + this.rng() * 42,
      life: 8 + this.rng() * 8,
    };
  }

  // ---- queries used by scoring ---------------------------------------------
  getEye() { return this._eye; }
  getFishRadius() { return this.fishRadius; }

  clarity() {
    if (!this.cfg.clarityFlash) return 1;
    const period = 2.1;
    const open = 0.45;
    const phase = this.t % period;
    if (phase < open) return Math.sin((phase / open) * Math.PI);
    return 0.06;
  }

  // ---- effects spawned by the game -----------------------------------------
  // Launch an arrow from below the pool toward (tx,ty); fires onLand at impact.
  spawnArrow(tx, ty, onLand) {
    const x0 = this.cx + (this.rng() - 0.5) * 30;
    const y0 = this.h + 50;
    const dur = 0.34; // flight time — sets how far you must lead the moving eye
    this.arrows.push({ x0, y0, x: x0, y: y0, tx, ty, age: 0, dur, landed: false, trail: [], onLand });
  }

  addImpact(x, y, color) {
    this.impacts.push({ x, y, age: 0, dur: 0.6, color });
  }

  burst(x, y, color, count = 14, power = 1) {
    const n = this.reduceMotion ? Math.ceil(count * 0.35) : count;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (50 + Math.random() * 170) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 40 * power,
        age: 0,
        life: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }

  shake(mag) {
    if (this.reduceMotion) return;
    this.shakeMag = mag;
    this.shakeT = 0.32;
  }

  // Slow-mo beat — floor sets how near a freeze (lower = harder freeze).
  slowmo(dur = 0.5, floor = 0.15) {
    if (this.reduceMotion) return;
    this._slowDur = dur;
    this._slowFloor = floor;
    this._slowT = dur;
  }

  // Golden bloom + rising gold motes; scales with the strike's strength.
  bloom(x, y, strength = 1) {
    this.glows.push({ x, y, age: 0, dur: 0.55 + strength * 0.35, max: this.fishRadius * (1.6 + strength * 1.8) });
    const n = this.reduceMotion ? 6 : Math.round(10 + strength * 18);
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2;
      const spd = (40 + Math.random() * 130) * (0.7 + strength * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        age: 0,
        life: 0.6 + Math.random() * 0.7,
        size: 1.5 + Math.random() * 3,
        color: Math.random() < 0.5 ? "#ffe8a8" : "#ffcf6b",
      });
    }
  }

  // A bold expanding shock ring from the strike point.
  shockwave(x, y, strength = 1) {
    this.impacts.push({
      x, y, age: 0, dur: 0.45 + strength * 0.25, color: "#ffe8a8",
      shock: true, max: this.fishRadius * (1.8 + strength * 2.6),
    });
  }

  // Composed hero moment: bloom + shock + flash/zoom/vignette; the perfect
  // strike (strength ~1) also gets a hard slow-mo freeze.
  hero(x, y, strength = 1) {
    this.bloom(x, y, strength);
    this.shockwave(x, y, strength);
    if (this.reduceMotion) return;
    this._zoomAmt = 0.04 + strength * 0.1;
    this._heroStrength = strength;
    this._heroDur = strength >= 0.9 ? 0.75 : 0.34;
    this._heroT = this._heroDur;
    if (strength >= 0.9) this.slowmo(0.7, 0.05); // freeze only for dead-center
  }

  // A lotus blooms open at the centre on a level clear.
  celebrate() {
    this.lotus = { age: 0, dur: 2.8 };
  }

  bowStart() { this.bow.drawing = true; this.bow.power = 0; }
  bowRelease() {
    this.bow.drawing = false;
    this.bow.power = 0;
    this.shake(2); // the snap
  }

  // ---- render ---------------------------------------------------------------
  render(ctx) {
    const { w, h, cx, cy } = this;

    ctx.save();
    if (this.shakeT > 0) {
      const k = this.shakeT / 0.32;
      ctx.translate((Math.random() - 0.5) * this.shakeMag * k, (Math.random() - 0.5) * this.shakeMag * k);
    }
    // Camera push-in toward the eye during the hero beat.
    if (this._heroT > 0 && this._zoomAmt > 0) {
      const k = this._heroT / this._heroDur; // 1 at impact → 0
      const zoom = 1 + this._zoomAmt * k;
      ctx.translate(this._eye.x, this._eye.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-this._eye.x, -this._eye.y);
    }

    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
    bg.addColorStop(0, "#10384a");
    bg.addColorStop(0.6, "#0c2734");
    bg.addColorStop(1, "#06161e");
    ctx.fillStyle = bg;
    ctx.fillRect(-w * 0.15 - 40, -h * 0.15 - 40, w * 1.3 + 80, h * 1.3 + 80);

    this._drawCaustics(ctx);
    this._drawAmbient(ctx);
    this._drawFish(ctx);
    this._drawDistractions(ctx);
    this._drawArrows(ctx);
    this._drawImpacts(ctx);
    this._drawGlows(ctx);
    this._drawParticles(ctx);
    this._drawPetals(ctx);
    this._drawLotus(ctx);
    this._drawBow(ctx);
    this._vignette(ctx);
    ctx.restore();

    this._drawHero(ctx); // full-screen flash/wash/vignette — outside the zoom
  }

  _drawHero(ctx) {
    if (this._heroT <= 0) return;
    const k = this._heroT / this._heroDur; // 1 → 0
    const s = this._heroStrength;
    const W = this.w, H = this.h;
    // A brief white flash at the very moment of impact.
    const flashK = Math.max(0, (this._heroT - (this._heroDur - 0.12)) / 0.12);
    if (flashK > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 250, 235, ${0.5 * s * flashK})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Gold wash over the whole scene.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 200, 90, ${0.16 * s * k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // Warm vignette pulse.
    const v = ctx.createRadialGradient(this.cx, this.cy, Math.min(W, H) * 0.18, this.cx, this.cy, Math.max(W, H) * 0.7);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(110, 60, 0, ${0.42 * s * k})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  _drawGlows(ctx) {
    if (!this.glows.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const g of this.glows) {
      const k = g.age / g.dur;
      const max = g.max || this.fishRadius * 2.4;
      const r = max * (0.2 + k * 0.8);
      const a = (1 - k) * 0.7;
      const rg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
      rg.addColorStop(0, `rgba(255, 242, 205, ${a})`);
      rg.addColorStop(0.45, `rgba(255, 200, 90, ${a * 0.45})`);
      rg.addColorStop(1, "rgba(255, 200, 90, 0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawPetals(ctx) {
    for (const p of this.petals) {
      const k = p.age / p.life;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // A sacred lotus (padma): layered rings of pointed petals opening from a
  // golden centre. Pink/white outer petals, gold inner, drawn procedurally.
  _drawLotus(ctx) {
    if (!this.lotus) return;
    const age = this.lotus.age, dur = this.lotus.dur;
    const open = Math.min(1, age / 0.8);                    // opens over 0.8s
    const ease = 1 - Math.pow(1 - open, 3);                 // easeOutCubic
    const fade = age < dur * 0.7 ? 1 : Math.max(0, 1 - (age - dur * 0.7) / (dur * 0.3));
    const base = Math.min(this.w, this.h) * 0.2;
    const rings = [
      { count: 8, len: 1.0, wid: 0.34, col: "#f7c9da", off: 0 },
      { count: 8, len: 0.82, wid: 0.3, col: "#fde3ee", off: Math.PI / 8 },
      { count: 7, len: 0.6, wid: 0.28, col: "#ffd98a", off: Math.PI / 7 },
    ];
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.globalAlpha = fade;
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const a = ring.off + (i / ring.count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        const len = base * ring.len * (0.3 + 0.7 * ease);
        const wid = base * ring.wid * (0.45 + 0.55 * ease);
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.12);
        ctx.quadraticCurveTo(wid, -len * 0.55, 0, -len);    // out to the tip
        ctx.quadraticCurveTo(-wid, -len * 0.55, 0, -len * 0.12);
        ctx.closePath();
        ctx.fillStyle = ring.col;
        ctx.fill();
        ctx.strokeStyle = "rgba(180, 90, 120, 0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
    // golden seed-pod centre
    const cr = base * 0.2 * (0.4 + 0.6 * ease);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
    cg.addColorStop(0, "#ffe6a0");
    cg.addColorStop(1, "#d98e3a");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawBow(ctx) {
    const drawing = this.bow.drawing;
    const p = drawing ? this.bow.power : 0;
    if (!drawing) return;
    const bx = this.cx, by = this.h - 6;
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.3 * p;
    ctx.strokeStyle = "rgba(225, 210, 175, 0.9)";
    ctx.lineWidth = 2;
    const pull = 6 + p * 20;
    ctx.beginPath();
    ctx.moveTo(bx - 46, by);
    ctx.quadraticCurveTo(bx, by + pull, bx + 46, by);
    ctx.stroke();
    ctx.restore();
  }

  _drawCaustics(ctx) {
    // Slow drifting light bands for a watery shimmer. Cheap, very low alpha.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const phase = this.t * (0.08 + i * 0.04) + i * 2.2;
      const x = this.cx + Math.cos(phase) * this.w * 0.32;
      const y = this.cy + Math.sin(phase * 0.8) * this.h * 0.3;
      const rad = Math.min(this.w, this.h) * (0.28 + i * 0.06);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(120, 200, 220, 0.06)");
      g.addColorStop(1, "rgba(120, 200, 220, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.restore();
  }

  _drawAmbient(ctx) {
    const { cx, cy } = this;
    const maxR = Math.min(this.w, this.h) * 0.55;
    ctx.save();
    ctx.lineWidth = 1.5;
    for (const r of this.ambientRings) {
      const rad = r.r * maxR;
      const alpha = Math.max(0, 0.12 * (1 - r.r / 1.4));
      ctx.strokeStyle = `rgba(150, 220, 235, ${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawFish(ctx) {
    const eye = this._eye;
    const R = this.fishRadius;
    const facing = this.theta + Math.PI / 2;
    const clarity = this.clarity();

    const bx = eye.x - Math.cos(facing) * R * 0.5;
    const by = eye.y - Math.sin(facing) * R * 0.5;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(facing);

    const bodyAlpha = 0.85 * (0.35 + 0.65 * clarity);

    ctx.beginPath();
    ctx.moveTo(-R * 0.9, 0);
    ctx.lineTo(-R * 1.5, -R * 0.5);
    ctx.lineTo(-R * 1.3, 0);
    ctx.lineTo(-R * 1.5, R * 0.5);
    ctx.closePath();
    ctx.fillStyle = `rgba(60, 120, 140, ${bodyAlpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, R, R * 0.5, 0, 0, Math.PI * 2);
    const grad = ctx.createLinearGradient(-R, 0, R, 0);
    grad.addColorStop(0, `rgba(40, 96, 116, ${bodyAlpha})`);
    grad.addColorStop(1, `rgba(90, 160, 180, ${bodyAlpha})`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    this._drawEye(ctx, eye.x, eye.y, R, clarity);
  }

  _drawEye(ctx, x, y, R, clarity) {
    const irisR = R * 0.22;
    const pupilR = R * 0.10;

    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * clarity;
    ctx.beginPath();
    ctx.arc(x, y, irisR, 0, Math.PI * 2);
    ctx.fillStyle = "#f3f7f4";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, irisR, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, R * 0.05);
    ctx.strokeStyle = `rgba(255, 207, 107, ${0.5 + 0.5 * clarity})`;
    ctx.stroke();

    ctx.globalAlpha = 0.55 + 0.45 * clarity;
    ctx.beginPath();
    ctx.arc(x, y, pupilR, 0, Math.PI * 2);
    ctx.fillStyle = "#0a1418";
    ctx.fill();

    ctx.globalAlpha = clarity;
    ctx.beginPath();
    ctx.arc(x - pupilR * 0.3, y - pupilR * 0.3, pupilR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    if (clarity > 0.4) {
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 5);
      ctx.globalAlpha = 0.25 * clarity * pulse;
      ctx.beginPath();
      ctx.arc(x, y, irisR * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffcf6b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.highContrast) {
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, irisR * 1.12, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2.5, R * 0.06);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, pupilR * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDistractions(ctx) {
    ctx.save();
    for (const d of this.distractions) {
      const fade = Math.min(1, d.life / 2) * 0.8;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.globalAlpha = fade;
      switch (d.kind) {
        case "cloud":
          ctx.fillStyle = "rgba(180, 205, 215, 0.5)";
          this._blob(ctx, d.size);
          break;
        case "glare": {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size);
          g.addColorStop(0, "rgba(255, 240, 200, 0.55)");
          g.addColorStop(1, "rgba(255, 240, 200, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, d.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "leaf":
          ctx.fillStyle = "rgba(120, 170, 110, 0.7)";
          ctx.beginPath();
          ctx.ellipse(0, 0, d.size * 0.5, d.size * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "bird":
          ctx.strokeStyle = "rgba(230, 240, 245, 0.7)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-d.size * 0.4, 0);
          ctx.quadraticCurveTo(0, -d.size * 0.3, 0, 0);
          ctx.quadraticCurveTo(0, -d.size * 0.3, d.size * 0.4, 0);
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  _blob(ctx, s) {
    ctx.beginPath();
    ctx.arc(-s * 0.3, 0, s * 0.4, 0, Math.PI * 2);
    ctx.arc(0, -s * 0.15, s * 0.5, 0, Math.PI * 2);
    ctx.arc(s * 0.35, 0, s * 0.38, 0, Math.PI * 2);
    ctx.arc(0, s * 0.1, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawArrows(ctx) {
    ctx.save();
    for (const a of this.arrows) {
      // Trail
      for (let i = 0; i < a.trail.length - 1; i++) {
        const p = a.trail[i];
        const q = a.trail[i + 1];
        const alpha = (i / a.trail.length) * 0.5;
        ctx.strokeStyle = `rgba(255, 230, 170, ${alpha})`;
        ctx.lineWidth = 1 + (i / a.trail.length) * 2.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      // Arrowhead, oriented along velocity
      const prev = a.trail[a.trail.length - 2] || { x: a.x0, y: a.y0 };
      const ang = Math.atan2(a.y - prev.y, a.x - prev.x);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(ang);
      ctx.fillStyle = "#ffe8a8";
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-6, -3.5);
      ctx.lineTo(-6, 3.5);
      ctx.closePath();
      ctx.fill();
      // shaft
      ctx.strokeStyle = "rgba(255, 220, 150, 0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-20, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  _drawImpacts(ctx) {
    ctx.save();
    for (const im of this.impacts) {
      const k = im.age / im.dur;
      const r = 6 + k * (im.max || this.fishRadius * 0.9);
      ctx.globalAlpha = (1 - k) * 0.85;
      ctx.strokeStyle = im.color;
      ctx.lineWidth = (im.shock ? 6 : 3) * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(im.x, im.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const k = p.age / p.life;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _vignette(ctx) {
    const { w, h } = this;
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
