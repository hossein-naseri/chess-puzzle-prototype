"""
Inlines webapp/index.html's stylesheet and scripts into one self-contained
HTML file for sharing as a Claude Artifact (which needs a single file).
The Capacitor / Play Store build should use webapp/ directly, not this
bundle - this exists purely for the shareable preview link.

Run: python3 tools/bundle.py   ->  writes dist/sightlines.html
"""
import re, os

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP = os.path.join(HERE, "webapp")
OUT = os.path.join(HERE, "dist")
os.makedirs(OUT, exist_ok=True)

html = open(os.path.join(WEBAPP, "index.html")).read()

def inline_css(m):
    href = m.group(1)
    if href.startswith("http"):
        return m.group(0)
    css = open(os.path.join(WEBAPP, href)).read()
    return "<style>\n" + css + "\n</style>"

def inline_js(m):
    src = m.group(1)
    js = open(os.path.join(WEBAPP, src)).read()
    if "</script>" in js:
        raise ValueError(f"{src} contains a literal </script> - would break inlining")
    return "<script>\n" + js + "\n</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', inline_css, html)
html = re.sub(r'<script src="([^"]+\.js)"></script>', inline_js, html)

out_path = os.path.join(OUT, "sightlines.html")
open(out_path, "w").write(html)
print(f"wrote {out_path} ({len(html)} bytes)")
