import { setFont } from "./helpers.js";

export function drawButton(ctx, obj, fillColor, strokeColor) {
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(obj.x - obj.w / 2, obj.y - obj.h / 2, obj.w, obj.h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setFont(ctx);
  ctx.fillText(obj.text, obj.x, obj.y);
}

export function drawGun(ctx, current, canvasLogicalWidth, canvasLogicalHeight) {
  if (!current) return;
  const padX = 18,
    padY = 10;
  setFont(ctx);
  const w = ctx.measureText(current.text).width + padX * 2;
  const h = 16 + padY * 2;
  const x = canvasLogicalWidth / 2;
  const y = canvasLogicalHeight - 40;

  ctx.fillStyle = "#143a2a";
  ctx.strokeStyle = "#5bc88f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(current.text, x, y);
}

export function drawTopInfo(ctx, repeatedCount, waveNumber) {
  setFont(ctx, 14);
  ctx.fillStyle = "#cfe3ff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Words repeated: ${repeatedCount}`, 16, 12);
  ctx.fillText(`Wave: ${waveNumber}`, 16, 32);
}

export function drawGameOver(ctx, canvas, canvasLogicalWidth, canvasLogicalHeight) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f7a6a6";
  setFont(ctx, 16, true);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", canvasLogicalWidth / 2, canvasLogicalHeight / 2);
}
