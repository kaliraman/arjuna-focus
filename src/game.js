// Game controller: owns run state (score, level, arrows, combo), the Focus
// meter, and the rules for advancing or ending a run. Coordinates Scene, UI,
// Audio, and the Leaderboard. main.js drives the render loop and forwards input.

import { getLevel, LEVEL_COUNT } from "./levels.js";
import { scoreShot, starsFor } from "./scoring.js";
import { mulberry32, hashStr, todayKey } from "./util.js";

const STEADY_SPEED = 70;
const FOCUS_UP = 0.55;
const FOCUS_DOWN = 1.1;

export class Game {
  constructor({ scene, ui, audio, input, leaderboard }) {
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.input = input;
    this.leaderboard = leaderboard;

    this.state = "title";
    this.score = 0;
    this.levelIndex = 0;
    this.levelScore = 0;
    this.arrowsUsed = 0;
    this.focus = 0;
    this.combo = 0;          // consecutive scoring hits (across the whole run)
    this.bestCombo = 0;
    this.arrowReadyAt = 0;
    this.daily = false;
    this.dailyKey = null;
    this.lastSavedTs = null;
    this._ending = false;
  }

  // ---- run lifecycle --------------------------------------------------------
  newGame() {
    this.daily = false;
    this.dailyKey = null;
    this.scene.setRng(Math.random);
    this._startRun();
  }

  startDaily() {
    this.daily = true;
    this.dailyKey = todayKey();
    this.scene.setRng(mulberry32(hashStr(this.dailyKey)));
    this._startRun();
  }

  _startRun() {
    this.score = 0;
    this.levelIndex = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.startLevel();
  }

  startLevel() {
    const cfg = getLevel(this.levelIndex);
    this.cfg = cfg;
    this.scene.setConfig(cfg);
    this.scene.resetLevel();
    this.levelScore = 0;
    this.arrowsUsed = 0;
    this.focus = 0;
    this.scene.focus = 0;
    this.arrowReadyAt = performance.now();
    this._ending = false;

    this.state = "playing";
    this.ui.hideScreens();
    this.ui.setPlaying(true);
    this.ui.setHud({
      level: this.levelIndex + 1,
      levelName: cfg.name,
      score: this.score,
      arrows: cfg.arrows,
      arrowsUsed: 0,
      combo: this.combo,
    });
    this.ui.setFocus(0);
    this.input.setActive(true);

    if (cfg.calibration) {
      this.ui.toastMsg("Find the eye — and nothing else", "#9fb6bd");
    }
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt) {
    if (this.state !== "playing") return;
    const steady = this.input.has && this.input.speed < STEADY_SPEED;
    this.focus += (steady ? FOCUS_UP : -FOCUS_DOWN) * dt;
    this.focus = Math.max(0, Math.min(1, this.focus));
    this.scene.focus = this.focus;
    this.ui.setFocus(this.focus);
    this.scene.update(dt);
  }

  // ---- firing ---------------------------------------------------------------
  fire(pos) {
    if (this.state !== "playing") return;
    if (this.arrowsUsed >= this.cfg.arrows) return; // out of shots

    const eye = this.scene.getEye();
    const dist = Math.hypot(pos.x - eye.x, pos.y - eye.y);
    const reactionMs = performance.now() - this.arrowReadyAt;

    // Score is locked in at the instant of release (eye position now).
    const result = scoreShot({
      dist,
      fishRadius: this.scene.getFishRadius(),
      reactionMs,
      focus: this.focus,
      level: this.levelIndex,
      combo: this.combo,
    });

    this.arrowsUsed += 1;
    this.focus *= 0.45;
    this.arrowReadyAt = performance.now();
    this.ui.setHud({ arrows: this.cfg.arrows, arrowsUsed: this.arrowsUsed });

    // No projectile — the shot lands instantly at the aim point.
    this._resolveHit(pos, result);
  }

  _resolveHit(pos, result) {
    const eye = this.scene.getEye();
    this.score += result.points;
    this.levelScore += result.points;

    if (result.points > 0) {
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    } else {
      this.combo = 0;
    }

    // Visuals + sound, scaled by how good the hit was.
    this.scene.addImpact(pos.x, pos.y, result.ring.color);
    if (result.ring.bull) {
      this.scene.addImpact(eye.x, eye.y, result.ring.color);
      this.scene.burst(eye.x, eye.y, result.ring.color, 22, 1.3);
      this.scene.shake(result.ring.key === "perfect" ? 14 : 10);
      this.audio.bullseye();
    } else if (result.points > 0) {
      this.scene.burst(pos.x, pos.y, result.ring.color, 10, 0.8);
      this.scene.shake(4);
      this.audio.hit();
    } else {
      this.scene.burst(pos.x, pos.y, "#6699aa", 6, 0.5);
      this.audio.miss();
    }

    const comboTag = this.combo > 1 && result.points > 0 ? `  ×${this.combo}` : "";
    if (result.ring.bull) this.ui.toastMsg(`${result.ring.label} +${result.points}${comboTag}`, result.ring.color);
    else if (result.points > 0) this.ui.toastMsg(`${result.ring.label} +${result.points}${comboTag}`, result.ring.color);
    else this.ui.toastMsg("Missed — let go of the rest", "#ff7a7a");

    this.ui.setHud({ score: this.score, combo: this.combo });

    // End the level once the last shot is taken.
    if (this.arrowsUsed >= this.cfg.arrows && !this._ending) {
      this._ending = true;
      this.input.setActive(false);
      setTimeout(() => this._endLevel(), 450);
    }
  }

  _endLevel() {
    const passed = this.cfg.calibration || this.levelScore >= this.cfg.target;
    const stars = this.cfg.calibration ? -1 : starsFor(this.levelScore, this.cfg.target);

    if (passed) {
      this.state = "levelcomplete";
      this.ui.setPlaying(false);
      this.audio.levelUp();
      this.ui.showLevelComplete({
        name: this.cfg.name,
        score: this.levelScore,
        stars,
        nextName: getLevel(this.levelIndex + 1).name,
        calibration: !!this.cfg.calibration,
      });
    } else {
      this._gameOver();
    }
  }

  nextLevel() {
    this.levelIndex += 1;
    this.startLevel();
  }

  _gameOver() {
    this.state = "gameover";
    this.input.setActive(false);
    this.ui.setPlaying(false);
    this.audio.gameOver();
    this.ui.showGameOver({
      score: this.score,
      level: this.levelIndex + 1,
      bestCombo: this.bestCombo,
      daily: this.daily,
      dailyKey: this.dailyKey,
    });
  }

  // ---- pause / navigation ---------------------------------------------------
  openMenu() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.setActive(false);
    this.ui.show("menu");
  }

  resume() {
    if (this.state !== "paused") return;
    this.ui.hideScreens();
    this.ui.setPlaying(true);
    this.input.setActive(true);
    this.state = "playing";
  }

  toTitle() {
    this.state = "title";
    this.input.setActive(false);
    this.ui.setPlaying(false);
    this.ui.show("title");
  }

  // ---- leaderboard ----------------------------------------------------------
  async saveScore(name) {
    const res = await this.leaderboard.submitScore(name, this.score);
    this.lastSavedTs = res.entry.ts;
    return res;
  }

  async showBoard() {
    const entries = await this.leaderboard.getTopScores(10);
    this.state = "board";
    this.ui.renderBoard(entries, this.lastSavedTs);
  }

  // Snapshot for the shareable score card.
  shareData() {
    return {
      score: this.score,
      level: this.levelIndex + 1,
      bestCombo: this.bestCombo,
      daily: this.daily,
      dailyKey: this.dailyKey,
    };
  }
}

export { LEVEL_COUNT };
