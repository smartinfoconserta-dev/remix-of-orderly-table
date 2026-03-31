let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function beep(freq: number, durationMs: number, startOffset = 0) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.value = 0.3;
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + durationMs / 1000);
}

export function playSuccessSound(): void {
  try { beep(440, 200); } catch {}
}

export function playAlertSound(): void {
  try {
    beep(880, 150, 0);
    beep(880, 150, 0.25);
    beep(880, 150, 0.5);
  } catch {}
}

export function vibrateSuccess(): void {
  try { navigator.vibrate?.([100, 50, 100]); } catch {}
}

export function vibrateAlert(): void {
  try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}
}
