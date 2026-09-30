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

`resume/Sean-Syue-Resume.pdf` is printed from `/resume/` itself, so the page and the download can't drift apart.
After editing the résumé page, regenerate it (server running on 8765):

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir="$TEMP/edge-pdf" --no-pdf-header-footer --print-to-pdf="$PWD/resume/Sean-Syue-Resume.pdf" --virtual-time-budget=6000 "http://localhost:8765/resume/"
```

`--user-data-dir` keeps it working while your normal Edge is open (without it the command silently does nothing).

The print rules live in the `@media print` block of `site.css`: one column, black on white, nav and buttons hidden. Keep it to two pages.

## Drafts

Anything still missing is marked with the `todo` class, which renders as a dashed terracotta box.
**Before publishing, no page may contain `class="todo`.** A page that still has one is either finished
or removed from the home page — no empty pages, no "coming soon".

Count what's left:

```bash
grep -c 'class="todo' index.html */index.html work/*/index.html
```

Content rules live in `../ARCHITECTURE.md` (not published).
