// DOM glue: screens, HUD (level label, goal bar, arrow icons), toasts, focus
// meter, combo badge, star ratings, level-intro card, and the finale.

const $ = (id) => document.getElementById(id);

// Small upward arrowhead icon (head + shaft) for the "arrows remaining" HUD.
function arrowIcon(remaining) {
  return (
    `<svg class="ai ${remaining ? "on" : "off"}" viewBox="0 0 16 16" width="11" height="14" aria-hidden="true">` +
    `<line x1="8" y1="15" x2="8" y2="7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M8 1 L12.5 8 L3.5 8 Z" fill="currentColor"/></svg>`
  );
}

export class UI {
  constructor() {
    this.screens = {
      title: $("screen-title"),
      how: $("screen-how"),
      legend: $("screen-legend"),
      menu: $("screen-menu"),
      level: $("screen-level"),
      fail: $("screen-fail"),
      finale: $("screen-finale"),
    };
    this.hud = $("hud");
    this.focusWrap = $("focus-wrap");
    this.focusFill = $("focus-fill");
    this.goalWrap = $("goal-wrap");
    this.levelIntro = $("level-intro");
    this.toast = $("toast");
    this.comboBadge = $("combo-badge");
    this.notches = [...document.querySelectorAll("#goal-wrap .goal-notch")];
    this.el = {
      level: $("hud-level"),
      arrows: $("hud-arrows"),
      goalFill: $("goal-fill"),
      introLabel: $("level-intro-label"),
      introName: $("level-intro-name"),
      sound: $("btn-menu-sound"),
      levelTitle: $("level-title"),
      levelStars: $("level-stars"),
      levelSummary: $("level-summary"),
      failSub: $("fail-sub"),
      finaleStars: $("finale-stars"),
      finaleSub: $("finale-sub"),
    };
    this._toastTimer = null;
    this._introTimer = null;
    this._lastCombo = 0;
  }

  show(name) {
    for (const [key, node] of Object.entries(this.screens)) {
      node.classList.toggle("hidden", key !== name);
    }
  }
  hideScreens() { this.show("__none__"); }

  setPlaying(on) {
    this.hud.classList.toggle("hidden", !on);
    this.focusWrap.classList.toggle("hidden", !on);
    if (!on) {
      this.goalWrap.classList.add("hidden");
      this.comboBadge.classList.add("hidden");
      this._lastCombo = 0;
    }
  }

  setHud({ levelLabel, levelScore, target, arrows, arrowsUsed, combo }) {
    if (levelLabel != null) this.el.level.textContent = levelLabel;
    if (levelScore != null && target != null) this._setGoal(levelScore, target);
    if (arrows != null) {
      const used = arrowsUsed || 0;
      let html = "";
      for (let i = 0; i < arrows; i++) html += arrowIcon(i >= used);
      this.el.arrows.innerHTML = html;
    }
    if (combo != null) this._setCombo(combo);
  }

  // Goal bar fills toward 3★ (1.9× target); notches mark ★ / ★★ / ★★★.
  _setGoal(levelScore, target) {
    if (target <= 0) { this.goalWrap.classList.add("hidden"); return; }
    this.goalWrap.classList.remove("hidden");
    const frac = Math.max(0, Math.min(1, levelScore / (target * 1.9)));
    this.el.goalFill.style.width = `${frac * 100}%`;
    const thresholds = [target, target * 1.4, target * 1.9];
    this.notches.forEach((n, i) => n.classList.toggle("lit", levelScore >= thresholds[i]));
    this.goalWrap.classList.toggle("cleared", levelScore >= target);
  }

  _setCombo(combo) {
    if (combo > 1) {
      this.comboBadge.textContent = `×${combo}`;
      this.comboBadge.classList.remove("hidden");
      if (combo > this._lastCombo) {
        this.comboBadge.classList.remove("bump");
        void this.comboBadge.offsetWidth;
        this.comboBadge.classList.add("bump");
      }
    } else {
      this.comboBadge.classList.add("hidden");
    }
    this._lastCombo = combo;
  }

  setFocus(v) { this.focusFill.style.width = `${Math.round(v * 100)}%`; }

  toastMsg(text, color) {
    const t = this.toast;
    t.textContent = text;
    t.style.color = color || "var(--accent)";
    t.classList.remove("hidden", "show");
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add("hidden"), 900);
  }

  // Brief title card at the start of each level.
  showLevelIntro({ label, name, calibration }) {
    this.el.introLabel.textContent = calibration ? "Warm-up" : `Level ${label}`;
    this.el.introName.textContent = calibration ? "Find the eye — and nothing else" : name;
    const c = this.levelIntro;
    c.classList.remove("hidden", "show");
    void c.offsetWidth;
    c.classList.add("show");
    clearTimeout(this._introTimer);
    this._introTimer = setTimeout(() => c.classList.add("hidden"), 1900);
  }

  _starsHTML(stars) {
    return [0, 1, 2].map((i) => `<span class="${i < stars ? "on" : "off"}">★</span>`).join("");
  }

  showLevelComplete({ total, stars, calibration }) {
    this.el.levelTitle.textContent = calibration ? "Warm-up done" : "Level complete";
    this.el.levelStars.innerHTML = calibration || stars < 0
      ? `<span class="on">◉</span>`
      : this._starsHTML(stars);
    this.el.levelSummary.textContent = calibration ? "Now — see only the eye." : `Total ${total}`;
    this.show("level");
  }

  showFinale({ total, stars }) {
    this.el.finaleStars.innerHTML = this._starsHTML(stars);
    this.el.finaleSub.textContent = `Final score ${total}`;
    this.show("finale");
  }

  showFail({ levelScore, target }) {
    this.el.failSub.textContent = `You scored ${levelScore} — you needed ${target}.`;
    this.show("fail");
  }

  setMuted(muted) { this.el.sound.textContent = muted ? "Sound: off" : "Sound: on"; }
}
