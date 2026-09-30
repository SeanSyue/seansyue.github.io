"""Local preview with unpublished languages.

    python _src/serve_preview.py [port]      (default 8766)

Builds every language (published or not) into ../../_preview — outside this repository, so preview
files can never be committed — and serves it. Pages are rebuilt on each request, so edits in _src/
show up on reload. Files the build does not write (assets, the résumé PDF) come from the site root.
A page that has no translation yet falls back to the English page, so links in a partial language work.
"""
import functools
import http.server
import importlib
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import build  # noqa: E402

PREVIEW = build.ROOT.parent / "_preview"
PREFIXES = [info["prefix"].strip("/") for info in build.load_json(build.SRC / "site.json")["languages"].values() if info["prefix"]]


def rebuild():
    importlib.reload(build)  # pick up edits to build.py without restarting the server
    site = build.Site(preview=True)
    for rel, html in site.outputs():
        target = PREVIEW / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8", newline="")
    return site


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if path.endswith("/") or path.endswith(".html"):
            try:
                rebuild()
            except Exception as exc:  # show build errors in the browser instead of a stale page
                self.send_error(500, f"build failed: {exc}")
                return
        super().do_GET()

    def translate_path(self, path):
        clean = path.split("?")[0].split("#")[0]
        rel = clean.lstrip("/")
        candidates = [PREVIEW / rel, build.ROOT / rel]
        for prefix in PREFIXES:
            if rel.startswith(prefix + "/"):
                english = rel[len(prefix) + 1:]
                candidates += [PREVIEW / english, build.ROOT / english]
        for candidate in candidates:
            target = candidate / "index.html" if clean.endswith("/") else candidate
            if target.exists():
                return str(target)
        return str(PREVIEW / rel)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    rebuild()
    print(f"preview on http://localhost:{port}/  (files in {PREVIEW})", flush=True)
    http.server.ThreadingHTTPServer(("", port), functools.partial(Handler, directory=str(PREVIEW))).serve_forever()
