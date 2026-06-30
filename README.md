<div align="center">

# ✦ Sky Word

**A celestial daily word game — guess the hidden word, ignite the tiles, and chart a new constellation every time you win.**

A polished, dependency-free take on the classic word game, wrapped in a living observatory sky that shifts with your local time of day.

[**▶ Play it**](#-play) · [Features](#-features) · [How to play](#-how-to-play) · [Run locally](#-run-locally) · [Deploy](#-deploy)

</div>

---

## ✨ Features

Sky Word keeps the addictive core of a daily word game and layers real personality on top:

- 🌌 **Living time-of-day sky** — a canvas starfield, drifting aurora ribbon, and an arcing sun/moon that all track your **real local clock** through dawn → day → dusk → night. The sky also auto-selects light vs. dark.
- 🔭 **Tiles that *ignite*** — guesses don't just flip; light kindles from the center of each dark-glass pane and settles into its color, staggered across the row.
- ⭐ **Constellation collection** — every solved **Daily Transmission** links your winning row into a named constellation, saved forever to a personal **star chart**. (The name is seeded from the date, so everyone gets the same one to compare.)
- 🎮 **Multiple modes**
  - **Daily Transmission** — one shared puzzle per day, same word for everyone, with streaks.
  - **Deep Space** — endless practice with no streak pressure, in **4, 5, or 6 letters**.
  - **Locked Coordinates (Hard mode)** — revealed hints must be reused.
- 📊 **Stats as a star chart** — games played, win %, current/best streak, and a guess-distribution "light readings" chart.
- 🔤 **Colorblind-safe by design** — every state carries a glyph (★ correct, ○ present, · absent) on tiles *and* keys, with a high-contrast option. Color is never the only signal.
- 📡 **Glyph-grid share** — results copy as a clean grid of star/ring/dot characters plus the constellation name, so a paste reads like a logged sky observation.
- 🔊 **Optional generated audio** — soft synthesized tones for taps, wins, and losses (Web Audio API, zero asset files). Off until you enable it.
- ♿ **Accessible & respectful** — full physical-keyboard support, focus rings, ARIA live regions, and `prefers-reduced-motion` fully honored (the sky goes still and reveals become instant).
- 📖 **Generous dictionary** — a curated offline word list, plus an optional online lookup so legitimate guesses rarely get rejected.

No frameworks, no build step, no tracking. Just `index.html`, a little CSS, and vanilla ES modules.

## 🎯 How to play

Guess the hidden word in **6 tries**. Each guess must be a real word; press <kbd>Enter</kbd> to lock it in. After each guess the tiles reveal how close you were:

| Tile | Glyph | Meaning |
| --- | :---: | --- |
| 🟩 Correct | ★ | Right letter, right spot. |
| 🟧 Present | ○ | Right letter, wrong spot. |
| ⬛ Absent | · | Not in the word. |

Solve the Daily to chart a constellation — or drift through Deep Space for endless play.

## 🚀 Play

**▶ https://notbangbang-dev.github.io/sky-word/**

(Give the first deploy a minute or two after enabling Pages.)

## 🛠 Run locally

The app is fully static — any static file server works. Two easy options:

```bash
# Python (no install)
python -m http.server 4317
# then open http://localhost:4317

# …or via npm
npm start        # python http server on :4317
npm run serve    # npx serve on :4317
```

> Open it through `http://localhost`, not `file://` — browsers block ES modules on the `file:` protocol.

Validate the word lists at any time:

```bash
npm run check    # node tools/check-words.mjs
```

## 📦 Deploy

The site is plain static files at the repo root, so **GitHub Pages** serves it
directly from the `main` branch — every push auto-publishes, no build step.

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**, then pick **`main`** / **`/ (root)`** and Save.
3. Wait a minute; the site goes live at `https://<your-username>.github.io/sky-word/`.

## 🧱 Project structure

```
sky-word/
├─ index.html              # markup shell + sky layers
├─ css/styles.css          # the "Observatory" theme, sky engine & animations
├─ js/
│  ├─ main.js              # controller: input, submit flow, persistence wiring
│  ├─ game.js              # pure rules: evaluation, daily seeding, hard mode
│  ├─ words.js             # curated 4/5/6-letter word lists
│  ├─ ui.js                # DOM rendering, ignite reveal, modals, constellation
│  ├─ sky.js               # time-of-day sky engine (starfield, aurora, sun/moon)
│  ├─ storage.js           # localStorage (settings, stats, daily, constellations)
│  ├─ share.js             # glyph-grid share text + clipboard
│  ├─ sound.js             # Web Audio tone palette
│  └─ confetti.js          # CSS/canvas star-spark celebration
└─ tools/                  # word-list + logic test harness
```

## 🎨 Tech

Vanilla HTML/CSS/JavaScript (ES modules) · Canvas 2D for the sky and confetti · Web Audio API for sound · `localStorage` for persistence · [Fraunces](https://fonts.google.com/specimen/Fraunces) + [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) type.

## 📄 License

[MIT](LICENSE) — do what you like, just keep the notice.

<div align="center">
<sub>Made with starlight. ✦</sub>
</div>
