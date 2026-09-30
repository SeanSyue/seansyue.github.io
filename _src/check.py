"""Check the site before committing or pushing.

    python _src/check.py              check the published site
    python _src/check.py --preview    also check languages that are not published yet

It rebuilds into a temporary folder and reports:
  - pages whose committed HTML differs from what _src/ builds (someone edited the output, or forgot to build)
  - template markers left unresolved, facts that are missing or unused
  - published languages that are missing pages
  - internal links and #anchors that lead nowhere, and links that jump to another language
  - hreflang alternates that point at pages that do not exist, and wrong lang attributes
  - a stale cache token, and private strings (local paths, names that must never appear)
Exit code 0 means no errors; warnings do not fail the check.
"""
import pathlib
import re
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build  # noqa: E402

ROOT, SRC = build.ROOT, build.SRC
PRIVATE = re.compile(r"C:[\\/]+Users|\\Users\\sean8|haiwo|海沃|KYC_Case", re.I)
errors, warnings = [], []


def page_ids(html):
    return set(re.findall(r'\bid="([^"]+)"', html))


def resolve(base, href):
    """Map a site path to a file under base; return (file, anchor) or (None, anchor) when it does not exist."""
    path, _, anchor = href.partition("#")
    path = path.split("?")[0] or "/"
    target = base / path.lstrip("/")
    if path.endswith("/"):
        target = target / "index.html"
    return (target if target.exists() else None), anchor


def main(argv):
    preview = "--preview" in argv
    site = build.Site(preview=preview)
    with tempfile.TemporaryDirectory() as tmp:
        out = pathlib.Path(tmp)
        built = dict(site.outputs())
        for rel, html in built.items():
            (out / rel).parent.mkdir(parents=True, exist_ok=True)
            (out / rel).write_text(html, encoding="utf-8", newline="")

        # 1. committed output matches what the published build writes (previews are never committed)
        for rel, html in build.Site(preview=False).outputs():
            committed = ROOT / rel
            if not committed.exists():
                errors.append(f"{rel}: not built yet (run python _src/build.py)")
            elif committed.read_text(encoding="utf-8") != html:
                errors.append(f"{rel}: differs from _src/ (edited by hand, or build not run)")

        # 2. markers and facts
        used = set()
        for rel, html in built.items():
            if "{{" in html:
                errors.append(f"{rel}: unresolved template marker")
        for src_file in list((SRC / "pages").rglob("*.html")) + list((SRC / "strings").glob("*.json")):
            used |= set(re.findall(r"\{\{f:([\w.-]+)\}\}", src_file.read_text(encoding="utf-8")))
        for fid in sorted(set(site.facts) - used):
            warnings.append(f"fact {fid} is not used anywhere")

        # 3. every published language has every page
        for code, info in site.langs.items():
            have = [p["id"] for p in site.config["pages"] if site.source(code, p["id"])]
            missing = [p["id"] for p in site.config["pages"] if p["id"] not in have]
            if missing and info.get("published"):
                errors.append(f"language {code} is published but missing: {', '.join(missing)}")
            elif missing and have:
                warnings.append(f"language {code} (not published) still missing: {', '.join(missing)}")

        # 4. links, anchors, language of links, hreflang, lang attribute
        for rel, html in built.items():
            lang = next((c for c, i in site.langs.items() if i["prefix"] and rel.startswith(i["prefix"].strip("/") + "/")), "en")
            prefix = site.langs[lang]["prefix"]
            m = re.search(r'<html lang="([^"]+)"', html)
            if not m or m.group(1) != site.langs[lang]["html_lang"]:
                errors.append(f"{rel}: lang attribute should be {site.langs[lang]['html_lang']}")
            body = re.sub(r'<details class="lang-switch">.*?</details>', "", html, flags=re.S)  # switch links cross languages on purpose
            for attr, href in re.findall(r'\b(href|src|poster)="(/[^"/][^"]*|/)"', body):
                if href.startswith("//"):
                    continue
                target, anchor = resolve(out, href)
                if target is None:
                    target, anchor = resolve(ROOT, href)  # assets and files the build does not write
                if target is None:
                    errors.append(f"{rel}: {attr} {href} leads nowhere")
                    continue
                if anchor and target.suffix == ".html" and anchor not in page_ids(target.read_text(encoding="utf-8")):
                    errors.append(f"{rel}: {href} — no #{anchor} on that page")
                is_page = target.name == "index.html"
                if is_page and prefix and not href.startswith(prefix):
                    warnings.append(f"{rel}: links to {href}, outside its language")
            for alt in re.findall(r'<link rel="alternate" hreflang="[^"]+" href="([^"]+)">', html):
                path = alt.replace(site.config["origin"], "")
                if resolve(out, path)[0] is None:
                    errors.append(f"{rel}: hreflang points at missing page {path}")

        # 5. cache token and private strings
        token = site.cache_token(write=False)
        for rel in built:
            committed = ROOT / rel
            if committed.exists() and f"?v={token}" not in committed.read_text(encoding="utf-8"):
                errors.append(f"{rel}: cache token is not {token} (run python _src/build.py)")
        scan = [p for p in SRC.rglob("*") if p.is_file() and p.suffix in (".html", ".json", ".md", ".py") and p.name != "check.py"]
        scan += [ROOT / rel for rel in built if (ROOT / rel).exists()]
        for f in scan:
            for m in PRIVATE.finditer(f.read_text(encoding="utf-8", errors="replace")):
                errors.append(f"{f.relative_to(ROOT)}: private string {m.group(0)!r}")

    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    print(f"{len(built)} pages checked, {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
