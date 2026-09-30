"""Build the static site from _src/.

    python _src/build.py            write every page (only files whose content changed are touched)
    python _src/build.py --out DIR  write into DIR instead of the site root (used by check.py)
    python _src/build.py --preview --out DIR   also build languages marked "published": false

Inputs (all under _src/):
    site.json          languages and the page list (id, path, which nav item is current, which footer)
    strings/<lang>.json    interface text: navigation, menu, buttons, footer
    facts.json         numbers and dates that must read the same in every language
    layout/*.html      the page frame, header and the footer variants
    pages/<lang>/<id>.html   one file per page and language: a few "key: value" lines, "---", then the body
    assets.json        cache token for site.css / site.js; bumped automatically when either file changes

Template markers:
    {{s:key}}          interface string in the page's language (may itself contain {{f:...}})
    {{f:id}}           a fact, shown in the page's language
    {{link:/path/}}    a site path in the page's language (English has no prefix)
    {{current:nav}}    ' aria-current="page"' on the page's own navigation item
    {{> name}}         a layout partial; {{> footer}} picks the page's footer variant
    {{title}} {{description}} {{html_lang}} {{fonts_url}} {{token}} {{alternates}} {{lang_switch}} {{body}}

Only the Python standard library is used.
"""
import datetime
import hashlib
import json
import pathlib
import re
import sys

SRC = pathlib.Path(__file__).resolve().parent
ROOT = SRC.parent
MARK = re.compile(r"\{\{\s*(>\s*[\w-]+|[\w-]+(?::[^}]*)?)\s*\}\}")


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


class Site:
    def __init__(self, preview=False):
        self.preview = preview  # also build languages that are not published yet (local preview only)
        self.config = load_json(SRC / "site.json")
        self.facts = load_json(SRC / "facts.json")
        self.langs = self.config["languages"]
        self.strings = {code: load_json(SRC / "strings" / f"{code}.json") for code in self.langs}
        self.layout = {p.stem: p.read_text(encoding="utf-8") for p in (SRC / "layout").glob("*.html")}
        self.token = self.cache_token()

    # --- cache token: changes only when site.css or site.js change -------------------------
    def cache_token(self, write=True):
        path = SRC / "assets.json"
        state = load_json(path)
        digest = hashlib.sha256()
        for rel in ("assets/css/site.css", "assets/js/site.js"):
            digest.update((ROOT / rel).read_bytes())
        sha = digest.hexdigest()[:16]
        if sha != state["sha"]:
            today = datetime.date.today().strftime("%Y%m%d")
            letter = "a"
            if state["token"].startswith(today):
                letter = chr(ord(state["token"][-1]) + 1)
            state = {"sha": sha, "token": today + letter}
            if write:
                path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
        return state["token"]

    # --- page sources ------------------------------------------------------------------------
    def source(self, lang, page_id):
        path = SRC / "pages" / lang / f"{page_id}.html"
        if not path.exists():
            return None
        text = path.read_text(encoding="utf-8")
        head, sep, body = text.partition("\n---\n")
        if not sep:
            raise SystemExit(f"{path}: missing the '---' line after the page settings")
        meta = {}
        for line in head.splitlines():
            if line.strip():
                key, _, value = line.partition(":")
                meta[key.strip()] = value.strip()
        return meta, body

    def languages_with(self, page_id):
        """Languages that will actually be written for this page (published, or everything in preview)."""
        return [code for code in self.active_langs() if (SRC / "pages" / code / f"{page_id}.html").exists()]

    def active_langs(self):
        return [code for code, info in self.langs.items() if info.get("published") or self.preview]

    def url(self, lang, path):
        return self.langs[lang]["prefix"] + path

    # --- rendering ---------------------------------------------------------------------------
    def fact(self, fact_id, lang):
        entry = self.facts.get(fact_id)
        if entry is None:
            raise KeyError(f"unknown fact {fact_id!r}")
        text = entry.get(lang)
        if text is None:
            raise KeyError(f"fact {fact_id!r} has no {lang} text")
        return text

    def render(self, text, ctx, depth=0):
        if depth > 8:
            raise RecursionError("template markers nest too deeply")

        def repl(match):
            token = match.group(1).strip()
            if token.startswith(">"):
                name = token[1:].strip()
                if name == "footer":
                    name = "footer-" + ctx["page"]["footer"]
                return self.render(self.layout[name], ctx, depth + 1)
            kind, _, arg = token.partition(":")
            if kind == "s":
                return self.render(self.strings[ctx["lang"]][arg], ctx, depth + 1)
            if kind == "f":
                return self.fact(arg, ctx["lang"])
            if kind == "link":
                return self.url(ctx["lang"], arg)
            if kind == "current":
                return ' aria-current="page"' if ctx["page"].get("nav") == arg else ""
            if kind in ctx["vars"]:
                value = ctx["vars"][kind]
                return self.render(value, ctx, depth + 1) if kind == "body" else value
            raise KeyError(f"unknown marker {{{{{token}}}}}")

        return MARK.sub(repl, text)

    def alternates(self, page):
        langs = self.languages_with(page["id"])
        if len(langs) < 2:
            return ""
        lines = [f'<link rel="alternate" hreflang="{self.langs[c]["hreflang"]}" href="{self.config["origin"]}{self.url(c, page["path"])}">' for c in langs]
        default = self.config["default_language"]
        if default in langs:
            lines.append(f'<link rel="alternate" hreflang="x-default" href="{self.config["origin"]}{self.url(default, page["path"])}">')
        return "\n" + "\n".join(lines)

    def lang_switch(self, page, lang):
        langs = self.languages_with(page["id"])
        if len(langs) < 2:
            return ""
        items = "".join(
            f'<a href="{self.url(c, page["path"])}" hreflang="{self.langs[c]["hreflang"]}" lang="{self.langs[c]["html_lang"]}"'
            + (' aria-current="true"' if c == lang else "") + f'>{self.langs[c]["label"]}</a>'
            for c in langs)
        return self.render(self.layout["lang-switch"], {"lang": lang, "page": page, "vars": {"items": items, "lang_now": self.langs[lang]["short"]}})

    def page_html(self, lang, page):
        meta, body = self.source(lang, page["id"])
        info = self.langs[lang]
        ctx = {"lang": lang, "page": page, "vars": {
            "title": meta["title"], "description": meta["description"], "html_lang": info["html_lang"],
            "fonts_url": info["fonts_url"], "token": self.token, "body": body,
            "alternates": self.alternates(page), "lang_switch": self.lang_switch(page, lang),
        }}
        return self.render(self.layout["page"], ctx)

    def outputs(self):
        """Yield (relative output path, html) for every page that has a source in some language."""
        for page in self.config["pages"]:
            for lang in self.active_langs():
                if self.source(lang, page["id"]) is None:
                    continue
                rel = (self.url(lang, page["path"]).lstrip("/") + "index.html")
                yield rel, self.page_html(lang, page)


def main(argv):
    out = ROOT
    if "--out" in argv:
        out = pathlib.Path(argv[argv.index("--out") + 1])
    preview = "--preview" in argv
    if preview and out == ROOT:
        raise SystemExit("--preview writes unpublished languages; give it --out <folder> so they never land in the site")
    site = Site(preview=preview)
    written = same = 0
    for rel, html in site.outputs():
        target = out / rel
        data = html.encode("utf-8")
        if target.exists() and target.read_bytes() == data:
            same += 1
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        written += 1
        print("wrote", rel)
    print(f"{written} written, {same} unchanged, cache token {site.token}")


if __name__ == "__main__":
    main(sys.argv[1:])
