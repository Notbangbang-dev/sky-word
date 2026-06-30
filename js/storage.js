// Persistence layer for Sky Word — thin, defensive wrappers over localStorage.
// Every read falls back to sane defaults so a wiped/blocked store never breaks
// the game (e.g. private browsing where setItem throws).

const KEYS = {
  settings: 'skyword:settings',
  stats: 'skyword:stats',
  daily: 'skyword:daily',
  constellations: 'skyword:constellations',
};

const DEFAULT_SETTINGS = {
  theme: 'auto', // 'auto' tracks the time-of-day sky; 'light' | 'dark' override
  sound: false, // off until the player opts in (browsers require a gesture anyway)
  glyphs: true, // colorblind-safe symbols overlaid on tiles + keys
  highContrast: false, // enlarges glyphs + adds patterns
  hardMode: false, // revealed hints must be reused
  reducedMotion: 'system', // 'system' | 'on' | 'off'
  onlineWords: true, // accept extra real words via a dictionary lookup when offline-list misses
};

const DEFAULT_STATS = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, // wins by guess count
  lastDailyDate: null, // YYYY-MM-DD of last completed daily
  lastWinDate: null, // YYYY-MM-DD of last daily WIN (drives the streak)
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredCloneSafe(fallback);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : structuredCloneSafe(fallback);
  } catch {
    return structuredCloneSafe(fallback);
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked — game still works in-memory
  }
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---- Settings -------------------------------------------------------------

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(settings) {
  write(KEYS.settings, settings);
}

// ---- Stats ----------------------------------------------------------------

export function loadStats() {
  const s = read(KEYS.stats, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...s,
    dist: { ...DEFAULT_STATS.dist, ...(s.dist || {}) },
  };
}

export function saveStats(stats) {
  write(KEYS.stats, stats);
}

// ---- Daily game state (so a refresh resumes the puzzle) -------------------

export function loadDaily() {
  return read(KEYS.daily, null);
}

export function saveDaily(state) {
  write(KEYS.daily, state);
}

// ---- Collected constellations ---------------------------------------------

export function loadConstellations() {
  const list = read(KEYS.constellations, []);
  return Array.isArray(list) ? list : [];
}

export function saveConstellations(list) {
  write(KEYS.constellations, list);
}

export function addConstellation(entry) {
  const list = loadConstellations();
  // De-dupe by date so re-finishing the same daily doesn't double-add.
  if (entry.date && list.some((c) => c.date === entry.date)) return list;
  list.push(entry);
  saveConstellations(list);
  return list;
}

export { DEFAULT_SETTINGS, DEFAULT_STATS };
