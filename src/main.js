import { Target } from "./classes/Target.js";
import { resizeCanvas } from "./procedures/helpers.js";
import {
  drawGun,
  drawAimLine,
  drawLives,
  drawTopInfo,
  drawGameOver,
} from "./procedures/draw.js";

const gunSpeed = 3;

const words = [
  { en: "breeze", ru: "бриз" },
  { en: "glimpse", ru: "взгляд мельком" },
  { en: "wander", ru: "бродить" },
  { en: "fascinate", ru: "очаровывать" },
  { en: "sparkle", ru: "сверкать" },
  { en: "whisper", ru: "шептать" },
  { en: "dazzle", ru: "ослеплять" },
  { en: "reckon", ru: "полагать" },
  { en: "flicker", ru: "мерцать" },
  { en: "glow", ru: "сиять" },
  { en: "venture", ru: "рисковать" },
  { en: "soar", ru: "взмывать" },
  { en: "echo", ru: "отражаться" },
  { en: "murmur", ru: "бормотать" },
  { en: "thrill", ru: "возбуждать" },
  { en: "wanderlust", ru: "тяга к путешествиям" },
  { en: "haze", ru: "мгла" },
  { en: "glimmer", ru: "проблеск" },
  { en: "linger", ru: "задерживаться" },
  { en: "flick", ru: "щёлкать" },
];

let canvas = document.getElementById("game");
let ctx;
let canvasLogicalWidth, canvasLogicalHeight;
let aimX;

function onResize() {
  const result = resizeCanvas(canvas);
  ctx = result.ctx;
  canvasLogicalWidth = result.canvasLogicalWidth;
  canvasLogicalHeight = result.canvasLogicalHeight;
  aimX = canvasLogicalWidth / 2;
}

window.addEventListener("resize", onResize);
onResize();

// ================== STATE ==================
let current = null;
let lastBottomWord = null;
let targets = [];
let projectiles = [];
let dir = 1;
let repeatedCount = 0;
let lives = 3;
let isGameOver = false;
let wallButton = null;
let wall = null;
let bonusTimeout = null;
let waveNumber = 0;
let nextSpawnY = 0;
const livesRef = { value: lives };
let gunWordIndex = 0;
let gunQueue = [];
let moveDir = 0;

setInterval(() => {
  if (livesRef.value < 3 && !isGameOver) livesRef.value++;
}, 10000);

// ================== SPAWN ==================
function spawnWave() {
  nextSpawnY = -40;
  targets.length = 0;
  for (let i = 0; i < 5; i++) {
    spawnWord(words[Math.floor(Math.random() * words.length)]);
  }
  gunQueue = [...targets].sort(() => Math.random() - 0.5);
  pickGunWord();
  waveNumber++;
}

function spawnWord(pair) {
  const lang = Math.random() < 0.5 ? "en" : "ru";
  const x = Math.random() * (canvasLogicalWidth - 100) + 50;

  // determine y
  const last = targets[targets.length - 1];
  if (!last || last.y > 0) {
    nextSpawnY = -40; // start above screen
  }

  const t = new Target(pair, lang, x, ctx);
  t.y = nextSpawnY;
  nextSpawnY -= t.h + 10; // vertical spacing

  targets.push(t);

  // add to gun queue at random position
  const insertIndex = Math.floor(Math.random() * (gunQueue.length + 1));
  gunQueue.splice(insertIndex, 0, t);

  return t;
}

// ================== INPUT ==================
document.body.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // 1. GAME OVER — рестарт
  if (isGameOver) {
    livesRef.value = 3;
    repeatedCount = 0;
    waveNumber = 0;
    gunWordIndex = 0;
    targets.length = 0;
    projectiles.length = 0;
    gunQueue.length = 0;
    isGameOver = false;
    spawnWave();
    return;
  }

  // 2. нижняя зона — смена слова
  if (y >= canvasLogicalHeight - 80) {
    pickGunWord();
    return;
  }

  const third = canvasLogicalWidth / 3;

  // 3. управление
  if (x < third) {
    moveDir = -1;
  } else if (x > third * 2) {
    moveDir = 1;
  } else {
    shoot();
  }
});

function shoot() {
  if (!current) return;

  projectiles.push({
    x: aimX,
    y: canvasLogicalHeight - 70,
    vy: -10,
    color: "#5bc88f",
    word: current.text,
    pair: lastBottomWord.pair,
  });

  pickGunWord();
}

document.body.addEventListener("pointerup", () => {
  moveDir = 0;
});

document.body.addEventListener("pointercancel", () => {
  moveDir = 0;
});

// ================== PROJECTILES ==================
function updateProjectiles() {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const proj = projectiles[p];
    proj.y += proj.vy;

    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const hit =
        proj.x + 6 >= t.x - t.w / 2 &&
        proj.x - 6 <= t.x + t.w / 2 &&
        proj.y + 6 >= t.y - t.h / 2 &&
        proj.y - 6 <= t.y + t.h / 2;

      if (hit) {
        if (t.pair === proj.pair && t.text !== proj.word) {
          // removeFromBottomQueue(t); // remove exact pair from bottom queue
          targets.splice(i, 1);

          const indexInGun = gunQueue.indexOf(t);
          if (indexInGun !== -1) {
            gunQueue.splice(indexInGun, 1);
            if (gunWordIndex >= gunQueue.length) gunWordIndex = 0;
          }

          repeatedCount++;
          if (Math.random() < 0.2) spawnWallButton();
        } else {
          applyPunishment(t);
        }

        projectiles.splice(p, 1);
        if (!targets.length) spawnWave();
        break;
      }
    }

    if (proj.y < 0) projectiles.splice(p, 1);
  }
}

function spawnWallButton() {
  const x = Math.random() * (canvasLogicalWidth - 100) + 50;
  const y = Math.random() * (canvasLogicalHeight - 150) + 50;
  wallButton = { x, y, w: 80, h: 40, text: "===" };
  if (bonusTimeout) clearTimeout(bonusTimeout);
  bonusTimeout = setTimeout(() => {
    wallButton = null;
    bonusTimeout = null;
  }, 20000);
}

function applyPunishment(t) {
  const punishment = Math.floor(Math.random() * 3);
  if (punishment === 0) t.vy += 0.15;
  else if (punishment === 1) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < count; k++) {
      const pair = words[Math.floor(Math.random() * words.length)];
      spawnWord(pair); // spawnWord now returns the Target
    }
  } else {
    livesRef.value--;
  }
}

// ================== LOOP ==================
function loop() {
  if (livesRef.value <= 0) isGameOver = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.08;

  ctx.fillStyle = "#333";
  ctx.fillRect(0, 0, canvasLogicalWidth / 3, canvasLogicalHeight - 80);

  ctx.fillStyle = "#000";
  ctx.fillRect(
    canvasLogicalWidth / 3,
    0,
    canvasLogicalWidth / 3,
    canvasLogicalHeight - 80
  );

  ctx.fillStyle = "#333";
  ctx.fillRect(
    (canvasLogicalWidth * 2) / 3,
    0,
    canvasLogicalWidth / 3,
    canvasLogicalHeight - 80
  );

  ctx.restore();

  if (isGameOver) {
    drawGameOver(ctx, canvas, canvasLogicalWidth, canvasLogicalHeight);
    requestAnimationFrame(loop);
    return;
  }

  ctx.fillStyle = "#14182b8a";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

  drawAimLine(ctx, aimX, canvasLogicalHeight);
  drawLives(ctx, livesRef);
  drawTopInfo(ctx, repeatedCount, waveNumber);

  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];

    t.update({ wall, canvasLogicalHeight, livesRef });
    t.draw(ctx);

    if (t.dead) {
      const qi = gunQueue.indexOf(t);
      if (qi !== -1) gunQueue.splice(qi, 1);

      targets.splice(i, 1);
    }
  }

  updateProjectiles();

  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // aimX += dir * gunSpeed;
  // if (aimX < 0 || aimX > canvasLogicalWidth) dir *= -1;
  aimX += moveDir * gunSpeed;
  aimX = Math.max(0, Math.min(canvasLogicalWidth, aimX));

  // if (wallButton) drawButton(ctx, wallButton, "#284a884d", "#4c8bff54");
  // if (wall) drawButton(ctx, wall, "#8b8b8b3b", "#c5c5c5");

  drawGun(ctx, current, canvasLogicalWidth, canvasLogicalHeight);
  requestAnimationFrame(loop);
}

function pickGunWord() {
  if (!gunQueue.length) {
    current = null;
    return;
  }

  const t = gunQueue[gunWordIndex % gunQueue.length];
  if (!t) {
    gunWordIndex = 0;
    return;
  }

  gunWordIndex = (gunWordIndex + 1) % gunQueue.length;

  const oppositeLang = t.lang === "en" ? "ru" : "en";
  current = { pair: t.pair, lang: oppositeLang, text: t.pair[oppositeLang] };
  lastBottomWord = current;
}

spawnWave();
loop();
