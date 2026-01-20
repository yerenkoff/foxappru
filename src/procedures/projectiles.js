// procedures/projectiles.js

import { playEffect } from "./sounds.js";

export let projectiles = [];

export function updateProjectiles(
  targets,
  gunQueue,
  gunWordIndexRef,
  canvasLogicalWidth,
  canvasLogicalHeight,
  spawnWave,
  spawnWord,
  activeWords,
) {
  for (let p = projectiles.length - 1; p >= 0; p--) {
    const proj = projectiles[p];
    proj.x += proj.vx;
    proj.y += proj.vy;

    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];

      if (t.y + t.h / 2 > canvasLogicalHeight - 80) continue;

      const hit =
        proj.x + 6 >= t.x - t.w / 2 &&
        proj.x - 6 <= t.x + t.w / 2 &&
        proj.y + 6 >= t.y - t.h / 2 &&
        proj.y - 6 <= t.y + t.h / 2;

      if (hit) {
        if (t.pair === proj.pair && t.text !== proj.word) {
          targets.splice(i, 1);
          playEffect("hit");

          const indexInGun = gunQueue.indexOf(t);
          if (indexInGun !== -1) {
            gunQueue.splice(indexInGun, 1);
            if (gunWordIndexRef.value >= gunQueue.length) gunWordIndexRef.value = 0;
          }

        } else {
          applyPunishment(t, spawnWord, activeWords);
        }

        projectiles.splice(p, 1);
        if (!targets.length) spawnWave();
        break;
      }
    }

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

function applyPunishment(t, spawnWord, activeWords) {
  const punishment = Math.floor(Math.random() * 3);
  if (punishment === 0) t.vy += 0.15;
  else if (punishment === 1) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < count; k++) {
      const pair = activeWords[Math.floor(Math.random() * activeWords.length)];
      spawnWord(pair);
    }
  } 
  // else {
  //   livesRef.value--;
  // }
  playEffect("error");
}
