let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

export function playDtmfTone(key: string, durationMs = 120) {
  const pair = DTMF_FREQUENCIES[key];
  const ctx = getCtx();
  if (!pair || !ctx) return;

  const now = ctx.currentTime;
  const end = now + durationMs / 1000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  gain.connect(ctx.destination);

  pair.forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now);
    osc.stop(end + 0.02);
  });
}

function playDualToneBurst(freqs: [number, number], duration: number, level = 0.1) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.02);
    gain.gain.setValueAtTime(level, now + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  });
}

let ringInterval: ReturnType<typeof setInterval> | null = null;

export function startRingtone() {
  stopRingtone();
  playDualToneBurst([440, 480], 2, 0.1);
  ringInterval = setInterval(() => playDualToneBurst([440, 480], 2, 0.1), 6000);
}

export function stopRingtone() {
  if (ringInterval) clearInterval(ringInterval);
  ringInterval = null;
}

let busyInterval: ReturnType<typeof setInterval> | null = null;
let busyCycles = 0;
const BUSY_MAX_CYCLES = 4;

export function startBusyTone() {
  stopBusyTone();
  busyCycles = 0;
  const burst = () => {
    if (busyCycles >= BUSY_MAX_CYCLES) {
      stopBusyTone();
      return;
    }
    playDualToneBurst([480, 620], 0.5, 0.12);
    busyCycles += 1;
  };
  burst();
  busyInterval = setInterval(burst, 1000);
}

export function stopBusyTone() {
  if (busyInterval) clearInterval(busyInterval);
  busyInterval = null;
  busyCycles = 0;
}
