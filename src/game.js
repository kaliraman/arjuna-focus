// Game controller: owns run state (one cumulative score, the level, the
// eye-strike objective) and the rules for advancing. Coordinates Scene, UI,
// and Audio. main.js drives the render loop and forwards input.
//
// Model: arrows are unlimited; you advance by striking the eye N times. The
// score is one number that only climbs. No fail, no combo, no targets.

import { getLevel, LEVEL_COUNT, CHALLENGE_COUNT } from "./levels.js";
import { scoreShot } from "./scoring.js";
import { t } from "./strings.js";

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
    this.input.setAdvanceMode(false);
    this.ui.setPlaying(true);
    const label = this._levelLabel();
    this.ui.setHud({ levelLabel: label, score: this.score, eyeHits: 0, eyeGoal: cfg.eyeHits });
    this.ui.setLevelName(cfg.calibration ? t("warmup") : this._levelName(cfg));
    this.input.setActive(true);
  }

  // The LEVEL chip is a pure progress counter, so it never echoes the big level
  // name: "3 / 8" for the numbered run, null for the warm-up (chip hidden, since
  // there's no number yet), and "∞" for endless (the name already reads
  // "Endless N").
  _levelLabel() {
    if (this.cfg.calibration) return null;
    if (this.levelIndex <= CHALLENGE_COUNT) return `${this.levelIndex} / ${CHALLENGE_COUNT}`;
    return "∞";
  }

  _levelName(cfg) {
    if (cfg.key === "endless") return `${t("lvl_endless")} ${cfg.endlessN}`;
    return t(`lvl_${cfg.key}`);
  }

  // ---- per-frame ------------------------------------------------------------
  update(dt) {
    // Keep the scene (and the lotus) animating through the non-blocking clear.
    if (this.state !== "playing" && this.state !== "cleared") return;
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

    // Feedback, scaled by how good the hit was.
    if (result.ring.key === "bullseye") {
      // Dead-center: the full hero moment — freeze, flash, bloom, swelling bell.
      this.scene.hero(eye.x, eye.y, 1.0);
      this.scene.shake(13);
      this.audio.bullseye();
      this.ui.wordBloom("एकाग्रता");
      this.ui.toastMsg(`${t("ring_" + result.ring.key)} +${result.points}`, result.ring.color);
      this._haptic(35);
    } else if (result.eyeHit) {
      // Any eye-strike gets a snappy, satisfying pop (no time-freeze).
      this.scene.hero(eye.x, eye.y, 0.55);
      this.scene.shake(7);
      this.audio.chime();
      this.ui.wordBloom("साधु");
      this.ui.toastMsg(`${t("ring_" + result.ring.key)} +${result.points}`, result.ring.color);
      this._haptic(15);
    } else if (result.points > 0) {
      this.scene.addImpact(pos.x, pos.y, result.ring.color);
      this.scene.burst(pos.x, pos.y, result.ring.color, 8, 0.6);
      this.scene.shake(3);
      this.audio.hit();
      this.ui.toastMsg(`${t("ring_" + result.ring.key)} +${result.points}`, result.ring.color);
    } else {
      // Soft landing: gentle splash, mellow tone, no shake, mostly quiet.
      this.scene.addImpact(pos.x, pos.y, "#8fb8c8");
      this.scene.burst(pos.x, pos.y, "#9fc6d6", 5, 0.4);
      this.audio.softMiss();
      const key = this._missLine();
      if (key) this.ui.toastMsg(t(key), "#9fb6bd");
    }

    if (result.eyeHit) this.eyeHits += 1;
    this.ui.setHud({ score: this.score, eyeHits: this.eyeHits, eyeGoal: this.cfg.eyeHits });

    // Advance once the eye has been struck enough times.
    if (this.eyeHits >= this.cfg.eyeHits && !this._advancing) {
      this._advancing = true;
      this.input.setActive(false);
      this.scene.celebrate();   // the lotus blooms
      this.audio.levelUp();
      const isFinal = !this.cfg.calibration && this.levelIndex === CHALLENGE_COUNT;
      this.state = "cleared";   // scene keeps animating (the lotus)
      if (isFinal) {
        // Let the lotus open, then show the fuller finale screen.
        setTimeout(() => {
          this.state = "finale";
          this.ui.setPlaying(false);
          this.ui.showFinale({ total: this.score });
        }, 1800);
      } else {
        // Non-blocking: keep the pool + flower on screen. The flower folds into
        // a pulsing chevron at the centre (its own colour); a tap anywhere
        // advances.
        this.ui.clearObjective();
        this.scene.showNextCue();
        this.input.setAdvanceMode(true);
      }
    }
  }

  _haptic(ms) {
    try { if (navigator.vibrate && !this.scene.reduceMotion) navigator.vibrate(ms); } catch { /* unsupported */ }
  }

  _missLine() {
    if (Math.random() > 0.35) return null; // usually stay quiet
    return ["miss1", "miss2", "miss3"][(Math.random() * 3) | 0];
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
