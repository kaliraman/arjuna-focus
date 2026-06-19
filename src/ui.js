// DOM glue: switching screens, HUD updates, toasts, focus meter, leaderboard.
// Keeps all element lookups in one place so the rest of the code stays clean.

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
    this.el = {
      level: $("hud-level"),
      score: $("hud-score"),
      arrows: $("hud-arrows"),
      mute: $("mute-btn"),
      levelTitle: $("level-title"),
      levelSummary: $("level-summary"),
      overTitle: $("over-title"),
      overScore: $("over-score"),
      initials: $("initials"),
      boardList: $("board-list"),
      boardEmpty: $("board-empty"),
    };
    this._toastTimer = null;
  }

  // Show exactly one overlay screen, or none (during gameplay).
  show(name) {
    for (const [key, node] of Object.entries(this.screens)) {
      node.classList.toggle("hidden", key !== name);
    }
  }
  hideScreens() { this.show("__none__"); }

  setPlaying(on) {
    this.hud.classList.toggle("hidden", !on);
    this.focusWrap.classList.toggle("hidden", !on);
  }

  setHud({ level, score, arrows, arrowsUsed }) {
    if (level != null) this.el.level.textContent = level;
    if (score != null) this.el.score.textContent = score;
    if (arrows != null) {
      const left = arrows - (arrowsUsed || 0);
      this.el.arrows.textContent = "●".repeat(Math.max(0, left)) + "○".repeat(Math.max(0, arrowsUsed || 0));
    }
  }

  setFocus(v) {
    this.focusFill.style.width = `${Math.round(v * 100)}%`;
  }

  toastMsg(text, color) {
    const t = this.toast;
    t.textContent = text;
    t.style.color = color || "var(--accent)";
    t.classList.remove("hidden", "show");
    // force reflow so the animation restarts each time
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add("hidden"), 900);
  }

  showLevelComplete({ name, score, nextName, isFinalKnown }) {
    this.el.levelTitle.textContent = `${name} — cleared`;
    this.el.levelSummary.textContent = nextName
      ? `Score ${score}. Next: ${nextName}.`
      : `Score ${score}.`;
    this.show("level");
  }

  showGameOver(score) {
    this.el.overTitle.textContent = score > 0 ? "The run ends" : "No marks found";
    this.el.overScore.textContent = score;
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

  setMuted(muted) {
    this.el.mute.textContent = muted ? "🔇" : "🔊";
  }
}
