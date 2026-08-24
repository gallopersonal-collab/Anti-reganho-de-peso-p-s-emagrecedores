#!/usr/bin/env python3
"""Gera PDFs profissionais dos roteiros da Biblioteca de Treinos PRO."""
import re
import sys
from pathlib import Path

import markdown
from weasyprint import HTML

ROTEIROS = Path(__file__).resolve().parent.parent / "biblioteca-de-treinos" / "roteiros"
OUT = Path(__file__).resolve().parent.parent / "biblioteca-de-treinos" / "pdfs"

CATEGORIAS = {
    "EMA": ("EMAGRECIMENTO", "#e74c3c"),
    "HIP": ("HIPERTROFIA", "#2e6fdb"),
    "DEF": ("DEFINIÇÃO MUSCULAR", "#0e9aa7"),
    "SAU": ("SAÚDE E QUALIDADE DE VIDA", "#27ae60"),
    "PER": ("PERFORMANCE", "#8e44ad"),
}

CSS_TEMPLATE = """
@page {{
    size: A4;
    margin: 2.2cm 1.8cm 2.4cm 1.8cm;
    @bottom-left {{
        content: "Biblioteca de Treinos Validados e Personalizáveis Pro™";
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif;
    }}
    @bottom-right {{
        content: "Prof. José Carlos Gallo · pág. " counter(page) " de " counter(pages);
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif;
    }}
}}
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; color: #2c3e50; line-height: 1.45; }}
.capa {{
    background: {accent};
    color: white; padding: 26px 30px; border-radius: 10px; margin-bottom: 22px;
}}
.capa .categoria {{
    font-size: 9pt; letter-spacing: 3px; text-transform: uppercase; opacity: 0.92; margin-bottom: 6px;
}}
.capa h1 {{ margin: 0 0 10px 0; font-size: 23pt; line-height: 1.15; }}
.capa .meta {{ font-size: 9pt; opacity: 0.95; line-height: 1.7; }}
.capa .meta b {{ opacity: 1; }}
blockquote {{
    border-left: 4px solid {accent}; background: #f6f8fa; margin: 14px 0;
    padding: 10px 14px; font-style: italic; color: #444; border-radius: 0 6px 6px 0;
}}
h2 {{
    color: {accent}; font-size: 13pt; border-bottom: 2px solid {accent};
    padding-bottom: 4px; margin-top: 22px; margin-bottom: 10px;
    page-break-after: avoid;
}}
h3 {{ color: #2c3e50; font-size: 11pt; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }}
table {{
    border-collapse: collapse; width: 100%; margin: 8px 0 14px 0; font-size: 8.5pt;
    page-break-inside: avoid;
}}
th {{
    background: {accent}; color: white; padding: 5px 7px; text-align: left; font-size: 8.5pt;
}}
td {{ border: 1px solid #dde3e8; padding: 4px 7px; vertical-align: top; }}
tr:nth-child(even) td {{ background: #f6f8fa; }}
ul, ol {{ margin: 6px 0 10px 0; padding-left: 18px; }}
li {{ margin-bottom: 3px; }}
p {{ margin: 6px 0; }}
strong {{ color: #1a252f; }}
.exercicios p {{ margin: 7px 0; text-align: justify; }}
"""


def build_pdf(md_path: Path) -> Path:
    text = md_path.read_text(encoding="utf-8")
    code = md_path.stem
    cat_name, accent = CATEGORIAS[code[:3]]

    lines = text.splitlines()
    titulo = lines[0].lstrip("# ").strip()

    # Extrai as linhas de metadados (linhas 2-3, em negrito) e o resumo (blockquote)
    meta_lines = [l for l in lines[1:6] if l.startswith("**")]
    meta_html = "<br/>".join(
        re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", l) for l in meta_lines
    )

    # Remove título e metadados do corpo (a capa os substitui)
    body_lines = []
    skipping = True
    for l in lines[1:]:
        if skipping and (l.startswith("**") or not l.strip()):
            continue
        skipping = False
        body_lines.append(l)
    body_md = "\n".join(body_lines)

    body_html = markdown.markdown(body_md, extensions=["tables"])

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><style>{CSS_TEMPLATE.format(accent=accent)}</style></head>
<body>
<div class="capa">
  <div class="categoria">{cat_name} · Programa de Treinamento</div>
  <h1>{titulo}</h1>
  <div class="meta">{meta_html}</div>
</div>
{body_html}
</body></html>"""

    OUT.mkdir(parents=True, exist_ok=True)
    out_path = OUT / f"{code}.pdf"
    HTML(string=html).write_pdf(out_path)
    return out_path


if __name__ == "__main__":
    targets = sys.argv[1:] or sorted(p.stem for p in ROTEIROS.glob("*.md") if p.stem != "README")
    for code in targets:
        path = build_pdf(ROTEIROS / f"{code}.md")
        print(f"OK {path.name}")
