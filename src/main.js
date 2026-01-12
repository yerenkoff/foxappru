import { Target } from "./classes/Target.js";
import { resizeCanvas } from "./procedures/helpers.js";
import { setFont } from "./procedures/helpers.js";
import { drawGun, drawTopInfo, drawGameOver } from "./procedures/draw.js";

let canvas = document.getElementById("game");
let ctx;
let canvasLogicalWidth, canvasLogicalHeight;

const username = "yerenkoff"; // your GitHub username

async function fetchDictionaryUrls() {
  try {
    // hardcode repo in URL
    const apiUrl = `https://api.github.com/repos/${username}/foxapp-data/contents`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch repo contents");

    const files = await response.json();

    // filter only .txt files and map to { name, url }
    const urls = files
      .filter(f => f.name.endsWith(".txt"))
      .map(f => ({
        name: f.name.replace(".txt", ""), // e.g., "english-french"
        url: f.download_url                // raw GitHub URL
      }));

    return urls; // array of { name, url }
  } catch (err) {
    console.error("Error fetching dictionary URLs:", err);
    return [];
  }
}

async function buildStartButtons() {
  startButtons = [];
  const buttonWidth = 360;
  const buttonHeight = 44;
  const gap = 16;

  const dictionaryUrls = await fetchDictionaryUrls();

  const startY =
    canvasLogicalHeight / 2 -
    ((dictionaryUrls.length - 1) * (buttonHeight + gap)) / 2;

  dictionaryUrls.forEach((dict, i) => {
    startButtons.push({
      name: dict.name,
      url: dict.url,
      x: canvasLogicalWidth / 2 - buttonWidth / 2,
      y: startY + i * (buttonHeight + gap),
      w: buttonWidth,
      h: buttonHeight,
      pressed: false,
    });
  });
}

let startButtons = [];

async function fetchDictionary(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch dictionary");
    const text = await response.text();

    const lines = text.split("\n").filter((line) => line.trim());
    const words = lines
      .map((line) => {
        const parts = line.split(":").map((s) => s.trim());
        if (parts.length < 2) return null;
        return {
          word: parts[0], // first part = word
          translation: parts[1], // second part = translation
        };
      })
      .filter(Boolean);

    return words;
  } catch (err) {
    console.error("Error fetching dictionary:", err);
    return [];
  }
}

const url =
  "https://raw.githubusercontent.com/yerenkoff/foxapp-data/refs/heads/main/english-french.txt";


function onResize() {
  const result = resizeCanvas(canvas);
  ctx = result.ctx;
  canvasLogicalWidth = result.canvasLogicalWidth;
  canvasLogicalHeight = result.canvasLogicalHeight;
  buildStartButtons();
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
let selectedDictionaryName = null;
let activeWords = [];

setInterval(() => {
  if (livesRef.value < 3 && !isGameOver) livesRef.value++;
}, 10000);

// ================== SPAWN ==================
function spawnWave() {
  if (!activeWords.length) return;
  nextSpawnY = -40;
  targets.length = 0;

  // Difficulty factor: speeds up words gradually
  const speedFactor = 1 + waveNumber * 0.05; // 10% faster each wave

  for (let i = 0; i < 5; i++) {
    const t = spawnWord(activeWords[Math.floor(Math.random() * activeWords.length)]);
    t.vy *= speedFactor; // scale speed
  }

  gunQueue = [...targets].sort(() => Math.random() - 0.5);
  pickGunWord();
  waveNumber++;
}

function spawnWord(pair) {
  const langs = Object.keys(pair);
  const lang = langs[Math.floor(Math.random() * langs.length)];

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
// === start screen handler ===
canvas.addEventListener("pointerdown", async (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // === START SCREEN ===
  if (!isStarted) {
    for (const btn of startButtons) {
      if (
        x >= btn.x &&
        x <= btn.x + btn.w &&
        y >= btn.y &&
        y <= btn.y + btn.h
      ) {
        // fetch dictionary dynamically from the GitHub URL stored in the button
        activeWords = await fetchDictionary(btn.url); // ✅ must await
        selectedDictionaryName = btn.name;
        isStarted = true;
        spawnWave();
        return;
      }
    }
    return;
  }

  // === GAME OVER ===
  if (isGameOver) {
    resetGame();
    return;
  }

  // === GAME INPUT (shooting) ===
  shootAt(x, y);
});

function resetGame() {
    livesRef.value = 3;
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
      const pair = activeWords[Math.floor(Math.random() * activeWords.length)];
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

    // title
    setFont(ctx, 28);
    ctx.fillText(
      "Foxapp",
      canvasLogicalWidth / 2,
      canvasLogicalHeight / 2 - 120
    );

    // subtitle
    setFont(ctx, 16);
    ctx.fillText(
      "Choose dictionary to start the game",
      canvasLogicalWidth / 2,
      canvasLogicalHeight / 2 - 70
    );

    // dictionary buttons
    setFont(ctx, 18);

    startButtons.forEach((btn) => {
      // background color depends on pressed state
      ctx.fillStyle = btn.pressed ? "#4caf87" : "#1e2240"; // pressed = lighter
      ctx.strokeStyle = "#5bc88f";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fill();
      ctx.stroke();

      // text
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.name, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });

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

  // draw info
  drawTopInfo(ctx, repeatedCount, waveNumber, livesRef);

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

  // === GAME LOOP ===
  ctx.fillStyle = "#14182bff";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

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

  const langs = Object.keys(t.pair);
  const oppositeLang = langs.find((l) => l !== t.lang);
  current = { pair: t.pair, lang: oppositeLang, text: t.pair[oppositeLang] };
  lastBottomWord = current;
}

loop();
