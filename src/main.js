// Entry point: sets up the DPR-aware canvas, the render loop, input + UI wiring,
// and the screen state machine glue. Keeps logic thin — rules live in game.js.

import { Scene } from "./scene.js";
import { Input } from "./input.js";
import { UI } from "./ui.js";
import { Audio } from "./audio.js";
import { Game } from "./game.js";

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

const game = new Game({ scene, ui, audio: Audio, input });

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
  const col = "rgba(234, 242, 244, 0.9)";
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

// How-to-play and The legend are reachable from both the title and the pause
// menu; remember where to return to on Back.
let infoReturn = "title";
const openInfo = (name, ret) => { infoReturn = ret; ui.show(name); };

on("btn-start", () => game.newGame());
on("btn-how", () => openInfo("how", "title"));
on("btn-legend", () => openInfo("legend", "title"));
on("btn-how-back", () => ui.show(infoReturn));
on("btn-legend-back", () => ui.show(infoReturn));
on("btn-next", () => game.nextLevel());
on("btn-finale-again", () => game.newGame());
on("btn-finale-endless", () => game.keepGoing());
on("btn-finale-home", () => game.toTitle());

// In-game pause menu (corner button)
on("menu-btn", () => game.openMenu());
on("btn-resume", () => game.resume());
on("btn-menu-how", () => openInfo("how", "menu"));
on("btn-menu-legend", () => openInfo("legend", "menu"));
on("btn-menu-quit", () => game.toTitle());
on("btn-menu-sound", () => ui.setMuted(Audio.toggleMute()));

// Start on the title screen.
ui.show("title");
ui.setPlaying(false);
