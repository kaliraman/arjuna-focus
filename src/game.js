// Game controller: owns run state (score, level, arrows), the Focus meter, and
// the rules for advancing or ending a run. Coordinates Scene, UI, Audio, and the
// Leaderboard. main.js drives the render loop and forwards input here.

import { getLevel, LEVEL_COUNT } from "./levels.js";
import { scoreShot } from "./scoring.js";

const STEADY_SPEED = 70;   // px/s below which the pointer counts as "still"
const FOCUS_UP = 0.55;     // focus gained per second while steady
const FOCUS_DOWN = 1.1;    // focus lost per second while moving

export class Game {
  constructor({ scene, ui, audio, input, leaderboard }) {
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.input = input;
    this.leaderboard = leaderboard;

    this.state = "title";    // title | how | playing | levelcomplete | gameover | board
    this.score = 0;
    this.levelIndex = 0;
    this.levelScore = 0;
    this.arrowsUsed = 0;
    this.focus = 0;
    this.arrowReadyAt = 0;
    this.lastSavedTs = null;
  }

  // ---- run lifecycle --------------------------------------------------------
  newGame() {
    this.score = 0;
    this.levelIndex = 0;
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

    this.state = "playing";
    this.ui.hideScreens();
    this.ui.setPlaying(true);
    this.ui.setHud({
      level: this.levelIndex + 1,
      score: this.score,
      arrows: cfg.arrows,
      arrowsUsed: 0,
    });
    this.ui.setFocus(0);
    this.input.setActive(true);
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt) {
    if (this.state !== "playing") return;

    // Focus from steadiness of aim.
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

    const eye = this.scene.getEye();
    const dist = Math.hypot(pos.x - eye.x, pos.y - eye.y);
    const reactionMs = performance.now() - this.arrowReadyAt;

    const result = scoreShot({
      dist,
      fishRadius: this.scene.getFishRadius(),
      reactionMs,
      focus: this.focus,
      level: this.levelIndex,
    });

    this.arrowsUsed += 1;
    this.score += result.points;
    this.levelScore += result.points;

    // Feedback
    this.scene.addImpact(pos.x, pos.y, result.ring.color);
    if (result.points > 0) this.scene.addImpact(eye.x, eye.y, result.ring.color);

    if (result.ring.key === "bullseye") {
      this.audio.bullseye();
      this.ui.toastMsg(`BULLSEYE +${result.points}`, "#ffcf6b");
    } else if (result.points > 0) {
      this.audio.hit();
      this.ui.toastMsg(`${result.ring.label} +${result.points}`, result.ring.color);
    } else {
      this.audio.miss();
      this.ui.toastMsg("Missed", "#ff7a7a");
    }

    // Focus is partly spent on release — you must re-settle for the next shot.
    this.focus *= 0.45;
    this.arrowReadyAt = performance.now();

    this.ui.setHud({
      score: this.score,
      arrows: this.cfg.arrows,
      arrowsUsed: this.arrowsUsed,
    });

    if (this.arrowsUsed >= this.cfg.arrows) {
      this._endLevel();
    }
  }

  _endLevel() {
    this.input.setActive(false);
    const passed = this.levelScore >= this.cfg.target;

    if (passed) {
      this.state = "levelcomplete";
      this.ui.setPlaying(false);
      const nextName = getLevel(this.levelIndex + 1).name;
      setTimeout(() => {
        this.audio.levelUp();
        this.ui.showLevelComplete({
          name: this.cfg.name,
          score: this.levelScore,
          nextName,
        });
      }, 650);
    } else {
      setTimeout(() => this._gameOver(), 650);
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
    this.ui.showGameOver(this.score);
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
}

export { LEVEL_COUNT };
