// DOM glue: switching screens, HUD updates, toasts, focus meter, combo badge,
// star ratings, and leaderboard. All element lookups live here.

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.screens = {
      title: $("screen-title"),
      how: $("screen-how"),
      level: $("screen-level"),
      over: $("screen-over"),
      board: $("screen-board"),
    };
    this.hud = $("hud");
    this.focusWrap = $("focus-wrap");
    this.focusFill = $("focus-fill");
    this.toast = $("toast");
    this.comboBadge = $("combo-badge");
    this.el = {
      level: $("hud-level"),
      score: $("hud-score"),
      arrows: $("hud-arrows"),
      mute: $("mute-btn"),
      levelTitle: $("level-title"),
      levelStars: $("level-stars"),
      levelSummary: $("level-summary"),
      overTitle: $("over-title"),
      overScore: $("over-score"),
      overSub: $("over-sub"),
      initials: $("initials"),
      boardList: $("board-list"),
      boardEmpty: $("board-empty"),
    };
    this._toastTimer = null;
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
    if (!on) { this.comboBadge.classList.add("hidden"); this._lastCombo = 0; }
  }

  setHud({ level, score, arrows, arrowsUsed, combo }) {
    if (level != null) this.el.level.textContent = level;
    if (score != null) this.el.score.textContent = score;
    if (arrows != null) {
      const left = arrows - (arrowsUsed || 0);
      this.el.arrows.textContent = "●".repeat(Math.max(0, left)) + "○".repeat(Math.max(0, arrowsUsed || 0));
    }
    if (combo != null) this._setCombo(combo);
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

  showLevelComplete({ name, score, stars, nextName, calibration }) {
    this.el.levelTitle.textContent = calibration ? "Calibration complete" : `${name} — cleared`;
    if (calibration || stars < 0) {
      this.el.levelStars.innerHTML = `<span class="on">◉</span>`;
    } else {
      this.el.levelStars.innerHTML = [0, 1, 2]
        .map((i) => `<span class="${i < stars ? "on" : "off"}">★</span>`)
        .join("");
    }
    this.el.levelSummary.textContent = calibration
      ? `Now — see only the eye. Next: ${nextName}.`
      : `Score ${score}. Next: ${nextName}.`;
    this.show("level");
  }

  showGameOver({ score, level, bestCombo, daily, dailyKey }) {
    this.el.overTitle.textContent = daily ? `Daily Challenge · ${dailyKey}` : (score > 0 ? "The run ends" : "No marks found");
    this.el.overScore.textContent = score;
    this.el.overSub.textContent = `Reached level ${level}  ·  best combo ×${bestCombo}`;
    this.el.initials.value = "";
    this.show("over");
    setTimeout(() => this.el.initials.focus(), 50);
  }

  renderBoard(entries, youTs) {
    const list = this.el.boardList;
    list.innerHTML = "";
    this.el.boardEmpty.classList.toggle("hidden", entries.length > 0);
    entries.forEach((e, i) => {
      const li = document.createElement("li");
      if (i === 0) li.classList.add("top1");
      if (youTs && e.ts === youTs) li.classList.add("you");
      li.innerHTML =
        `<span class="rank">${i + 1}</span>` +
        `<span class="name">${e.name}</span>` +
        `<span class="pts">${e.score.toLocaleString()}</span>`;
      list.appendChild(li);
    });
    this.show("board");
  }

  setMuted(muted) { this.el.mute.textContent = muted ? "🔇" : "🔊"; }
}
