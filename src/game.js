// Game controller: owns run state (score, level, arrows, combo), the Focus
// meter, and the rules for advancing or ending a run. Coordinates Scene, UI,
// Audio, and the Leaderboard. main.js drives the render loop and forwards input.

import { getLevel, LEVEL_COUNT, CHALLENGE_COUNT } from "./levels.js";
import { scoreShot, starsFor } from "./scoring.js";

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
    this.combo = 0;          // consecutive scoring hits (across the whole run)
    this.bestCombo = 0;
    this.inFlight = 0;       // arrows currently in the air
    this._ending = false;
  }

  // ---- run lifecycle --------------------------------------------------------
  newGame() {
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
    this.inFlight = 0;
    this._ending = false;

    this.state = "playing";
    this.ui.hideScreens();
    this.ui.setPlaying(true);
    const label = this._levelLabel();
    this.ui.setHud({
      levelLabel: label,
      levelScore: 0,
      target: cfg.target,
      arrows: cfg.arrows,
      arrowsUsed: 0,
      combo: this.combo,
    });
    this.ui.showLevelIntro({ label, name: cfg.name, calibration: !!cfg.calibration });
    this.input.setActive(true);
  }

  // "Warm-up" for the calibration level, "3 / 8" for numbered levels, "Endless" beyond.
  _levelLabel() {
    if (this.cfg.calibration) return "Warm-up";
    if (this.levelIndex <= CHALLENGE_COUNT) return `${this.levelIndex} / ${CHALLENGE_COUNT}`;
    return "Endless";
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt) {
    if (this.state !== "playing") return;
    this.scene.update(dt);
  }

  // ---- firing ---------------------------------------------------------------
  fire(pos) {
    if (this.state !== "playing") return;
    if (this.arrowsUsed >= this.cfg.arrows) return; // out of shots

    this.arrowsUsed += 1;
    this.inFlight += 1;
    this.ui.setHud({ arrows: this.cfg.arrows, arrowsUsed: this.arrowsUsed });

    // The arrow flies to the chosen point; the shot is judged where it LANDS,
    // against where the eye is at that moment — so you must lead the target.
    this.scene.spawnArrow(pos.x, pos.y, () => this._resolveHit(pos));
  }

  _resolveHit(pos) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const eye = this.scene.getEye();
    const dist = Math.hypot(pos.x - eye.x, pos.y - eye.y);
    const result = scoreShot({
      dist,
      fishRadius: this.scene.getFishRadius(),
      level: this.levelIndex,
      combo: this.combo,
    });
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
    else this.ui.toastMsg("Missed — lead the eye", "#ff7a7a");

    this.ui.setHud({ levelScore: this.levelScore, target: this.cfg.target, combo: this.combo });

    // End the level once every loosed arrow has landed.
    if (this.arrowsUsed >= this.cfg.arrows && this.inFlight === 0 && !this._ending) {
      this._ending = true;
      this.input.setActive(false);
      setTimeout(() => this._endLevel(), 450);
    }
  }

  _endLevel() {
    const passed = this.cfg.calibration || this.levelScore >= this.cfg.target;
    const stars = this.cfg.calibration ? -1 : starsFor(this.levelScore, this.cfg.target);

    if (passed) {
      this.score += this.levelScore;       // commit the cleared level's points
      this.ui.setPlaying(false);
      this.audio.levelUp();
      if (!this.cfg.calibration && this.levelIndex === CHALLENGE_COUNT) {
        this.state = "finale";
        this.ui.showFinale({ total: this.score, stars });
      } else {
        this.state = "levelcomplete";
        this.ui.showLevelComplete({
          total: this.score,
          stars,
          calibration: !!this.cfg.calibration,
        });
      }
    } else {
      this.state = "failed";
      this.ui.setPlaying(false);
      this.audio.gameOver();
      this.ui.showFail({
        name: this.cfg.name,
        levelScore: this.levelScore,
        target: this.cfg.target,
      });
    }
  }

  retryLevel() {
    this.startLevel(); // replay the same level with fresh arrows
  }

  nextLevel() {
    this.levelIndex += 1;
    this.startLevel();
  }

  keepGoing() {
    this.nextLevel(); // continue past the finale into endless levels
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
}

export { LEVEL_COUNT };
