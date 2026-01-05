// ================== CONFIG ==================
const FONT_SIZE = 16;
let bottomWordFast = false;
const bottomWordNormalSpeed = 3;
const bottomWordFastSpeed = 1.5;

// ================== DATA ==================
const words = [
  { en: "breeze", ru: "бриз" },
  { en: "glimpse", ru: "взгляд мельком" },
  //   { en: "wander", ru: "бродить" },
  //   { en: "fascinate", ru: "очаровывать" },
  //   { en: "sparkle", ru: "сверкать" },
  //   { en: "whisper", ru: "шептать" },
  //   { en: "dazzle", ru: "ослеплять" },
  //   { en: "reckon", ru: "полагать" },
  //   { en: "flicker", ru: "мерцать" },
  //   { en: "glow", ru: "сиять" },
  //   { en: "venture", ru: "рисковать" },
  //   { en: "soar", ru: "взмывать" },
  //   { en: "echo", ru: "отражаться" },
  //   { en: "murmur", ru: "бормотать" },
  //   { en: "thrill", ru: "возбуждать" },
  //   { en: "wanderlust", ru: "тяга к путешествиям" },
  //   { en: "haze", ru: "мгла" },
  //   { en: "glimmer", ru: "проблеск" },
  //   { en: "linger", ru: "задерживаться" },
  //   { en: "flick", ru: "щёлкать" },
];

// ================== CANVAS ==================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let bottomWordX;
let canvasLogicalWidth, canvasLogicalHeight;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let cw, ch;

  if (w > h) {
    cw = ch = h; // horizontal
  } else {
    cw = w;
    ch = Math.min(h, w * 2); // vertical
  }

  const dpr = window.devicePixelRatio || 1;

  canvas.width = cw * dpr;
  canvas.height = ch * dpr;

  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";

  ctx.resetTransform();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  canvasLogicalWidth = cw;
  canvasLogicalHeight = ch;

  bottomWordX = cw / 2;
}

window.addEventListener("resize", resize);
resize();

// ================== STATE ==================
let current = null;
let lastBottomWord = null;
let targets = [];
let projectiles = [];
let dir = 1;
let repeatedCount = 0;
let lives = 1;
let lost = false;
let isGameOver = false;
let bonusButton = null;
let wall = null;
let bonusTimeout = null;
let waveNumber = 0;
let baseWaveSize = 5;

setInterval(() => {
  if (lives < 3 && !isGameOver) {
    lives++;
  }
}, 10000);

// ================== TARGET ==================
class Target {
  constructor(pair, lang, x) {
    this.pair = pair;
    this.lang = lang;
    this.text = pair[lang];

    ctx.font = FONT_SIZE + "px 'IBM Plex Sans', sans-serif";
    this.w = ctx.measureText(this.text).width + 24;
    this.h = FONT_SIZE + 18;
    this.x = x;
    this.y = -Math.random() * 300 - 40;
    this.vy = 0.2;
  }

  update() {
    // Wall collision
    if (wall) {
      const wallTop = wall.y - wall.h / 2;
      const wallBottom = wall.y + wall.h / 2;
      const wallLeft = wall.x - wall.w / 2;
      const wallRight = wall.x + wall.w / 2;

      const targetTop = this.y - this.h / 2;
      const targetBottom = this.y + this.h / 2;
      const targetLeft = this.x - this.w / 2;
      const targetRight = this.x + this.w / 2;

      const hitX = targetRight >= wallLeft && targetLeft <= wallRight;
      const hitY = targetBottom >= wallTop && targetTop <= wallBottom;

      if (hitX && hitY) {
        this.vy = 0; // stop falling
        this.y = wallTop - this.h / 2; // sit on top of the wall
      }
    }

    // Resume falling if wall is gone or target is not colliding
    if (!wall && this.vy === 0) {
      this.vy = 0.2;
    }

    this.y += this.vy;

    // Check if target fell below canvas
    if (this.y - this.h / 2 > canvasLogicalHeight) {
      lives--;
      const index = targets.indexOf(this);
      if (index !== -1) targets.splice(index, 1);

      if (lives <= 0) {
        isGameOver = true;
      }
    }
  }

  draw() {
    ctx.font = FONT_SIZE + "px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = "#401f1fff";
    ctx.strokeStyle = "rgba(255, 102, 117, 1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
  }
}

// ================== SPAWN ==================
function spawnWave() {
  targets.length = 0;

  // calculate how many words for this wave
  const extraWords = Math.floor(Math.random() * 3) + 1; // 1–3 more
  const waveSize = baseWaveSize + extraWords;

  const chosen = [];
  while (chosen.length < waveSize) {
    const randomPair = words[Math.floor(Math.random() * words.length)];
    chosen.push(randomPair);
  }

  chosen.forEach((pair) => {
    spawnWord(pair);
  });

  pickNextBottomWord();
  waveNumber++;

  // optional: gradually increase baseWaveSize
  baseWaveSize += extraWords;
}

// ================== SPAWN SINGLE WORD ==================
function spawnWord(pair) {
  const lang = Math.random() < 0.5 ? "en" : "ru";
  const x = Math.random() * (canvasLogicalWidth - 100) + 50; // avoid edges
  targets.push(new Target(pair, lang, x));
}

// ================== INPUT ==================
document.body.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (y >= canvasLogicalHeight - 80) {
    dir *= -1;

    if (bottomWordX <= 0) bottomWordX = 1;
    if (bottomWordX >= canvasLogicalWidth) bottomWordX = canvasLogicalWidth - 1;

    return;
  }

  if (bonusButton) {
    if (
      x >= bonusButton.x - bonusButton.w / 2 &&
      x <= bonusButton.x + bonusButton.w / 2 &&
      y >= bonusButton.y - bonusButton.h / 2 &&
      y <= bonusButton.y + bonusButton.h / 2
    ) {
      const wallWidth = canvasLogicalWidth / 3;
      const halfWall = wallWidth / 2;

      // clamp wall x so it stays inside canvas
      let wallX = bottomWordX;
      if (wallX - halfWall < 0) wallX = halfWall;
      if (wallX + halfWall > canvasLogicalWidth)
        wallX = canvasLogicalWidth - halfWall;

      wall = {
        x: wallX,
        y: canvasLogicalHeight - 130, // 10px above bottom word
        w: wallWidth,
        h: FONT_SIZE + 20,
      };

      // remove wall after 1 minute (60000 ms)
      setTimeout(() => {
        wall = null;
      }, 60000);

      bonusButton = null;
      return;
    }
  }

  ctx.font = FONT_SIZE + "px 'IBM Plex Sans', sans-serif";
  const textW = ctx.measureText(current.text).width;
  const padX = 18;
  const padY = 10;
  const w = textW + padX * 2;
  const h = FONT_SIZE + padY * 2;
  const yPos = canvasLogicalHeight - 70;

  if (isGameOver) {
    lives = 3;
    bottomWordX = canvasLogicalWidth / 2;
    dir = 1;
    targets.length = 0;
    projectiles.length = 0;
    isGameOver = false;

    spawnWave();
    return;
  }

  projectiles.push({
    x: bottomWordX,
    y: yPos,
    vy: -10,
    color: "#5bc88f",
    word: current.text,
    pair: lastBottomWord.pair,
  });

  pickNextBottomWord();
});

// ================== PROJECTILES ==================
function updateProjectiles() {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const projectile = projectiles[p];
    projectile.y += projectile.vy;

    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      const r = 6;

      const hit =
        projectile.x + r >= t.x - t.w / 2 &&
        projectile.x - r <= t.x + t.w / 2 &&
        projectile.y + r >= t.y - t.h / 2 &&
        projectile.y - r <= t.y + t.h / 2;

      if (hit) {
        console.log(t, projectile);

        if (t.pair === projectile.pair && t.text !== projectile.word) {
          targets.splice(i, 1);
          repeatedCount++;

          // 20% chance to spawn bonus button
          if (Math.random() < 0.2) {
            const x = Math.random() * (canvasLogicalWidth - 100) + 50;
            const y = Math.random() * (canvasLogicalHeight - 150) + 50;
            bonusButton = { x, y, w: 80, h: 40, text: "===" };

            // reset previous timeout if any
            if (bonusTimeout) clearTimeout(bonusTimeout);
            bonusTimeout = setTimeout(() => {
              bonusButton = null;
              bonusTimeout = null;
            }, 20000);
          }
        } else {
          const punishment = Math.floor(Math.random() * 3);

          if (punishment === 0) {
            t.vy += 0.15;
          } else if (punishment === 1) {
            const count = Math.floor(Math.random() * 3) + 1;
            for (let k = 0; k < count; k++) {
              spawnWord(words[Math.floor(Math.random() * words.length)]);
            }
          } else {
            lives--;
            if (lives <= 0) isGameOver = true;
          }
        }

        projectiles.splice(p, 1);
        if (targets.length === 0) spawnWave();
        break;
      }
    }

    if (projectile.y < 0) {
      projectiles.splice(p, 1);
    }
  }
}

// ================== DRAW BOTTOM ==================
function drawBottomWord() {
  if (!current) return;

  ctx.font = FONT_SIZE + "px 'IBM Plex Sans', sans-serif";
  const textW = ctx.measureText(current.text).width;
  const padX = 18;
  const padY = 10;
  const w = textW + padX * 2;
  const h = FONT_SIZE + padY * 2;
  const y = canvasLogicalHeight - 40;

  ctx.fillStyle = "#143a2a";
  ctx.strokeStyle = "#5bc88f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bottomWordX - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(current.text, bottomWordX, y);
}

// ================== LOOP ==================
function loop() {
  if (isGameOver) {
    drawGameOver();
    requestAnimationFrame(loop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#14182b8a";
  ctx.fillRect(0, canvasLogicalHeight - 80, canvasLogicalWidth, 80);

  drawAimLine();
  drawLives();
  drawTopInfo();

  for (const t of targets) {
    t.update();
    t.draw();
  }

  updateProjectiles();

  for (const projectile of projectiles) {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const speed = bottomWordFast ? bottomWordFastSpeed : bottomWordNormalSpeed;
  bottomWordX += dir * speed;
  if (bottomWordX < 0 || bottomWordX > canvasLogicalWidth) dir *= -1;

  if (bonusButton) {
    ctx.fillStyle = "#284a884d";
    ctx.strokeStyle = "#4c8bff54";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(
      bonusButton.x - bonusButton.w / 2,
      bonusButton.y - bonusButton.h / 2,
      bonusButton.w,
      bonusButton.h,
      10
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FONT_SIZE + "px 'IBM Plex Sans', sans-serif";
    ctx.fillText(bonusButton.text, bonusButton.x, bonusButton.y);
  }

  if (wall) {
    ctx.fillStyle = "#8b8b8b3b"; // gray fill
    ctx.strokeStyle = "#c5c5c5"; // gray border
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h, 10);
    ctx.fill();
    ctx.stroke();
  }

  drawBottomWord();

  requestAnimationFrame(loop);
}

// ================== UI ==================
function drawTopInfo() {
  ctx.font = "14px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "#cfe3ff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.fillText("Words repeated: " + repeatedCount, 16, 12);
  ctx.fillText("Wave: " + waveNumber, 16, 32); // under words repeated
}

function drawLives() {
  ctx.font = "16px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "#ff4c4c";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (let i = 0; i < lives; i++) {
    ctx.fillText("♥", 16 + i * 20, 50);
  }
}

function drawAimLine() {
  ctx.save();

  ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  ctx.beginPath();
  ctx.moveTo(bottomWordX, canvasLogicalHeight - 40);
  ctx.lineTo(bottomWordX, 0);
  ctx.stroke();

  ctx.restore();
}

function drawGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7a6a6";
  ctx.font = "bold 16px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", canvasLogicalWidth / 2, canvasLogicalHeight / 2);
}

// ================== HELPERS ==================
function pickNextBottomWord() {
  if (targets.length === 0) return;

  const t = targets[Math.floor(Math.random() * targets.length)];
  const oppositeLang = t.lang === "en" ? "ru" : "en";

  current = {
    pair: t.pair,
    lang: oppositeLang,
    text: t.pair[oppositeLang],
  };

  lastBottomWord = current;
}

spawnWave();
loop();
