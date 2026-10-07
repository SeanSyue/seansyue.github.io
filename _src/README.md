# _src — how the site is built

Every page under the site root is generated from this folder. **Edit here, not the HTML at the root.**

```bash
python _src/build.py        # rebuild the site (only changed files are written)
python _src/check.py        # must end with 0 errors before a commit
```

Only the Python standard library is needed. GitHub Pages serves the generated HTML exactly as before; nothing runs on GitHub.

## What lives where

| File | What it holds |
|---|---|
| `site.json` | Languages (URL prefix, `lang`, `hreflang`, fonts, `published`) and the page list: id, path, current nav item, footer variant |
| `pages/<lang>/<id>.html` | One page in one language: `title:` and `description:` lines, `---`, then the page body |
| `strings/<lang>.json` | Interface text: navigation, menu, theme button, footer |
| `facts.json` | Numbers and dates shared by every language, each with a note and where it comes from |
| `layout/` | Page frame, header, language switch, footer variants |
| `papers/` | Approved chapter and paper composition; wraps resolved page content without changing facts or routes |
| `assets.json` | Cache token for all files in `assets/css/` and `assets/js/`; the build updates it when any asset changes |

## Template markers

`{{s:key}}` interface string · `{{f:id}}` fact · `{{link:/path/}}` path in the page's language · `{{current:nav}}` marks the current nav item · `{{> name}}` layout partial.

## Adding a language

1. Add it to `site.json` with `"published": false`.
2. Add `strings/<lang>.json`, the language's text in `facts.json`, and `pages/<lang>/*.html`.
3. Preview without touching the site: `python _src/serve_preview.py` (http://127.0.0.1:8766, rebuilds on every page load), or `python _src/build.py --preview --out ../preview`; check with `python _src/check.py --preview`.
4. When every page exists and has been reviewed, set `"published": true`, run `build.py` and `check.py`.

A language only goes live when all its pages exist; `check.py` fails a published language with missing pages.

## What check.py catches

Hand-edited output, unresolved markers, unknown or unused facts, missing pages in a published language, internal links and `#anchors` that lead nowhere, links that leave the page's language, `hreflang` pointing at missing pages, `sitemap.xml` entries that are not pages, a stale cache token, and private strings (local paths, names that must not appear). Each of these was tried on purpose on 2026-09-30 and turned the check red.

## Also written by the build

- `<link rel="canonical">` on every page, pointing at the page itself in its own language.
- `sitemap.xml`: every page in every published language, with its language alternates.
- External `http`/`https` links receive `target="_blank"`, `noopener noreferrer`, and a localized screen-reader note. Site links, PDFs and email links keep their normal behavior.
