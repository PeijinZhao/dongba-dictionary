# Dongba Pictograph Dictionary

A searchable, bilingual (Chinese–English) web dictionary of **1,188 Naxi Dongba pictographs** — one of the few pictographic writing systems still in use today.

**Live demo:** https://peijinzhao.github.io/dongba-dictionary/dongba-dict/html/

<!-- Add a screenshot here, e.g. ![screenshot](docs/screenshot.png) -->

## Features

- **Instant search** across romanized Naxi names, Chinese and English meanings, and categories (e.g. `chicken`, `鸡`, `sun`, `Food`).
- **Glyph cards** that render each pictograph from its own SVG, with romanization, IPA, meanings, and category tags. Click a card for full details.
- **IPA cleanup.** The source data stored pronunciations as half-rendered LaTeX (e.g. `\$a^{33}\$`). A cleaning function converts tone numbers to superscripts and aspiration marks to `ʰ`. Symbols it can't map with certainty are flagged as `[?]` instead of guessed.
- **Pronunciation playback.** Plays a native-speaker recording when one exists (`dongba-dict/audio/U+XXXX.mp3`). Otherwise it falls back to browser text-to-speech, with a clear "not real Naxi pronunciation" notice.
- **Phrase decomposition.** Type a modern Chinese phrase to see which Dongba glyphs map to each character. Works fully offline.
- **Optional AI suggestions.** With your own Claude API key, the app suggests natural glyph combinations for a phrase and is instructed to say so honestly when no good match exists. The key stays in your browser's local storage and is sent only to the Anthropic API.

## Tech stack

Vanilla JavaScript, HTML, and CSS, with no build step or framework. Data lives in a single JSON file (`dongba-dict/data/dongba.json`), and each glyph is an individual SVG.

## Project structure

```
dongba-dict/          # the dictionary app (this is what the live demo serves)
  html/               # index.html, app.js, style.css, ipa-guide.html
  data/dongba.json    # 1,188 entries: name, IPA, English, Chinese, category, SVG path
  svgs/               # one SVG per glyph (U+E000.svg … U+E4A3.svg)
  audio/              # optional native-speaker recordings (see audio/README.md)
data/dongba.csv       # the same dataset as CSV
table.md              # original source table
index.html, svgs/     # first prototype: a simple table + SVG viewer
website/              # second prototype
```

## Run locally

The app loads JSON with `fetch`, so it needs to be served over HTTP rather than opened as a file:

```bash
cd dongba-dictionary
python3 -m http.server 8000
# then open http://localhost:8000/dongba-dict/html/
```

## Data source

Glyph images and dictionary entries are based on: **[SOURCE — fill in the dataset/font/book the glyphs and entries came from, with a link and its license]**.

## Author

PeiJin Zhao, UMass Amherst
