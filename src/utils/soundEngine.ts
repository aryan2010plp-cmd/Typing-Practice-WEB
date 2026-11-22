// Web Audio API mechanical keyboard sound synthesis — zero-latency, no external files.

export type SoundProfile = "blue" | "brown" | "topre" | "typewriter" | "off";

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuffer = makeNoiseBuffer(ctx, 0.05);
  }
  return ctx;
}

function makeNoiseBuffer(ac: AudioContext, duration: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * duration);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function playNoise(ac: AudioContext, buffer: AudioBuffer, gain: number, filterFreq: number, duration: number) {
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 1.5;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(now);
  src.stop(now + duration);
}

function playTone(ac: AudioContext, freq: number, gain: number, duration: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = ac.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export function playKey(profile: SoundProfile) {
  if (profile === "off") return;
  const ac = getCtx();
  if (!ac || !noiseBuffer) return;
  if (ac.state === "suspended") ac.resume();

  switch (profile) {
    case "blue":
      // Clicky: sharp click + thock
      playTone(ac, 2200, 0.08, 0.012, "square");
      playNoise(ac, noiseBuffer, 0.12, 3500, 0.04);
      playNoise(ac, noiseBuffer, 0.06, 800, 0.06);
      break;
    case "brown":
      // Tactile: soft thock, no click
      playNoise(ac, noiseBuffer, 0.1, 1200, 0.05);
      playTone(ac, 180, 0.04, 0.03, "sine");
      break;
    case "topre":
      // Thocky: deep resonant thock
      playTone(ac, 120, 0.06, 0.08, "sine");
      playNoise(ac, noiseBuffer, 0.05, 600, 0.07);
      break;
    case "typewriter":
      // Typewriter: metallic clack
      playTone(ac, 1800, 0.1, 0.015, "square");
      playNoise(ac, noiseBuffer, 0.18, 4500, 0.03);
      playTone(ac, 900, 0.05, 0.02, "triangle");
      break;
  }
}

export function playError() {
  const ac = getCtx();
  if (!ac || !noiseBuffer) return;
  if (ac.state === "suspended") ac.resume();
  playTone(ac, 110, 0.12, 0.12, "sawtooth");
  playNoise(ac, noiseBuffer, 0.08, 200, 0.1);
}

export function resumeAudio() {
  const ac = getCtx();
  if (ac && ac.state === "suspended") ac.resume();
}
