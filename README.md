# seansyue.github.io

Portfolio site of Sean Syue. Static HTML and CSS, generated from `_src/` by a small Python script (standard library only). **Edit `_src/`, then run `python _src/build.py` and `python _src/check.py`** — see [`_src/README.md`](_src/README.md).

```
_src/                         sources: pages, strings, facts, layout, build and check scripts
index.html                    home (generated)
work/<project>/index.html     one page per project (Overview · Demo · Design & Verification · Status)
about/  resume/
assets/css/site.css           all styles
assets/js/site.js             fade-in on scroll (off under reduced motion)
assets/img/                   images
```

Preview locally:

```bash
python -m http.server 8765
```

## Cache busting

`site.css` and `site.js` are linked with `?v=<token>`. `python _src/build.py` changes the token by itself whenever either file changes, so returning visitors never keep an old copy.

## Résumé PDF

Each résumé PDF is printed from its own page, so the page and the download can't drift apart:

| PDF | printed from |
|---|---|
| `resume/Sean-Syue-Resume.pdf` | `/resume/` |
| `resume/Sean-Syue-Resume-zh-TW.pdf` | `/zh-tw/resume/` |
| `resume/Sean-Syue-Resume-ja.pdf` | `/ja/resume/` |

After editing a résumé page, regenerate its PDF. While Chinese and Japanese are unpublished, print from the preview server (`python _src/serve_preview.py`, port 8766); the English one works from either server:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir="$TEMP/edge-pdf" --no-pdf-header-footer --print-to-pdf="$PWD/resume/Sean-Syue-Resume-zh-TW.pdf" --virtual-time-budget=8000 "http://127.0.0.1:8766/zh-tw/resume/"
```

`--user-data-dir` keeps it working while your normal Edge is open (without it the command silently does nothing).

The print rules live in the `@media print` blocks of `site.css`: one column, black on white, nav and buttons hidden. Keep each PDF to two pages. English prints in system fonts; Chinese and Japanese print their characters in the page's Noto web fonts, because system CJK fonts copy out of a PDF as look-alike radicals (⾃ instead of 自). After printing, extract the text (for example `pypdf`, `extraction_mode="layout"`) and check that names, dates, `·` and `–` come out as typed.

## Drafts

Anything still missing is marked with the `todo` class, which renders as a dashed terracotta box.
**Before publishing, no page may contain `class="todo`.** A page that still has one is either finished
or removed from the home page — no empty pages, no "coming soon".

Count what's left:

```bash
grep -c 'class="todo' index.html */index.html work/*/index.html
```

Content rules live in `../ARCHITECTURE.md` (not published).
