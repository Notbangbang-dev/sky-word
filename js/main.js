// Sky Word — application controller. Wires the game model, view, sky engine,
// audio, sharing, and persistence together and owns the input/submit flow.

import {
  Game,
  dailyAnswer,
  dailyNumber,
  localDateKey,
  msUntilTomorrow,
  randomAnswer,
  constellationFor,
} from './game.js';
import { isLocalWord } from './words.js';
import * as ui from './ui.js';
import * as sky from './sky.js';
import * as sound from './sound.js';
import * as confetti from './confetti.js';
import { buildShareText, copyText } from './share.js';
import {
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  loadDaily,
  saveDaily,
  loadConstellations,
  addConstellation,
} from './storage.js';

// Set this to your published URL to include a play link in shares + settings.
const REPO_URL = '';

const MSG = {
  winFirst: 'First light — solved on the very first try. The sky was listening. ✦',
  winLast: 'Caught it on the last row — but the map is complete. ✦',
  win: [
    'Transmission received in {n}. Adding this one to your star chart.',
    'Coordinates confirmed in {n}. Beautifully done. ✦',
    'Signal locked in {n}. Constellation charted.',
    'Solved in {n} — the sky was listening. ✦',
  ],
  lose: [
    'Signal lost. The word was drifting just out of reach: {WORD}.',
    'Dark sky tonight. It was {WORD}. Tomorrow’s transmission is already on its way.',
    'Faded to black — it was {WORD}. Even astronomers miss a night.',
  ],
  notInList: 'Not in the catalog. No such word out there (yet).',
  notEnough: 'Signal too weak — not enough letters to lock in.',
  unreachable: 'Catalog unreachable — only charted (offline) words for now.',
};

const state = {
  settings: loadSettings(),
  stats: loadStats(),
  mode: 'daily', // 'daily' | 'unlimited'
  len: 5,
  game: null,
  puzzleNumber: null,
  constellation: null,
  busy: false,
  lookupAbort: null,
};

// ---- boot -----------------------------------------------------------------

function init() {
  ui.cacheDom();
  ui.buildKeyboard(handleKey);
  applySettingsToDom();
  initTheme();

  sky.initSky({
    reducedMotion: resolveReducedMotion(),
    onPhaseChange: (_phase, theme) => {
      if (state.settings.theme === 'auto') applyTheme(theme);
    },
  });

  bindChrome();
  bindSettings();
  startDaily();

  if (!localStorage.getItem('skyword:seen-help')) {
    ui.openModal('help-modal');
    try {
      localStorage.setItem('skyword:seen-help', '1');
    } catch {
      /* ignore */
    }
  }
}

// ---- theme & motion -------------------------------------------------------

function resolveReducedMotion() {
  const r = state.settings.reducedMotion;
  if (r === 'on') return true;
  if (r === 'off') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function effectiveTheme() {
  return state.settings.theme === 'auto' ? sky.autoTheme() : state.settings.theme;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#EAEEF6' : '#060814');
  const glyph = document.querySelector('#btn-theme .theme-glyph');
  if (glyph) glyph.textContent = theme === 'light' ? '☀' : '☾';
}

function initTheme() {
  applyTheme(effectiveTheme());
}

function applySettingsToDom() {
  document.body.classList.toggle('show-glyphs', !!state.settings.glyphs);
  document.body.classList.toggle('high-contrast', !!state.settings.highContrast);
  document.body.classList.toggle('reduced-motion', resolveReducedMotion());
  sound.setSoundEnabled(!!state.settings.sound);
}

// ---- mode + game lifecycle -------------------------------------------------

function startDaily() {
  abortPending();
  state.mode = 'daily';
  state.len = 5;
  const dateKey = localDateKey();
  const answer = dailyAnswer();
  state.puzzleNumber = dailyNumber();
  state.constellation = constellationFor(dateKey);

  const saved = loadDaily();
  let game;
  if (saved && saved.date === dateKey && saved.answer === answer) {
    game = Game.fromJSON(saved);
  } else {
    game = new Game({
      mode: 'daily',
      len: 5,
      answer,
      seed: dateKey,
      hardMode: state.settings.hardMode,
    });
  }
  state.game = game;

  ui.buildBoard(5);
  ui.stopCountdown();
  game.guesses.forEach((g, i) => ui.paintRow(i, g.word, g.result));
  ui.updateKeyboard(game);
  setModeUi();
  ui.showMessage('');

  if (game.status !== 'playing') {
    showEndState();
  }
}

// Cancel any in-flight word lookup and clear the input lock when (re)starting.
function abortPending() {
  if (state.lookupAbort) {
    state.lookupAbort.abort();
    state.lookupAbort = null;
  }
  state.busy = false;
}

function startUnlimited(len) {
  abortPending();
  state.mode = 'unlimited';
  state.len = len;
  state.puzzleNumber = null;
  state.constellation = null;
  state.game = new Game({
    mode: 'unlimited',
    len,
    answer: randomAnswer(len),
    hardMode: state.settings.hardMode,
  });
  ui.buildBoard(len);
  ui.updateKeyboard(state.game);
  ui.stopCountdown();
  ui.clearConstellation();
  setModeUi();
  ui.showMessage(`Deep Space · ${len} letters · find the word.`);
}

function setModeUi() {
  const isDaily = state.mode === 'daily';
  document.getElementById('tab-daily').classList.toggle('is-active', isDaily);
  document.getElementById('tab-daily').setAttribute('aria-selected', String(isDaily));
  document.getElementById('tab-unlimited').classList.toggle('is-active', !isDaily);
  document.getElementById('tab-unlimited').setAttribute('aria-selected', String(!isDaily));
  document.getElementById('unlimited-controls').hidden = isDaily;

  const meta = ui.el.dailyMeta;
  if (isDaily) {
    meta.innerHTML = `<span class="puzzle-no">#${state.puzzleNumber}</span><span class="puzzle-sub">${
      state.settings.hardMode ? 'Locked Coordinates · ' : ''
    }${state.constellation}</span>`;
  } else {
    meta.innerHTML = state.settings.hardMode ? '<span class="puzzle-sub">Locked Coordinates</span>' : '';
  }
}

// ---- input ----------------------------------------------------------------

function handleKey(key) {
  if (state.busy) return;
  const game = state.game;
  if (!game) return;

  if (key === 'enter') {
    submitFlow();
    return;
  }
  if (game.status !== 'playing') return;

  if (key === 'backspace') {
    if (game.removeLetter()) {
      ui.syncActiveRow(game);
      ui.flashKey('back');
    }
    return;
  }
  if (/^[a-z]$/.test(key)) {
    if (game.addLetter(key)) {
      ui.syncActiveRow(game);
      ui.flashKey(key);
      sound.playTick();
    }
  }
}

async function validateGuess(word) {
  if (isLocalWord(word)) return { ok: true, networkError: false };
  if (state.settings.onlineWords && navigator.onLine) return lookupOnline(word);
  return { ok: false, networkError: false };
}

async function lookupOnline(word) {
  const ctrl = new AbortController();
  state.lookupAbort = ctrl;
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: ctrl.signal },
    );
    clearTimeout(t);
    return { ok: res.ok, networkError: false };
  } catch {
    clearTimeout(t);
    return { ok: false, networkError: true }; // timeout / offline / blocked / aborted
  }
}

async function submitFlow() {
  const game = state.game;
  if (!game || game.status !== 'playing' || state.busy) return;
  const rowIndex = game.guesses.length;
  const word = game.current;

  if (word.length !== game.len) {
    rejectGuess(rowIndex, MSG.notEnough);
    return;
  }

  state.busy = true; // set synchronously so a second Enter can't double-submit
  let slowToast;
  try {
    // Only hint "checking" if the dictionary lookup is actually slow.
    slowToast = setTimeout(() => ui.toast('Checking the catalog…', 2400), 280);
    const valid = await validateGuess(word);
    clearTimeout(slowToast);

    // The player may have switched modes / started a new game during the await.
    if (state.game !== game || game.status !== 'playing') return;

    if (!valid.ok) {
      rejectGuess(rowIndex, valid.networkError ? MSG.unreachable : MSG.notInList);
      return;
    }

    const hmErr = game.hardModeError(word);
    if (hmErr) {
      rejectGuess(rowIndex, hmErr);
      return;
    }

    game.submit();
    const reduced = resolveReducedMotion();
    await ui.revealRow(game, rowIndex, game.guesses[rowIndex].result, {
      reduced,
      withSound: state.settings.sound,
    });
    if (state.game !== game) return; // game replaced mid-reveal — drop the result

    if (game.status === 'won' || game.status === 'lost') finishGame(rowIndex);
    else if (state.mode === 'daily') persistDaily();
  } finally {
    clearTimeout(slowToast);
    if (state.game === game) state.busy = false;
  }
}

function rejectGuess(rowIndex, message) {
  ui.shakeRow(rowIndex);
  ui.toast(message);
  ui.showMessage(message);
  sound.playInvalid();
}

// ---- finishing ------------------------------------------------------------

function finishGame(rowIndex) {
  const game = state.game;
  const reduced = resolveReducedMotion();

  if (game.status === 'won') {
    sound.playWin();
    ui.bounceRow(rowIndex);
    if (!reduced) {
      confetti.burst(110);
      confetti.meteor();
    }
    const n = game.guesses.length;
    let line;
    if (n === 1) line = MSG.winFirst;
    else if (n === game.maxGuesses) line = MSG.winLast;
    else line = pick(MSG.win).replace('{n}', `${n}/6`);
    ui.showMessage(line);

    if (state.mode === 'daily') {
      recordDaily(true, n);
      const entry = {
        date: localDateKey(),
        name: state.constellation,
        word: game.answer,
        guesses: n,
        puzzle: state.puzzleNumber,
      };
      addConstellation(entry);
      persistDaily(state.constellation);
      setTimeout(() => ui.drawConstellation(state.constellation, rowIndex, hashish(localDateKey()), { reduced }), reduced ? 0 : 480);
    }
  } else {
    sound.playLose();
    ui.showMessage(pick(MSG.lose).replace('{WORD}', game.answer.toUpperCase()));
    if (state.mode === 'daily') {
      recordDaily(false, 0);
      persistDaily();
    }
  }

  setTimeout(() => openStats(), reduced ? 400 : 1600);
}

function showEndState({ reopen = false } = {}) {
  const game = state.game;
  const rowIndex = Math.max(0, game.guesses.length - 1);
  if (game.status === 'won') {
    const n = game.guesses.length;
    ui.showMessage(`Solved in ${n}/6 — ${state.constellation} charted. ✦`);
    const reduced = resolveReducedMotion();
    setTimeout(() => ui.drawConstellation(state.constellation, rowIndex, hashish(localDateKey()), { reduced }), 60);
  } else {
    ui.showMessage(`It was ${game.answer.toUpperCase()}. Next transmission at midnight.`);
  }
  if (reopen) openStats();
}

function recordDaily(won, n) {
  const today = localDateKey();
  if (state.stats.lastDailyDate === today) return; // already counted
  const stats = state.stats;
  const yesterday = localDateKey(new Date(Date.now() - 86400000));

  stats.played += 1;
  if (won) {
    stats.wins += 1;
    stats.dist[n] = (stats.dist[n] || 0) + 1;
    stats.currentStreak = stats.lastWinDate === yesterday ? stats.currentStreak + 1 : 1;
    stats.lastWinDate = today;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
  stats.lastDailyDate = today;
  saveStats(stats);
}

function persistDaily(constellation = null) {
  if (state.mode !== 'daily') return;
  const g = state.game.toJSON();
  g.date = localDateKey();
  if (constellation) g.constellation = constellation;
  saveDaily(g);
}

// ---- chrome / modals ------------------------------------------------------

function bindChrome() {
  document.getElementById('btn-help').addEventListener('click', () => ui.openModal('help-modal'));
  document.getElementById('btn-stats').addEventListener('click', openStats);
  document.getElementById('btn-chart').addEventListener('click', openChart);
  document.getElementById('btn-settings').addEventListener('click', () => ui.openModal('settings-modal'));
  document.getElementById('btn-theme').addEventListener('click', toggleThemeQuick);

  document.getElementById('tab-daily').addEventListener('click', startDaily);
  document.getElementById('tab-unlimited').addEventListener('click', () => startUnlimited(state.len === 5 && state.mode === 'daily' ? 5 : state.len));
  document.getElementById('btn-new').addEventListener('click', () => startUnlimited(state.len));
  document.querySelectorAll('.len-btn').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.len-btn').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      startUnlimited(Number(b.dataset.len));
    }),
  );

  document.getElementById('btn-share').addEventListener('click', share);

  // arrow-key navigation between the two mode tabs (WCAG tab pattern)
  const tablist = document.querySelector('.mode-tabs');
  tablist.addEventListener('keydown', (e) => {
    let target;
    if (e.key === 'Home') target = 'daily';
    else if (e.key === 'End') target = 'unlimited';
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') target = state.mode === 'daily' ? 'unlimited' : 'daily';
    else return;
    e.preventDefault();
    if (target === 'daily') startDaily();
    else startUnlimited(state.len);
    document.getElementById(target === 'daily' ? 'tab-daily' : 'tab-unlimited').focus();
  });

  // overlay close behaviors (backdrop click or any [data-close] control)
  ui.el.overlay.addEventListener('click', (e) => {
    if (e.target === ui.el.overlay || e.target.hasAttribute('data-close')) ui.closeModal();
  });

  // physical keyboard
  window.addEventListener('keydown', (e) => {
    if (ui.isModalOpen()) {
      if (e.key === 'Escape') ui.closeModal();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') handleKey('enter');
    else if (e.key === 'Backspace') handleKey('backspace');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
  });

  const repoLink = document.getElementById('repo-link');
  if (repoLink) {
    if (REPO_URL) repoLink.href = REPO_URL;
    else repoLink.closest('.credit').classList.add('no-link');
  }
}

function toggleThemeQuick() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  state.settings.theme = next;
  saveSettings(state.settings);
  applyTheme(next);
  updateThemeModeBtn();
}

function openStats() {
  ui.renderStats(state.stats);
  const highlight = state.mode === 'daily' && state.game.status === 'won' ? state.game.guesses.length : -1;
  ui.renderDist(state.stats, highlight);
  if (state.mode === 'daily' && state.game.status !== 'playing') {
    ui.startCountdown(() => msUntilTomorrow());
    document.getElementById('btn-share').style.display = '';
  } else if (state.mode === 'daily') {
    ui.stopCountdown();
    document.getElementById('btn-share').style.display = 'none';
  } else {
    ui.stopCountdown();
    document.getElementById('btn-share').style.display = state.game.status !== 'playing' ? '' : 'none';
  }
  ui.openModal('stats-modal');
}

function openChart() {
  ui.renderChart(loadConstellations());
  ui.openModal('chart-modal');
}

async function share() {
  const text = buildShareText({
    game: state.game,
    puzzleNumber: state.mode === 'daily' ? state.puzzleNumber : null,
    constellation: state.mode === 'daily' && state.game.status === 'won' ? state.constellation : null,
    url: REPO_URL || undefined,
  });
  if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      /* fall through to clipboard */
    }
  }
  const ok = await copyText(text);
  ui.toast(ok ? 'Transmission copied to clipboard ✦' : 'Copy failed — select & copy manually.');
}

// ---- settings -------------------------------------------------------------

function bindSettings() {
  const s = state.settings;
  const bind = (id, key, after) => {
    const input = document.getElementById(id);
    input.checked = !!s[key];
    input.addEventListener('change', () => {
      s[key] = input.checked;
      saveSettings(s);
      if (after) after(input.checked);
    });
  };

  bind('set-hard', 'hardMode', (val) => {
    if (state.game && state.game.guesses.length === 0 && state.game.status === 'playing') {
      state.game.hardMode = val;
    } else {
      ui.toast('Hard mode applies to your next puzzle.');
    }
    setModeUi();
  });
  bind('set-glyphs', 'glyphs', (val) => document.body.classList.toggle('show-glyphs', val));
  bind('set-contrast', 'highContrast', (val) => document.body.classList.toggle('high-contrast', val));
  bind('set-sound', 'sound', (val) => sound.setSoundEnabled(val));
  bind('set-online', 'onlineWords');
  const motion = document.getElementById('set-motion');
  motion.checked = resolveReducedMotion();
  motion.addEventListener('change', () => {
    s.reducedMotion = motion.checked ? 'on' : 'off';
    saveSettings(s);
    const reduced = resolveReducedMotion();
    document.body.classList.toggle('reduced-motion', reduced);
    sky.setReducedMotion(reduced);
  });

  document.getElementById('btn-theme-mode').addEventListener('click', cycleThemeMode);
  updateThemeModeBtn();
}

function cycleThemeMode() {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
  state.settings.theme = next;
  saveSettings(state.settings);
  applyTheme(effectiveTheme());
  updateThemeModeBtn();
}

function updateThemeModeBtn() {
  const btn = document.getElementById('btn-theme-mode');
  if (btn) btn.textContent = `Theme: ${cap(state.settings.theme)}`;
}

// ---- utils ----------------------------------------------------------------

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function hashish(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return h >>> 0;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
