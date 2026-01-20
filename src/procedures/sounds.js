// ================== sounds.js ==================

export let audioEnabled = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const soundBuffers = {};

// Load a sound and store it in the buffer
export async function loadSound(name, url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  soundBuffers[name] = audioBuffer;
}

// Play a sound effect
export function playEffect(name) {
  if (!audioEnabled) return; // stop all sounds if disabled
  const buffer = soundBuffers[name];
  if (!buffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
}

// Initialize sounds
export async function loadAllSounds() {
  await Promise.all([
    loadSound("shot", "assets/sounds/effects/shot.wav"),
    loadSound("error", "assets/sounds/effects/error12.wav"),
    loadSound("hit", "assets/sounds/effects/hit.wav"),
    loadSound("lose", "assets/sounds/effects/lose.wav"),
  ]);
  console.log("All sound buffers loaded");
}

// Toggle audio
export function setAudioEnabled(enabled) {
  audioEnabled = enabled;
  localStorage.setItem("audioEnabled", enabled);
}

// Initialize audio from localStorage
export function initAudio() {
  const saved = localStorage.getItem("audioEnabled");
  audioEnabled = saved === null ? true : saved === "true";
}
