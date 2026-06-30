// Sky Word — shareable "sky observation". Renders the result as a grid of
// star / ring / dot glyphs (not colored squares) plus the constellation name,
// so a paste reads like a logged transmission and works as plain text anywhere.

const GLYPH = { correct: '★', present: '○', absent: '·' };

/**
 * Build the share string for a finished game.
 * @param {object} opts
 * @param {import('./game.js').Game} opts.game
 * @param {number} [opts.puzzleNumber] daily number (omitted for unlimited)
 * @param {string} [opts.constellation] collected constellation name
 * @param {string} [opts.url] optional play URL appended as a final line
 */
export function buildShareText({ game, puzzleNumber, constellation, url }) {
  const won = game.status === 'won';
  const scoreNum = won ? game.guesses.length : 'X';
  const title =
    puzzleNumber != null
      ? `Sky Word — Daily Transmission #${puzzleNumber}`
      : `Sky Word — Deep Space (${game.len} letters)`;

  const header = `${title}  ${scoreNum}/${game.maxGuesses}${game.hardMode ? '*' : ''}`;

  const grid = game.guesses
    .map((g) => g.result.map((s) => GLYPH[s] || GLYPH.absent).join(''))
    .join('\n');

  const lines = [header];
  if (constellation) lines.push(`✦ ${constellation} charted`);
  lines.push('', grid);
  if (url) lines.push('', url);
  return lines.join('\n');
}

/**
 * Copy text to the clipboard, with a textarea fallback for non-secure or
 * older contexts. Resolves true on success.
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export { GLYPH };
