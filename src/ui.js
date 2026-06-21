// DOM glue: screens, HUD, toasts, the level-intro card, the non-blocking
// "cleared" bar, and the finale. Text comes through the i18n layer.

import { t } from "./strings.js";

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = {
      title: $("screen-title"),
      how: $("screen-how"),
      legend: $("screen-legend"),
      menu: $("screen-menu"),
      finale: $("screen-finale"),
    };
    this.hud = $("hud");
    this.objective = $("objective");
    this.levelName = $("level-name");
    this.toast = $("toast");
    this.wordBloomEl = $("word-bloom");
    this.nextArrow = $("btn-next");
    this.el = {
      level: $("hud-level"),
      score: $("hud-score"),
      objectivePips: $("objective-pips"),
      sound: $("btn-menu-sound"),
      motion: $("btn-menu-motion"),
      contrast: $("btn-menu-contrast"),
      finaleSub: $("finale-sub"),
    };
    this._toastTimer = null;
    this._wordTimer = null;
  }

  show(name) {
    for (const [key, node] of Object.entries(this.screens)) {
      node.classList.toggle("hidden", key !== name);
    }
  }
  hideScreens() { this.show("__none__"); }

  setPlaying(on) {
    this.hud.classList.toggle("hidden", !on);
    if (!on) {
      this.objective.classList.add("hidden");
      this.nextArrow.classList.add("hidden");
    }
  }

  setHud({ levelLabel, score, eyeHits, eyeGoal }) {
    if (levelLabel != null) this.el.level.textContent = levelLabel;
    if (score != null) this.el.score.textContent = score.toLocaleString();
    if (eyeGoal != null) {
      this.objective.classList.remove("hidden");
      const got = eyeHits || 0;
      let html = "";
      for (let i = 0; i < eyeGoal; i++) html += `<span class="pip ${i < got ? "on" : ""}"></span>`;
      this.el.objectivePips.innerHTML = html;
    }
  }

  toastMsg(text, color) {
    const el = this.toast;
    el.textContent = text;
    el.style.color = color || "var(--accent)";
    el.classList.remove("hidden", "show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add("hidden"), 900);
  }

  // Persistent level name, top-center (with a small entrance animation).
  setLevelName(name) {
    const el = this.levelName;
    el.textContent = name;
    el.classList.remove("hidden", "show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  // Non-blocking level clear: the scene + lotus stay visible; a pulsing arrow
  // at the right edge advances.
  showCleared() {
    this.objective.classList.add("hidden");
    this.nextArrow.classList.remove("hidden");
  }
  hideCleared() { this.nextArrow.classList.add("hidden"); }

  showFinale({ total }) {
    this.el.finaleSub.textContent = `${t("finalScore")} ${total.toLocaleString()}`;
    this.show("finale");
  }

  wordBloom(text) {
    const el = this.wordBloomEl;
    el.textContent = text;
    el.classList.remove("hidden", "show");
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(this._wordTimer);
    this._wordTimer = setTimeout(() => el.classList.add("hidden"), 900);
  }

  setMuted(muted) { this.el.sound.textContent = muted ? t("soundOff") : t("soundOn"); }
  setReduceMotion(on) { this.el.motion.textContent = on ? t("motionReduced") : t("motionFull"); }
  setContrast(on) { this.el.contrast.textContent = on ? t("contrastOn") : t("contrastOff"); }
}
