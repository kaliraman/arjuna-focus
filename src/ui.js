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
    this.levelIntro = $("level-intro");
    this.toast = $("toast");
    this.wordBloomEl = $("word-bloom");
    this.nextBar = $("next-bar");
    this.el = {
      level: $("hud-level"),
      score: $("hud-score"),
      objectivePips: $("objective-pips"),
      introLabel: $("level-intro-label"),
      introName: $("level-intro-name"),
      sound: $("btn-menu-sound"),
      motion: $("btn-menu-motion"),
      contrast: $("btn-menu-contrast"),
      nextSummary: $("next-summary"),
      finaleSub: $("finale-sub"),
    };
    this._toastTimer = null;
    this._introTimer = null;
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
      this.nextBar.classList.add("hidden");
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

  showLevelIntro({ label, name, calibration }) {
    this.el.introLabel.textContent = calibration ? t("warmup") : `${t("hud_level")} ${label}`;
    this.el.introName.textContent = calibration ? t("findEye") : name;
    const c = this.levelIntro;
    c.classList.remove("hidden", "show");
    void c.offsetWidth;
    c.classList.add("show");
    clearTimeout(this._introTimer);
    this._introTimer = setTimeout(() => c.classList.add("hidden"), 1900);
  }

  // Non-blocking level clear: a bottom bar; the scene + lotus stay visible.
  showCleared({ total, calibration }) {
    this.objective.classList.add("hidden");
    this.el.nextSummary.textContent = calibration
      ? t("warmupDone")
      : `${t("levelComplete")} · ${t("hud_score")} ${total.toLocaleString()}`;
    this.nextBar.classList.remove("hidden");
  }
  hideCleared() { this.nextBar.classList.add("hidden"); }

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
