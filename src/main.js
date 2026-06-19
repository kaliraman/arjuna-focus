// Entry point: sets up the DPR-aware canvas, the render loop, input + UI wiring,
// and the screen state machine glue. Keeps logic thin — rules live in game.js.

import { Scene } from "./scene.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Game } from "./game.js";
import * as leaderboard from "./leaderboard.js";
import { shareScore } from "./share.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scene = new Scene();
const ui = new UI();

let dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  scene.resize(w, h);
}
window.addEventListener("resize", resize);
resize();

const input = new Input(canvas, {
  onFire: (pos) => {
    Audio.unlock();
    Audio.twang();
    game.fire(pos);
  },
});

const game = new Game({ scene, ui, audio: Audio, input, leaderboard });

// ---- render loop ------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  game.update(dt);
  scene.render(ctx);

  if (game.state === "playing") drawReticle(ctx);

  requestAnimationFrame(frame);
}

function drawReticle(c) {
  if (!input.has) return;
  const { x, y } = input;
  const steady = input.speed < 70;
  const col = steady ? "rgba(118, 224, 160, 0.95)" : "rgba(234, 242, 244, 0.85)";
  c.save();
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, 16, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(x, y, 2.5, 0, Math.PI * 2);
  c.fillStyle = col;
  c.fill();
  // cross ticks
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    c.beginPath();
    c.moveTo(x + dx * 10, y + dy * 10);
    c.lineTo(x + dx * 22, y + dy * 22);
    c.stroke();
  }
  c.restore();
}
requestAnimationFrame(frame);

// ---- button / screen wiring -------------------------------------------------
const on = (id, fn) =>
  document.getElementById(id).addEventListener("click", () => {
    Audio.unlock();
    fn();
  });

on("btn-start", () => game.newGame());
on("btn-daily", () => game.startDaily());
on("btn-how", () => ui.show("how"));
on("btn-how-back", () => ui.show("title"));
on("btn-board-title", () => game.showBoard());
on("btn-next", () => game.nextLevel());
on("btn-play-again", () => game.newGame());
on("btn-board-home", () => { game.state = "title"; ui.show("title"); });

on("btn-skip-save", () => game.showBoard());

const doShare = async () => {
  const status = await shareScore(game.shareData());
  if (status) ui.toastMsg(status, "#76e0a0");
};
on("btn-share", doShare);
on("btn-share-board", doShare);
on("btn-save", async () => {
  const val = document.getElementById("initials").value;
  await game.saveScore(val);
  await game.showBoard();
});

// Enter key in the initials field saves.
document.getElementById("initials").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-save").click();
});

document.getElementById("mute-btn").addEventListener("click", () => {
  const muted = Audio.toggleMute();
  ui.setMuted(muted);
});

// Start on the title screen.
ui.show("title");
ui.setPlaying(false);
