// Game controller: owns run state (one cumulative score, the level, the
// eye-strike objective) and the rules for advancing. Coordinates Scene, UI,
// and Audio. main.js drives the render loop and forwards input.
//
// Model: arrows are unlimited; you advance by striking the eye N times. The
// score is one number that only climbs. No fail, no combo, no targets.

import { getLevel, LEVEL_COUNT, CHALLENGE_COUNT } from "./levels.js";
import { scoreShot } from "./scoring.js";

export class Game {
  constructor({ scene, ui, audio, input }) {
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.input = input;

    this.state = "title";
    this.score = 0;          // one cumulative score for the whole run
    this.levelIndex = 0;
    this.eyeHits = 0;        // eye strikes so far this level
    this._advancing = false;
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
    this.eyeHits = 0;
    this._advancing = false;

    this.state = "playing";
    this.ui.hideScreens();
    this.ui.setPlaying(true);
    const label = this._levelLabel();
    this.ui.setHud({ levelLabel: label, score: this.score, eyeHits: 0, eyeGoal: cfg.eyeHits });
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

  // ---- firing (unlimited arrows) --------------------------------------------
  fire(pos) {
    if (this.state !== "playing") return;
    // The arrow flies to the chosen point; the shot is judged where it LANDS,
    // against where the eye is at that moment — so you must lead the target.
    this.scene.spawnArrow(pos.x, pos.y, () => this._resolveHit(pos));
  }

  _resolveHit(pos) {
    const eye = this.scene.getEye();
    const dist = Math.hypot(pos.x - eye.x, pos.y - eye.y);
    const result = scoreShot({ dist, fishRadius: this.scene.getFishRadius() });

    this.score += result.points;

    // Visuals + sound, scaled by how good the hit was.
    if (result.ring.key === "bullseye") {
      this.scene.addImpact(pos.x, pos.y, result.ring.color);
      this.scene.addImpact(eye.x, eye.y, result.ring.color);
      this.scene.burst(eye.x, eye.y, result.ring.color, 22, 1.3);
      this.scene.shake(12);
      this.audio.bullseye();
    } else if (result.eyeHit) {
      this.scene.addImpact(pos.x, pos.y, result.ring.color);
      this.scene.burst(pos.x, pos.y, result.ring.color, 14, 1.0);
      this.scene.shake(7);
      this.audio.hit();
    } else if (result.points > 0) {
      this.scene.addImpact(pos.x, pos.y, result.ring.color);
      this.scene.burst(pos.x, pos.y, result.ring.color, 8, 0.6);
      this.scene.shake(3);
      this.audio.hit();
    } else {
      this.scene.burst(pos.x, pos.y, "#6699aa", 6, 0.5);
      this.audio.miss();
    }

    if (result.points > 0) this.ui.toastMsg(`${result.ring.label} +${result.points}`, result.ring.color);
    else this.ui.toastMsg("Missed — lead the eye", "#ff7a7a");

    if (result.eyeHit) this.eyeHits += 1;
    this.ui.setHud({ score: this.score, eyeHits: this.eyeHits, eyeGoal: this.cfg.eyeHits });

    // Advance once the eye has been struck enough times.
    if (this.eyeHits >= this.cfg.eyeHits && !this._advancing) {
      this._advancing = true;
      this.input.setActive(false);
      setTimeout(() => this._completeLevel(), 600);
    }
  }

  _completeLevel() {
    this.ui.setPlaying(false);
    this.audio.levelUp();
    if (!this.cfg.calibration && this.levelIndex === CHALLENGE_COUNT) {
      this.state = "finale";
      this.ui.showFinale({ total: this.score });
    } else {
      this.state = "levelcomplete";
      this.ui.showLevelComplete({ total: this.score, calibration: !!this.cfg.calibration });
    }
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
