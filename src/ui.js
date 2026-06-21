// DOM glue: screens, HUD (level, cumulative score, eye-strike objective),
// toasts, the level-intro card, and the finale. All lookups live here.

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = {
      title: $("screen-title"),
      how: $("screen-how"),
      legend: $("screen-legend"),
      menu: $("screen-menu"),
      level: $("screen-level"),
      finale: $("screen-finale"),
    };
    this.hud = $("hud");
    this.objective = $("objective");
    this.levelIntro = $("level-intro");
    this.toast = $("toast");
    this.el = {
      level: $("hud-level"),
      score: $("hud-score"),
      objectivePips: $("objective-pips"),
      introLabel: $("level-intro-label"),
      introName: $("level-intro-name"),
      sound: $("btn-menu-sound"),
      levelTitle: $("level-title"),
      levelSummary: $("level-summary"),
      finaleSub: $("finale-sub"),
    };
    this._toastTimer = null;
    this._introTimer = null;
  }

  show(name) {
    for (const [key, node] of Object.entries(this.screens)) {
      node.classList.toggle("hidden", key !== name);
    }
  }
  hideScreens() { this.show("__none__"); }

  setPlaying(on) {
    this.hud.classList.toggle("hidden", !on);
    if (!on) this.objective.classList.add("hidden");
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

  showLevelComplete({ total, calibration }) {
    this.el.levelTitle.textContent = calibration ? "Warm-up done" : "Level complete";
    this.el.levelSummary.textContent = calibration ? "Now — see only the eye." : `Score ${total.toLocaleString()}`;
    this.show("level");
  }

  showFinale({ total }) {
    this.el.finaleSub.textContent = `Final score ${total.toLocaleString()}`;
    this.show("finale");
  }

  setMuted(muted) { this.el.sound.textContent = muted ? "Sound: off" : "Sound: on"; }
}
