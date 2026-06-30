// Sky Word — DOM / view layer. Builds the board + keyboard, runs the ignite
// reveal animation, draws the constellation reward, and manages modals, toasts,
// stats, and the countdown. Game rules live in game.js; this file only renders.

import { keyStates } from './game.js';
import * as sound from './sound.js';

const KEY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
];

export const el = {};
let toastTimer = 0;
let countdownTimer = 0;
let lastFocused = null;
let trapHandler = null;
let activeModalId = null;

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function cacheDom() {
  el.board = document.getElementById('board');
  el.keyboard = document.getElementById('keyboard');
  el.message = document.getElementById('message');
  el.toast = document.getElementById('toast');
  el.overlay = document.getElementById('overlay');
  el.lines = document.getElementById('constellation-lines');
  el.constLabel = document.getElementById('constellation-label');
  el.dailyMeta = document.getElementById('daily-meta');
  el.statsGrid = document.getElementById('stats-grid');
  el.dist = document.getElementById('dist');
  el.countdown = document.getElementById('countdown');
  el.chartList = document.getElementById('chart-list');
}

// ---- board ----------------------------------------------------------------

export function buildBoard(len, rows = 6) {
  el.board.style.setProperty('--len', len);
  el.board.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.row = r;
    for (let c = 0; c < len; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.row = r;
      tile.dataset.col = c;
      const face = document.createElement('span');
      face.className = 'tile-face';
      tile.appendChild(face);
      row.appendChild(tile);
    }
    el.board.appendChild(row);
  }
  clearConstellation();
}

function rowTiles(r) {
  return el.board.querySelectorAll(`.tile[data-row="${r}"]`);
}

const STATE_WORD = {
  correct: 'correct spot',
  present: 'in the word, wrong spot',
  absent: 'not in the word',
};

function labelTile(tile, letter, state) {
  if (!letter) {
    tile.removeAttribute('aria-label');
    return;
  }
  const L = letter.toUpperCase();
  tile.setAttribute('aria-label', state ? `${L}, ${STATE_WORD[state] || ''}` : L);
}

/** Re-render the active (current) row from the game's typing buffer. */
export function syncActiveRow(game) {
  const r = game.guesses.length;
  if (r >= game.maxGuesses) return;
  const tiles = rowTiles(r);
  for (let c = 0; c < game.len; c++) {
    const ch = game.current[c] || '';
    const tile = tiles[c];
    if (!tile) continue;
    tile.querySelector('.tile-face').textContent = ch.toUpperCase();
    tile.classList.toggle('filled', !!ch);
    labelTile(tile, ch, null);
    // brief "charge" pop on the most recently typed tile
    if (ch && c === game.current.length - 1) {
      tile.classList.remove('pop');
      void tile.offsetWidth; // restart animation
      tile.classList.add('pop');
    }
  }
}

/** Render a completed guess immediately (no animation) — used on resume. */
export function paintRow(rowIndex, word, result) {
  const tiles = rowTiles(rowIndex);
  for (let c = 0; c < word.length; c++) {
    const tile = tiles[c];
    if (!tile) continue;
    tile.querySelector('.tile-face').textContent = word[c].toUpperCase();
    tile.classList.add('filled', 'revealed');
    tile.dataset.state = result[c];
    labelTile(tile, word[c], result[c]);
  }
}

/**
 * Animate a row's reveal (ignite, staggered). Resolves when finished.
 */
export function revealRow(game, rowIndex, result, { reduced = false, withSound = false } = {}) {
  const tiles = rowTiles(rowIndex);
  const word = game.guesses[rowIndex].word;
  const stagger = 0.12;
  const dur = 0.5;

  return new Promise((resolve) => {
    tiles.forEach((tile, c) => {
      tile.querySelector('.tile-face').textContent = word[c].toUpperCase();
      tile.classList.add('filled');
      if (reduced) {
        tile.dataset.state = result[c];
        tile.classList.add('revealed');
        labelTile(tile, word[c], result[c]);
        return;
      }
      tile.style.setProperty('--reveal-delay', `${c * stagger}s`);
      // set state at the ignite peak so color blooms with the flash
      setTimeout(() => {
        tile.dataset.state = result[c];
        tile.classList.add('revealed');
        labelTile(tile, word[c], result[c]);
        if (withSound) sound.playReveal(c);
      }, (c * stagger + dur * 0.45) * 1000);
      tile.classList.add('reveal');
    });

    const total = reduced ? 0 : (game.len - 1) * stagger + dur;
    setTimeout(() => {
      tiles.forEach((t) => t.classList.remove('reveal'));
      updateKeyboard(game);
      resolve();
    }, total * 1000 + 30);
  });
}

export function shakeRow(rowIndex) {
  const row = el.board.querySelector(`.row[data-row="${rowIndex}"]`);
  if (!row) return;
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
  setTimeout(() => row.classList.remove('shake'), 400);
}

export function bounceRow(rowIndex) {
  const tiles = rowTiles(rowIndex);
  tiles.forEach((t, i) => {
    t.style.setProperty('--bounce-delay', `${i * 0.08}s`);
    t.classList.add('win-bounce');
  });
}

// ---- keyboard -------------------------------------------------------------

export function buildKeyboard(onKey) {
  el.keyboard.innerHTML = '';
  for (const row of KEY_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';
    for (const k of row) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key';
      key.dataset.key = k;
      key.setAttribute('aria-label', k === 'enter' ? 'Enter' : k === 'back' ? 'Backspace' : k);
      if (k === 'enter' || k === 'back') key.classList.add('key-wide');
      if (k === 'enter') key.textContent = 'Enter';
      else if (k === 'back') key.innerHTML = '<span aria-hidden="true">⌫</span>';
      else {
        const span = document.createElement('span');
        span.className = 'key-label';
        span.textContent = k.toUpperCase();
        key.appendChild(span);
      }
      key.addEventListener('click', () => {
        onKey(k === 'back' ? 'backspace' : k);
        key.blur();
      });
      rowEl.appendChild(key);
    }
    el.keyboard.appendChild(rowEl);
  }
}

export function updateKeyboard(game) {
  const states = keyStates(game.guesses);
  el.keyboard.querySelectorAll('.key').forEach((key) => {
    const k = key.dataset.key;
    if (k === 'enter' || k === 'back') return;
    const s = states[k];
    if (s) key.dataset.state = s;
    else delete key.dataset.state;
  });
}

export function flashKey(k) {
  const key = el.keyboard.querySelector(`.key[data-key="${k === 'backspace' ? 'back' : k}"]`);
  if (!key) return;
  key.classList.remove('press');
  void key.offsetWidth;
  key.classList.add('press');
  setTimeout(() => key.classList.remove('press'), 140);
}

// ---- messages / toast -----------------------------------------------------

export function showMessage(text) {
  el.message.textContent = text || '';
}

export function toast(text, ms = 1600) {
  el.toast.textContent = text;
  el.toast.hidden = false;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove('show');
    setTimeout(() => (el.toast.hidden = true), 250);
  }, ms);
}

// ---- constellation reward -------------------------------------------------

export function clearConstellation() {
  if (el.lines) el.lines.innerHTML = '';
  if (el.constLabel) {
    el.constLabel.hidden = true;
    el.constLabel.textContent = '';
  }
}

/**
 * Draw a constellation by connecting the winning row's tile centers with a
 * deterministic zig-zag, animating the stroke on, then revealing the name.
 */
export function drawConstellation(name, rowIndex, seed = 0, { reduced = false } = {}) {
  if (!el.lines) return;
  const svg = el.lines;
  const wrapRect = svg.parentElement.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${wrapRect.width} ${wrapRect.height}`);
  svg.innerHTML = '';

  const tiles = rowTiles(rowIndex);
  if (!tiles.length) return;
  const pts = [];
  let h = seed >>> 0;
  tiles.forEach((t) => {
    const r = t.getBoundingClientRect();
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const jitter = ((h % 1000) / 1000 - 0.5) * r.height * 0.7;
    pts.push({
      x: r.left - wrapRect.left + r.width / 2,
      y: r.top - wrapRect.top + r.height / 2 + jitter,
    });
  });

  const ns = 'http://www.w3.org/2000/svg';
  // connecting polyline
  const poly = document.createElementNS(ns, 'polyline');
  poly.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
  poly.setAttribute('class', 'const-line');
  svg.appendChild(poly);

  // star nodes
  for (const p of pts) {
    const star = document.createElementNS(ns, 'circle');
    star.setAttribute('cx', p.x);
    star.setAttribute('cy', p.y);
    star.setAttribute('r', '3.4');
    star.setAttribute('class', 'const-star');
    svg.appendChild(star);
  }

  if (!reduced) {
    const length = poly.getTotalLength();
    poly.style.strokeDasharray = String(length);
    poly.style.strokeDashoffset = String(length);
    // force layout then animate
    void poly.getBoundingClientRect();
    poly.style.transition = 'stroke-dashoffset 700ms ease-out';
    requestAnimationFrame(() => (poly.style.strokeDashoffset = '0'));
  }

  el.constLabel.textContent = `✦ ${name}`;
  el.constLabel.hidden = false;
  el.constLabel.classList.remove('rise');
  void el.constLabel.offsetWidth;
  el.constLabel.classList.add('rise');
}

// ---- modals ---------------------------------------------------------------

export function openModal(id) {
  // If a modal is already open, swap without clobbering the saved focus.
  if (el.overlay.hidden) lastFocused = document.activeElement;
  detachTrap();
  el.overlay.hidden = false;
  el.overlay.querySelectorAll('.modal').forEach((m) => (m.hidden = m.id !== id));
  requestAnimationFrame(() => el.overlay.classList.add('show'));

  const modal = document.getElementById(id);
  activeModalId = id;
  const first = modal.querySelector(FOCUSABLE);
  if (first) first.focus();

  // Trap Tab within the modal (cycle first <-> last focusable).
  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const f = [...modal.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const firstEl = f[0];
    const lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };
  modal.addEventListener('keydown', trapHandler);
}

function detachTrap() {
  if (activeModalId && trapHandler) {
    const m = document.getElementById(activeModalId);
    if (m) m.removeEventListener('keydown', trapHandler);
  }
  trapHandler = null;
}

export function closeModal() {
  detachTrap();
  activeModalId = null;
  el.overlay.classList.remove('show');
  setTimeout(() => {
    el.overlay.hidden = true;
    el.overlay.querySelectorAll('.modal').forEach((m) => (m.hidden = true));
  }, 200);
  // Restore focus only if the previously-focused element is still in the DOM.
  if (lastFocused && lastFocused.isConnected && lastFocused.focus) lastFocused.focus();
}

export function isModalOpen() {
  return !el.overlay.hidden;
}

// ---- stats ----------------------------------------------------------------

export function renderStats(stats) {
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const cards = [
    ['Played', stats.played],
    ['Win %', winPct],
    ['Streak', stats.currentStreak],
    ['Best', stats.maxStreak],
  ];
  el.statsGrid.innerHTML = cards
    .map(
      ([label, val]) =>
        `<div class="stat-card"><span class="stat-num">${val}</span><span class="stat-label">${label}</span></div>`,
    )
    .join('');
}

export function renderDist(stats, highlight = -1) {
  const dist = stats.dist || {};
  const max = Math.max(1, ...Object.values(dist));
  let html = '';
  for (let i = 1; i <= 6; i++) {
    const n = dist[i] || 0;
    const pct = Math.round((n / max) * 100);
    const hi = i === highlight ? ' is-current' : '';
    html += `<div class="dist-row">
      <span class="dist-guess">${i}</span>
      <div class="dist-bar-track"><div class="dist-bar${hi}" style="width:${Math.max(8, pct)}%">${n}</div></div>
    </div>`;
  }
  el.dist.innerHTML = html;
}

export function startCountdown(getMs) {
  clearInterval(countdownTimer);
  const update = () => {
    const ms = getMs();
    if (ms <= 0) {
      el.countdown.innerHTML = '<strong>A new transmission has arrived.</strong> Refresh to play.';
      clearInterval(countdownTimer);
      return;
    }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const pad = (x) => String(x).padStart(2, '0');
    el.countdown.innerHTML = `Next transmission in <strong>${pad(h)}:${pad(m)}:${pad(s)}</strong>`;
  };
  update();
  countdownTimer = setInterval(update, 1000);
}

export function stopCountdown() {
  clearInterval(countdownTimer);
  el.countdown.innerHTML = '';
}

// ---- star chart -----------------------------------------------------------

export function renderChart(list) {
  if (!list.length) {
    el.chartList.innerHTML =
      '<p class="empty-chart">No constellations charted yet. Solve a Daily Transmission to light your first one.</p>';
    return;
  }
  el.chartList.innerHTML = list
    .slice()
    .reverse()
    .map(
      (c) => `<div class="chart-item">
        <span class="chart-star">✦</span>
        <div class="chart-meta">
          <strong>${escapeHtml(c.name)}</strong>
          <span>${escapeHtml(c.word.toUpperCase())} · #${c.puzzle ?? '—'} · ${c.guesses}/6</span>
        </div>
        <span class="chart-date">${escapeHtml(c.date)}</span>
      </div>`,
    )
    .join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
