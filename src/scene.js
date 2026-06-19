// Scene: draws the reflecting pool, the rotating fish + its eye, ripple
// distortion, drifting distractions, impact splashes, particles, screen shake,
// and a subtle water-caustics shimmer. Purely procedural.
//
// The fish orbits the pool's center, so its eye literally sweeps a circle —
// the "motion" axis is this orbital speed. Ripple jitters the eye; Focus calms
// it. At high levels the eye is veiled and only shows in brief clarity windows.

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
    this.focus = 0;
    this.rng = Math.random;  // swapped to a seeded RNG for the Daily Challenge

    this.distractions = [];
    this.impacts = [];       // expanding hit rings
    this.particles = [];     // impact sparks
    this.ambientRings = [];
    this.shakeMag = 0;
    this.shakeT = 0;

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
    this.particles = [];
    this.shakeMag = 0;
    this.shakeT = 0;
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
    this.t += dt;
    this.theta += this.cfg.motion * dt;

    const calm = 1 - this.focus * 0.85;
    const amp = this.cfg.ripple * 7 * calm;
    const rx = Math.sin(this.t * 3.1 + this.theta * 2) * amp;
    const ry = Math.cos(this.t * 2.3 + this.theta * 1.5) * amp;
    const head = this.theta + Math.PI / 2;
    this._eye.x = this.cx + Math.cos(this.theta) * this.orbitR + Math.cos(head) * this.fishRadius * 0.5 + rx;
    this._eye.y = this.cy + Math.sin(this.theta) * this.orbitR + Math.sin(head) * this.fishRadius * 0.5 + ry;

    for (const r of this.ambientRings) {
      r.r += r.speed * dt * (0.4 + this.cfg.ripple * 0.3);
      if (r.r > 1.4) r.r = 0;
    }

    const targetCount = Math.round(this.cfg.distraction * 22);
    while (this.distractions.length < targetCount) this.distractions.push(this._spawn());
    for (const d of this.distractions) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      d.rot += d.vr * dt;
    }
    this.distractions = this.distractions.filter(
      (d) => d.life > 0 && d.x > -120 && d.x < this.w + 120 && d.y > -120 && d.y < this.h + 120
    );

    // Particles
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt; // light gravity
      p.vx *= 0.98;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    for (const im of this.impacts) im.age += dt;
    this.impacts = this.impacts.filter((im) => im.age < im.dur);

    if (this.shakeT > 0) this.shakeT -= dt;
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
  addImpact(x, y, color) {
    this.impacts.push({ x, y, age: 0, dur: 0.6, color });
  }

  burst(x, y, color, count = 14, power = 1) {
    for (let i = 0; i < count; i++) {
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

  shake(mag) { this.shakeMag = mag; this.shakeT = 0.32; }

  // ---- render ---------------------------------------------------------------
  render(ctx) {
    const { w, h, cx, cy } = this;

    ctx.save();
    if (this.shakeT > 0) {
      const k = this.shakeT / 0.32;
      const ox = (Math.random() - 0.5) * this.shakeMag * k;
      const oy = (Math.random() - 0.5) * this.shakeMag * k;
      ctx.translate(ox, oy);
    }

    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.7);
    bg.addColorStop(0, "#10384a");
    bg.addColorStop(0.6, "#0c2734");
    bg.addColorStop(1, "#06161e");
    ctx.fillStyle = bg;
    ctx.fillRect(-40, -40, w + 80, h + 80);

    this._drawCaustics(ctx);
    this._drawAmbient(ctx);
    this._drawFish(ctx);
    this._drawDistractions(ctx);
    this._drawImpacts(ctx);
    this._drawParticles(ctx);
    this._vignette(ctx);
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

  _drawImpacts(ctx) {
    ctx.save();
    for (const im of this.impacts) {
      const k = im.age / im.dur;
      const r = 6 + k * this.fishRadius * 0.9;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = im.color;
      ctx.lineWidth = 3 * (1 - k) + 0.5;
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
