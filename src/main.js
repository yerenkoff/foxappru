import { Target } from "./classes/Target.js";
import { resizeCanvas, setFont } from "./procedures/helpers.js";
import { drawGun, drawTopInfo, drawGameOver } from "./procedures/draw.js";
import {
  initAudio,
  setAudioEnabled,
  playEffect,
  audioEnabled,
  loadAllSounds,
} from "./procedures/sounds.js";
import { renderDictionaries } from "./procedures/dictionaries.js";
import { guys, initGuys, updateGuys } from "./procedures/guys.js";
import { projectiles, updateProjectiles } from "./procedures/projectiles.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let canvasLogicalWidth, canvasLogicalHeight;

const input = document.getElementById("input");
const searchBtn = document.getElementById("search");
const resetBtn = document.getElementById("reset");
const dictList = document.getElementById("dictionaries");
const startScreen = document.querySelector(".startScreen");
const audioCheckbox = document.getElementById("audioCheckbox");

const state = {
  activeWords: [],
  selectedDictionaryName: null,
  isStarted: false,
  loopRunning: false,
};

const guyImgs = [0, 1].map((i) =>
  Object.assign(new Image(), { src: `assets/img/guy/guy${i}.png` }),
);

initAudio();
audioCheckbox.checked = audioEnabled;
audioCheckbox.addEventListener("change", () =>
  setAudioEnabled(audioCheckbox.checked),
);
loadAllSounds();

let currentUsername = localStorage.getItem("foxappUsername") || "foxappru";
if (currentUsername !== "foxappru") input.value = currentUsername;

// ================== CANVAS ==================
function onResize() {
  const result = resizeCanvas(canvas);
  canvasLogicalWidth = result.canvasLogicalWidth;
  canvasLogicalHeight = result.canvasLogicalHeight;
}
window.addEventListener("resize", onResize);
onResize();

initGuys(canvasLogicalWidth, canvasLogicalHeight);

// ================== GAME STATE ==================
let current = null;
let lastBottomWord = null;
let targets = [];
let repeatedCount = 0;
let isGameOver = false;
let gunWordIndex = 0;
let gunQueue = [];
let waveNumber = 0;
let nextSpawnY = 0;

// ================== DICTIONARIES ==================
renderDictionaries(
  currentUsername,
  dictList,
  startScreen,
  spawnWave,
  loop,
  state,
);

// ================== SEARCH / RESET ==================
searchBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (!username) return;
  currentUsername = username;
  localStorage.setItem("foxappUsername", username);
  renderDictionaries(username, dictList, startScreen, spawnWave, loop, state);
});

resetBtn.addEventListener("click", (e) => {
  e.preventDefault();
  input.value = "";
  currentUsername = "foxappru";
  localStorage.removeItem("foxappUsername");
  renderDictionaries(
    currentUsername,
    dictList,
    startScreen,
    spawnWave,
    loop,
    state,
  );
});

// ================== SPAWN ==================
function spawnWave() {
  if (!state.activeWords.length) return;
  nextSpawnY = -40;
  targets.length = 0;
  const speedFactor = 1 + waveNumber * 0.05;

  for (let i = 0; i < 5; i++) {
    const t = spawnWord(
      state.activeWords[Math.floor(Math.random() * state.activeWords.length)],
    );
    t.vy *= speedFactor;
  }

  gunQueue = [...targets].sort(() => Math.random() - 0.5);
  pickGunWord();
  waveNumber++;
}

function spawnWord(pair) {
  const langs = Object.keys(pair);
  const lang = langs[Math.floor(Math.random() * langs.length)];
  const temp = new Target(pair, lang, 0);
  setFont(ctx);
  temp.w = ctx.measureText(temp.text).width + 24;
  const x = Math.random() * (canvasLogicalWidth - temp.w) + temp.w / 2;
  if (!targets.length || targets[targets.length - 1].y > 0) nextSpawnY = -40;
  const t = new Target(pair, lang, x, playEffect);
  t.w = temp.w;
  t.y = nextSpawnY;
  nextSpawnY -= t.h + 10;
  targets.push(t);
  const insertIndex = Math.floor(Math.random() * (gunQueue.length + 1));
  gunQueue.splice(insertIndex, 0, t);
  return t;
}

// ================== INPUT ==================
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (isGameOver) return resetGame();
  shootAt(x, y);
});

function resetGame() {
  repeatedCount = 0;
  waveNumber = 0;
  gunWordIndex = 0;
  targets.length = 0;
  projectiles.length = 0;
  gunQueue.length = 0;
  isGameOver = false;
  spawnWave();
}

function shootAt(targetX, targetY) {
  if (!current) return;
  const startX = canvasLogicalWidth / 2;
  const startY = canvasLogicalHeight - 40;

  const projectileWord = current.text;
  const projectilePair = lastBottomWord.pair;

  gunWordIndex += targetX > canvasLogicalWidth / 2 ? 1 : -1;
  pickGunWord(gunWordIndex);

  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = 10;

  projectiles.push({
    x: startX,
    y: startY,
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
    color: "#5bc88f",
    word: projectileWord,
    pair: projectilePair,
  });

  playEffect("shot");
}

// ================== LOOP ==================
function loop() {
  if (!state.isStarted) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isGameOver) {
    drawGameOver(ctx, canvas, canvasLogicalWidth, canvasLogicalHeight);
    requestAnimationFrame(loop);
    return;
  }

  drawTopInfo(ctx, repeatedCount, waveNumber);

  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.update({ canvasLogicalHeight });

    for (const g of guys) {
      if (g.falling || t.vy <= 0) continue;

      const prevBottom = t.y + t.h / 2 - t.vy;
      const currBottom = t.y + t.h / 2;
      const horizontalHit = t.x + t.w / 2 > g.x && t.x - t.w / 2 < g.x + 32;

      if (prevBottom < g.y + 2 && currBottom >= g.y && horizontalHit) {
        g.falling = true;
        g.vy = 2;
        g.rot = 0;
      }
    }

    t.draw(ctx);
    if (t.dead) {
      const qi = gunQueue.indexOf(t);
      if (qi !== -1) gunQueue.splice(qi, 1);
      targets.splice(i, 1);
      if (!targets.length) spawnWave();
    }
  }

  ctx.fillStyle = "#14182bff";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

  updateGuys(ctx, canvasLogicalWidth, canvasLogicalHeight, guyImgs);

  if (guys.length === 0) {
    isGameOver = true;
  }

  updateProjectiles(
    targets,
    gunQueue,
    { value: gunWordIndex },
    canvasLogicalWidth,
    canvasLogicalHeight,
    spawnWave,
    spawnWord,
    state.activeWords,
  );

  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGun(ctx, current, canvasLogicalWidth, canvasLogicalHeight);
  requestAnimationFrame(loop);
}

// ================== PICK GUN WORD ==================
function pickGunWord(index = gunWordIndex) {
  if (!gunQueue.length) {
    current = null;
    return;
  }

  index = (index + gunQueue.length) % gunQueue.length;
  gunWordIndex = index;

  const t = gunQueue[gunWordIndex];
  if (!t) return;

  const langs = Object.keys(t.pair);
  const oppositeLang = langs.find((l) => l !== t.lang);
  current = { pair: t.pair, lang: oppositeLang, text: t.pair[oppositeLang] };
  lastBottomWord = current;
}
