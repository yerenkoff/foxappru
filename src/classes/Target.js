import { setFont } from "../procedures/helpers.js";

export class Target {
  constructor(pair, lang, x, playEffect) {
    this.pair = pair;
    this.lang = lang;
    this.text = pair[lang];
    this.x = x;
    this.vy = 0.5;
    this.y = -Math.random() * 300 - 40;
    this.w = 0; // will calculate in draw()
    this.h = 16 + 18;
    this.dead = false;
    this.playEffect = playEffect;
  }

  update({ wall, canvasLogicalHeight, livesRef }) {
    // wall collision
    if (wall) {
      const wallTop = wall.y - wall.h / 2;
      const wallBottom = wall.y + wall.h / 2;
      const wallLeft = wall.x - wall.w / 2;
      const wallRight = wall.x + wall.w / 2;

      const targetTop = this.y - this.h / 2;
      const targetBottom = this.y + this.h / 2;
      const targetLeft = this.x - this.w / 2;
      const targetRight = this.x + this.w / 2;

      if (
        targetRight >= wallLeft &&
        targetLeft <= wallRight &&
        targetBottom >= wallTop &&
        targetTop <= wallBottom
      ) {
        this.vy = 0;
        this.y = wallTop - this.h / 2;
      }
    }

    if (!wall && this.vy === 0) this.vy = 0.2;

    this.y += this.vy;

    // // fell below canvas
    // if (this.y - this.h / 2 > canvasLogicalHeight) {
    //   livesRef.value--;
    //   this.dead = true;
    //   if (livesRef.value === 0) {
    //     this.playEffect("lose");
    //   }
    // }
  }

  draw(ctx) {
    setFont(ctx);

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
