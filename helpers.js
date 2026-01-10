export function setFont(ctx, size = 16, bold = false) {
  ctx.font = `${bold ? "bold " : ""}${size}px 'IBM Plex Sans', sans-serif`;
}

export function resizeCanvas(canvas) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let cw, ch;

  if (w > h) cw = ch = h;
  else cw = w, ch = Math.min(h, w * 2);

  const dpr = window.devicePixelRatio || 1;

  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    ctx,
    canvasLogicalWidth: cw,
    canvasLogicalHeight: ch
  };
}
