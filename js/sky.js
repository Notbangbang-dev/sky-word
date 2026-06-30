// Sky Word — the living observatory sky. A single canvas renders a parallax
// starfield + occasional meteors; the body gradient, aurora hue, and sun/moon
// are driven by the real local clock so the backdrop shifts dawn -> day ->
// dusk -> night. Phase also drives the 'auto' theme. All motion pauses when the
// tab is hidden and is disabled under reduced motion.

const PHASES = {
  dawn: {
    // local hours [5,8)
    theme: 'light',
    grad: ['#1d2350', '#5b4b86', '#e8a07a'],
    auroraHue: 28,
    starAlpha: 0.35,
  },
  day: {
    // [8,17)
    theme: 'light',
    grad: ['#cbd8f2', '#dce6f6', '#eef3fb'],
    auroraHue: 175,
    starAlpha: 0.0,
  },
  dusk: {
    // [17,20)
    theme: 'dark',
    grad: ['#241a4a', '#6a2b6b', '#c2613f'],
    auroraHue: 320,
    starAlpha: 0.45,
  },
  night: {
    // [20,5)
    theme: 'dark',
    grad: ['#05060f', '#0a0e22', '#04050e'],
    auroraHue: 270,
    starAlpha: 1.0,
  },
};

export function phaseForHour(h) {
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}

let canvas = null;
let ctx = null;
let stars = [];
let raf = 0;
let lastMeteor = 0;
let reducedMotion = false;
let currentPhase = null;
let onPhaseChange = null;
let frame = 0;

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function makeStars() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const count = Math.min(220, Math.floor((w * h) / 7000));
  stars = [];
  for (let i = 0; i < count; i++) {
    const depth = Math.random(); // 0 far .. 1 near
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.92,
      r: 0.4 + depth * 1.6,
      depth,
      speed: 0.02 + depth * 0.12,
      tw: Math.random() * Math.PI * 2,
      twSpeed: rand(0.005, 0.02),
    });
  }
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeStars();
}

function applyPhase(phase, { animate = true } = {}) {
  const p = PHASES[phase];
  const root = document.documentElement;
  root.style.setProperty('--sky-top', p.grad[0]);
  root.style.setProperty('--sky-mid', p.grad[1]);
  root.style.setProperty('--sky-bottom', p.grad[2]);
  root.style.setProperty('--aurora-hue', String(p.auroraHue));
  root.style.setProperty('--star-alpha', String(p.starAlpha));
  document.body.dataset.phase = phase;
  positionCelestial(phase);
  if (currentPhase !== phase) {
    currentPhase = phase;
    if (onPhaseChange) onPhaseChange(phase, p.theme);
  }
}

// Move the sun (day phases) or moon (night phases) along a horizon arc by hour.
function positionCelestial(phase) {
  const el = document.getElementById('celestial');
  if (!el) return;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  const isDay = phase === 'day' || phase === 'dawn';
  // Map a 14h day arc (5->19) or night arc to 0..1 across the screen.
  let t;
  if (isDay) t = clamp((h - 5) / 14, 0, 1);
  else t = clamp(((h + 24 - 19) % 24) / 10, 0, 1);
  const x = 8 + t * 84; // vw
  const y = 22 - Math.sin(t * Math.PI) * 14; // arc height (lower number = higher)
  el.style.left = `${x}vw`;
  el.style.top = `${y}vh`;
  el.dataset.body = isDay ? 'sun' : 'moon';
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function tick() {
  raf = requestAnimationFrame(tick);
  if (document.hidden || reducedMotion) return;
  frame++;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const baseAlpha = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--star-alpha'),
  ) || 0;
  if (baseAlpha > 0.001) {
    const starColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--star')
      .trim() || '#EAF0FF';
    for (const s of stars) {
      s.x -= s.speed;
      if (s.x < -2) s.x = w + 2;
      s.tw += s.twSpeed;
      const twinkle = 0.6 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = baseAlpha * twinkle * (0.5 + s.depth * 0.5);
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Rare meteor at night/dusk.
    lastMeteor++;
    if (lastMeteor > 360 && Math.random() < 0.004) {
      lastMeteor = 0;
      shootMeteor(starColor);
    }
  }
}

let meteors = [];
function shootMeteor(color) {
  meteors.push({
    x: rand(window.innerWidth * 0.4, window.innerWidth),
    y: rand(0, window.innerHeight * 0.3),
    t: 0,
  });
  if (meteors.length === 1) animateMeteors(color);
}

function animateMeteors(color) {
  const step = () => {
    if (!meteors.length) return;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.t += 1;
      const len = 130;
      const dx = -2.6,
        dy = 2.0;
      const hx = m.x + dx * 16 * m.t * 0.25;
      const hy = m.y + dy * 16 * m.t * 0.25;
      const g = ctx.createLinearGradient(hx, hy, hx - dx * len, hy - dy * len);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = Math.sin((m.t / 40) * Math.PI);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - dx * len, hy - dy * len);
      ctx.stroke();
      ctx.restore();
      if (m.t > 40) meteors.splice(i, 1);
    }
    if (meteors.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Initialize the sky.
 * @param {object} opts
 * @param {boolean} opts.reducedMotion disable starfield/meteor motion
 * @param {(phase:string, theme:string)=>void} opts.onPhaseChange called when the
 *        local time phase changes (so 'auto' theme can follow it)
 */
export function initSky({ reducedMotion: rm = false, onPhaseChange: cb = null } = {}) {
  reducedMotion = rm;
  onPhaseChange = cb;
  canvas = document.getElementById('starfield');
  if (canvas) {
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  refresh({ animate: false });
  // Re-evaluate the phase every minute (cheap) so the sky tracks real time.
  setInterval(() => refresh(), 60000);
  if (canvas && !reducedMotion) tick();
}

/** Recompute the current phase from the clock and apply it. */
export function refresh(opts = {}) {
  const h = new Date().getHours();
  applyPhase(phaseForHour(h), opts);
}

/** The theme ('light'|'dark') implied by the current time-of-day phase. */
export function autoTheme() {
  return PHASES[phaseForHour(new Date().getHours())].theme;
}

export function setReducedMotion(on) {
  reducedMotion = on;
  if (!on && canvas && !raf) tick();
}
