// Unified pointer/touch input. Tracks the reticle position and reports a "fire"
// when the player clicks/taps. Also measures how still the pointer is held, so
// game.js can build the Focus meter (steadiness = focus).

export class Input {
  constructor(canvas, { onFire, onDraw }) {
    this.canvas = canvas;
    this.onFire = onFire;
    this.onDraw = onDraw;
    this.x = 0;
    this.y = 0;
    this.has = false;       // do we have a real pointer position yet
    this.active = false;    // accepting input (only while playing)
    this.lastMove = { x: 0, y: 0 };
    this.speed = 0;         // px/sec of pointer travel (smoothed) -> steadiness

    this._down = null;      // pointer-down position, to detect tap-vs-drag
    this._lastT = 0;

    this._bind();
  }

  setActive(on) {
    this.active = on;
    if (!on) { this.speed = 0; }
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bind() {
    const c = this.canvas;

    const move = (e) => {
      if (!this.active) return;
      const p = this._pos(e);
      const now = performance.now();
      const dt = Math.max(1, now - (this._lastT || now)) / 1000;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (this.has) {
        const inst = Math.hypot(dx, dy) / dt;
        this.speed = this.speed * 0.7 + inst * 0.3; // smoothed
      }
      this.x = p.x;
      this.y = p.y;
      this.has = true;
      this._lastT = now;
    };

    c.addEventListener("pointermove", move, { passive: true });

    c.addEventListener("pointerdown", (e) => {
      if (!this.active) return;
      // Capture helps track drags off-canvas, but must never break firing if it
      // throws (e.g. for synthetic or already-released pointers).
      try { c.setPointerCapture?.(e.pointerId); } catch { /* non-fatal */ }
      move(e);
      this._down = { x: this.x, y: this.y, t: performance.now() };
      this.onDraw?.({ x: this.x, y: this.y });
    });

    c.addEventListener("pointerup", (e) => {
      if (!this.active || !this._down) return;
      move(e);
      // Fire on release at the current reticle position.
      this.onFire({ x: this.x, y: this.y });
      this._down = null;
    });

    c.addEventListener("pointercancel", () => { this._down = null; });

    // Prevent long-press / context menus from interrupting touch play.
    c.addEventListener("contextmenu", (e) => e.preventDefault());
  }
}
