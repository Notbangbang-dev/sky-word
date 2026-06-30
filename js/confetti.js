// Sky Word — celebratory "stardust" burst. CSS/canvas-drawn 4-point star sparks
// (no image assets) that drift down under gravity. Used on a win.

let canvas = null;
let cctx = null;
let sparks = [];
let raf = 0;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.appendChild(canvas);
  cctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// Draw a 4-point sparkle (a "twinkle") centered at the origin.
function drawSpark(ctx, r) {
  ctx.beginPath();
  const inner = r * 0.32;
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i;
    const rad = i % 2 === 0 ? r : inner;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Launch a burst of star sparks.
 * @param {number} count number of particles
 */
export function burst(count = 90) {
  ensureCanvas();
  const palette = [
    cssVar('--correct', '#2BE6C8'),
    cssVar('--present', '#FFB23E'),
    cssVar('--accent', '#C04BFF'),
    cssVar('--star', '#EAF0FF'),
    '#FFFFFF',
  ];
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    sparks.push({
      x: w * (0.5 + (Math.random() - 0.5) * 0.5),
      y: window.innerHeight * 0.28 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 7,
      vy: Math.random() * -6 - 2, // shoot up first, then gravity pulls down
      g: 0.16 + Math.random() * 0.12,
      r: 4 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 90 + Math.random() * 60,
      color: palette[(Math.random() * palette.length) | 0],
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  if (!raf) tick();
}

function tick() {
  raf = requestAnimationFrame(tick);
  cctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life++;
    s.vy += s.g;
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.99;
    s.rot += s.vrot;
    s.twinkle += 0.2;
    const fade = 1 - s.life / s.maxLife;
    if (fade <= 0 || s.y > window.innerHeight + 40) {
      sparks.splice(i, 1);
      continue;
    }
    const pulse = 0.7 + 0.3 * Math.sin(s.twinkle);
    cctx.save();
    cctx.translate(s.x, s.y);
    cctx.rotate(s.rot);
    cctx.globalAlpha = Math.max(0, fade) * pulse;
    cctx.fillStyle = s.color;
    cctx.shadowColor = s.color;
    cctx.shadowBlur = 12;
    drawSpark(cctx, s.r);
    cctx.restore();
  }
  if (!sparks.length) {
    cancelAnimationFrame(raf);
    raf = 0;
    cctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** Single meteor streak across the upper sky (used alongside a win). */
export function meteor() {
  ensureCanvas();
  const startX = window.innerWidth * (0.6 + Math.random() * 0.3);
  const startY = window.innerHeight * (0.1 + Math.random() * 0.15);
  const len = 160 + Math.random() * 120;
  let t = 0;
  const dur = 38;
  const angle = Math.PI * 0.78;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = () => {
    if (t > dur) return;
    const p = t / dur;
    const headX = startX + dx * 420 * p;
    const headY = startY + dy * 420 * p;
    const grad = cctx.createLinearGradient(headX, headY, headX - dx * len, headY - dy * len);
    const c = cssVar('--star', '#EAF0FF');
    grad.addColorStop(0, c);
    grad.addColorStop(1, 'transparent');
    cctx.save();
    cctx.globalAlpha = Math.sin(p * Math.PI);
    cctx.strokeStyle = grad;
    cctx.lineWidth = 2.5;
    cctx.lineCap = 'round';
    cctx.beginPath();
    cctx.moveTo(headX, headY);
    cctx.lineTo(headX - dx * len, headY - dy * len);
    cctx.stroke();
    cctx.restore();
    t++;
    if (!raf) requestAnimationFrame(step); // ride along if confetti loop isn't running
    else requestAnimationFrame(step);
  };
  step();
}
