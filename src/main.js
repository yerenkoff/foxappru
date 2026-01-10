import { Target } from "./classes/Target.js";
import { resizeCanvas } from "./procedures/helpers.js";
import words from "./constants/words.js";
import { setFont } from "./procedures/helpers.js";
import {
  drawGun,
  drawLives,
  drawTopInfo,
  drawGameOver,
} from "./procedures/draw.js";

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
let isStarted = false;

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

  // создаём временный объект, чтобы узнать ширину слова
  const temp = new Target(pair, lang, 0, ctx);
  setFont(ctx); // убедимся, что шрифт правильный
  temp.w = ctx.measureText(temp.text).width + 24;

  // выбираем X так, чтобы слово полностью помещалось на экране
  const x = Math.random() * (canvasLogicalWidth - temp.w) + temp.w / 2;

  // определяем Y
  if (!targets.length || targets[targets.length - 1].y > 0) {
    nextSpawnY = -40;
  }

  const t = new Target(pair, lang, x, ctx);
  t.w = temp.w; // фиксируем ширину
  t.y = nextSpawnY;
  nextSpawnY -= t.h + 10;

  targets.push(t);

  // добавляем в очередь пушки
  const insertIndex = Math.floor(Math.random() * (gunQueue.length + 1));
  gunQueue.splice(insertIndex, 0, t);

  return t;
}

// ================== INPUT ==================
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (!isStarted) {
    isStarted = true;
    spawnWave();
    return;
  }

  // 1. Если игра окончена — рестарт
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

  // 2. Любой тап по экрану — выстрел
  shootAt(x, y);
});

function shootAt(targetX, targetY) {
  if (!current) return;

  const startX = canvasLogicalWidth / 2; // центр экрана, там где пушка
  const startY = canvasLogicalHeight - 40;

  // вектор к тапу
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const speed = 10; // скорость пули
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;

  projectiles.push({
    x: startX,
    y: startY,
    vx,
    vy,
    color: "#5bc88f",
    word: current.text,
    pair: lastBottomWord.pair,
  });

  pickGunWord(); // сразу меняем слово после выстрела
}

// ================== PROJECTILES ==================
function updateProjectiles() {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const proj = projectiles[p];

    // двигаем пульку по вектору
    proj.x += proj.vx;
    proj.y += proj.vy;

    // проверка на столкновение с целями
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];

      if (t.y + t.h / 2 > canvasLogicalHeight - 80) {
        continue;
      }

      const hit =
        proj.x + 6 >= t.x - t.w / 2 &&
        proj.x - 6 <= t.x + t.w / 2 &&
        proj.y + 6 >= t.y - t.h / 2 &&
        proj.y - 6 <= t.y + t.h / 2;

      if (hit) {
        if (t.pair === proj.pair && t.text !== proj.word) {
          // попадание в правильное слово
          targets.splice(i, 1);

          const indexInGun = gunQueue.indexOf(t);
          if (indexInGun !== -1) {
            gunQueue.splice(indexInGun, 1);
            if (gunWordIndex >= gunQueue.length) gunWordIndex = 0;
          }

          repeatedCount++;
          if (Math.random() < 0.2) spawnWallButton();
        } else {
          // наказание за неправильное попадание
          applyPunishment(t);
        }

        projectiles.splice(p, 1);
        if (!targets.length) spawnWave();
        break;
      }
    }

    // удаляем пульку, если она улетела за экран
    if (
      proj.x < 0 ||
      proj.x > canvasLogicalWidth ||
      proj.y < 0 ||
      proj.y > canvasLogicalHeight
    ) {
      projectiles.splice(p, 1);
    }
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // === START SCREEN ===
  if (!isStarted) {
    ctx.fillStyle = "#0f1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    setFont(ctx, 24);
    ctx.fillText("Foxapp", canvasLogicalWidth / 2, canvasLogicalHeight / 2 - 40);
    
    setFont(ctx);
    ctx.fillText("Click to start", canvasLogicalWidth / 2, canvasLogicalHeight / 2 + 20);

    requestAnimationFrame(loop);
    return;
  }

  // === GAME OVER CHECK ===
  if (livesRef.value <= 0) isGameOver = true;

  if (isGameOver) {
    drawGameOver(ctx, canvas, canvasLogicalWidth, canvasLogicalHeight);
    requestAnimationFrame(loop);
    return;
  }

  // === GAME LOOP ===
  ctx.fillStyle = "#14182bff";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

  // draw info
  drawLives(ctx, livesRef);
  drawTopInfo(ctx, repeatedCount, waveNumber);

  // update and draw targets
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.update({ wall, canvasLogicalHeight, livesRef });
    t.draw(ctx);

    if (t.dead) {
      const qi = gunQueue.indexOf(t);
      if (qi !== -1) gunQueue.splice(qi, 1);
      targets.splice(i, 1);
      if (!targets.length) spawnWave();
    }
  }

  // update and draw projectiles
  updateProjectiles();
  for (const p of projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // draw gun
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

loop();
