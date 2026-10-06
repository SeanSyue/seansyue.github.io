# seansyue.github.io

Portfolio site of Sean Syue. Static HTML and CSS, generated from `_src/` by a small Python script (standard library only). **Edit `_src/`, then run `python _src/build.py` and `python _src/check.py`** — see [`_src/README.md`](_src/README.md).

```
_src/                         sources: pages, strings, facts, layout, build and check scripts
index.html                    home (generated)
work/<project>/index.html     one page per project (Overview · Demo · Design & Verification · Status)
about/  resume/
assets/css/site.css           all styles
assets/js/site.js             theme, introduction, section navigation and media controls
assets/img/                   images
```

Preview locally:

```bash
python -m http.server 8765
```

## Cache busting

`site.css` and `site.js` are linked with `?v=<token>`. `python _src/build.py` changes the token by itself whenever either file changes, so returning visitors never keep an old copy.

## Portfolio structure and motion

The home page introduces Sean, maps five capabilities to work evidence, then groups the six project cases into AI workflows and governance, AI media workflows, and AI games. Each case starts with context, personal contribution, evidence and related capabilities. English, Traditional Chinese and Japanese use the same structure.

The first home-page visit in a browser session shows a short greeting and moves the positioning headline into its final place (about 2.3 seconds). Skip and Replay are available. Scrolling, keyboard input, navigation or resizing ends the animation immediately. Deep links and return visits skip it; reduced-motion preferences and browsers without JavaScript receive the full static content. No content depends on completing an animation. The default theme is dark, with a saved light-mode choice supported.

## Résumé PDF

Each résumé PDF is printed from its own page, so the page and the download can't drift apart:

| PDF | printed from |
|---|---|
| `resume/Sean-Syue-Resume.pdf` | `/resume/` |
| `resume/Sean-Syue-Resume-zh-TW.pdf` | `/zh-tw/resume/` |
| `resume/Sean-Syue-Resume-ja.pdf` | `/ja/resume/` |

After editing a résumé page or its print styles, rebuild the pages and regenerate the affected PDFs. All three languages are published in the generated local tree and can be printed from the normal local server. The preview server (`python _src/serve_preview.py`, port 8766) also works:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir="$TEMP/edge-pdf" --no-pdf-header-footer --print-to-pdf="$PWD/resume/Sean-Syue-Resume-zh-TW.pdf" --virtual-time-budget=8000 "http://127.0.0.1:8766/zh-tw/resume/"
```

`--user-data-dir` keeps it working while your normal Edge is open (without it the command silently does nothing).

The print rules live in the `@media print` blocks of `site.css`: one column, black on white, nav and buttons hidden. Keep each PDF to two pages. English prints in system fonts; Chinese and Japanese print their characters in the page's Noto web fonts, because system CJK fonts copy out of a PDF as look-alike radicals (⾃ instead of 自). After printing, extract the text (for example `pypdf`, `extraction_mode="layout"`) and check that names, dates, `·` and `–` come out as typed.

Selected projects start page two. Education prints in a single column with unbroken date ranges; CJK résumé names use one Noto family to preserve extraction order. Check both pages visually and confirm names, dates, schools and anonymized employers in extracted text before replacing the downloads.

## Drafts

Anything still missing is marked with the `todo` class, which renders as a dashed terracotta box.
**Before publishing, no page may contain `class="todo`.** A page that still has one is either finished
or removed from the home page — no empty pages, no "coming soon".

Count what's left:

```bash
grep -c 'class="todo' index.html */index.html work/*/index.html
```

Content rules live in `../ARCHITECTURE.md` (not published).
