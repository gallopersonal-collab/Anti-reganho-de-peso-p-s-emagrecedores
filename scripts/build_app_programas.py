#!/usr/bin/env python3
"""Gera a versão de arquivo único do app de programas de treino.

Junta index.html + styles.css + app.js + bibliotecas de vendor/ num só
index.html, pronto para arrastar no Netlify Drop.
Uso: python3 scripts/build_app_programas.py
Saída: app-programas/netlify/index.html
"""
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app-programas"
OUT = APP / "netlify" / "index.html"


def safe(js: str) -> str:
    # impede que o conteúdo feche a tag <script> antes da hora
    return js.replace("</script", "<\\/script").replace("<!--", "<\\!--")


def main() -> None:
    html = (APP / "index.html").read_text(encoding="utf-8")
    css = (APP / "styles.css").read_text(encoding="utf-8")
    vendor = APP / "vendor"

    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    worker = safe((vendor / "pdf.worker.min.js").read_text(encoding="utf-8"))
    for name in ("pdf.min.js", "html2canvas.min.js", "jspdf.umd.min.js"):
        tag = f'<script src="vendor/{name}"></script>'
        assert tag in html, tag
        code = safe((vendor / name).read_text(encoding="utf-8"))
        html = html.replace(tag, f"<script>\n{code}\n</script>")
    tag = '<script src="library-data.js"></script>'
    assert tag in html, tag
    lib = safe((APP / "library-data.js").read_text(encoding="utf-8"))
    html = html.replace(tag, f"<script>\n{lib}\n</script>")
    tag = '<script src="app.js"></script>'
    assert tag in html
    app = safe((APP / "app.js").read_text(encoding="utf-8"))
    html = html.replace(
        tag,
        f'<script type="text/plain" id="pdf-worker-src">\n{worker}\n</script>\n<script>\n{app}\n</script>',
    )
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"{OUT} ({OUT.stat().st_size / 1048576:.1f} MB)")


if __name__ == "__main__":
    main()
