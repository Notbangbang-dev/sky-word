// Sky Word — generative audio palette (Web Audio API, zero asset files).
// All tones are synthesized on demand. Silent until enabled, and the context
// is created lazily on the first sound after a user gesture (browser policy).

let ctx = null;
let enabled = false;
let master = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = !!on;
  if (enabled) {
    const c = ensureContext();
    // Resume if the context was suspended (autoplay policy).
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }
}

export function isSoundEnabled() {
  return enabled;
}

// Play a single shaped tone. Envelope avoids clicks.
function tone({ freq, type = 'sine', start = 0, dur = 0.18, gain = 0.2, glideTo = null }) {
  if (!enabled) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Soft marimba-ish tick on key tap (two stacked partials, very short).
export function playTick() {
  tone({ freq: 320, type: 'triangle', dur: 0.06, gain: 0.12 });
  tone({ freq: 640, type: 'sine', dur: 0.05, gain: 0.05 });
}

// Subtle click as a tile reveals (pitch rises across the row via `step`).
export function playReveal(step = 0) {
  tone({ freq: 420 + step * 60, type: 'sine', dur: 0.07, gain: 0.07, start: step * 0.02 });
}

// Rising major chord on a win.
export function playWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone({ freq: f, type: 'sine', start: i * 0.09, dur: 0.5, gain: 0.16 }));
}

// Low "signal lost" descending tone on a loss.
export function playLose() {
  tone({ freq: 220, type: 'sine', dur: 0.7, gain: 0.18, glideTo: 110 });
  tone({ freq: 138, type: 'triangle', dur: 0.7, gain: 0.1, glideTo: 92 });
}

// Gentle two-tone "static" on an invalid word (never harsh).
export function playInvalid() {
  tone({ freq: 196, type: 'sawtooth', dur: 0.12, gain: 0.06 });
  tone({ freq: 185, type: 'sawtooth', dur: 0.12, gain: 0.06, start: 0.05 });
}
