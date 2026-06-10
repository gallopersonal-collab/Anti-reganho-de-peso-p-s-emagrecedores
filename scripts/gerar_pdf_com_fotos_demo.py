#!/usr/bin/env python3
"""Demo: PDF do Projeto Glúteo Blindado com fotos reais de cada exercício
(banco free-exercise-db, domínio público)."""
import json
import re
import urllib.request
from pathlib import Path

import markdown
from weasyprint import HTML

BASE = Path(__file__).resolve().parent.parent
ROTEIRO = BASE / "biblioteca-de-treinos" / "roteiros" / "HIP-F-30-39-INT-ACA.md"
FOTOS = BASE / "biblioteca-de-treinos" / "fotos-exercicios"
OUT = BASE / "biblioteca-de-treinos" / "pdfs-com-fotos"
RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"

ACCENT = "#2e6fdb"
CAT = "HIPERTROFIA"

# nome PT (prefixo do <strong> na seção de execução) -> id no free-exercise-db
MAPA = {
    "Elevação pélvica com barra": "Barbell_Hip_Thrust",
    "Levantamento terra romeno com barra": "Romanian_Deadlift",
    "Búlgaro com halteres": "Split_Squat_with_Dumbbells",
    "Cadeira flexora": "Seated_Leg_Curl",
    "Cadeira abdutora (tronco inclinado à frente)": "Thigh_Abductor",
    "Glúteo na polia (coice)": "One-Legged_Cable_Kickback",
    "Puxada frontal na polia": "Wide-Grip_Lat_Pulldown",
    "Supino reto com halteres": "Dumbbell_Bench_Press",
    "Remada baixa na polia (triângulo)": "Seated_Cable_Rows",
    "Desenvolvimento na máquina": "Machine_Shoulder_Military_Press",
    "Elevação lateral com halteres": "Side_Lateral_Raise",
    "Rosca direta com halteres": "Dumbbell_Bicep_Curl",
    "Tríceps na polia (corda)": "Triceps_Pushdown_-_Rope_Attachment",
    "Agachamento livre com barra": "Barbell_Squat",
    "Leg press 45°": "Leg_Press",
    "Cadeira extensora": "Leg_Extensions",
    "Afundo caminhando com halteres": "Dumbbell_Lunges",
    "Panturrilha em pé na máquina": "Standing_Calf_Raises",
    "Abdominal na máquina": "Ab_Crunch_Machine",
    "Hip thrust na máquina": "Barbell_Hip_Thrust",
    "Agachamento sumô com halter": "Plie_Dumbbell_Squat",
    "Stiff com halteres": "Stiff-Legged_Dumbbell_Deadlift",
    "Cadeira abdutora": "Thigh_Abductor",
    "Extensão de quadril no banco romano": "Hyperextensions_Back_Extensions",
    "Prancha abdominal + prancha lateral": "Plank",
}

CSS = f"""
@page {{
    size: A4; margin: 2.2cm 1.8cm 2.4cm 1.8cm;
    @bottom-left {{ content: "Biblioteca de Treinos Validados e Personalizáveis Pro™";
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif; }}
    @bottom-right {{ content: "Prof. José Carlos Gallo · pág. " counter(page) " de " counter(pages);
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif; }}
}}
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; color: #2c3e50; line-height: 1.45; }}
.capa {{ background: {ACCENT}; color: white; padding: 26px 30px; border-radius: 10px; margin-bottom: 22px; }}
.capa .categoria {{ font-size: 9pt; letter-spacing: 3px; text-transform: uppercase; opacity: 0.92; margin-bottom: 6px; }}
.capa h1 {{ margin: 0 0 10px 0; font-size: 23pt; line-height: 1.15; }}
.capa .meta {{ font-size: 9pt; opacity: 0.95; line-height: 1.7; }}
blockquote {{ border-left: 4px solid {ACCENT}; background: #f6f8fa; margin: 14px 0;
    padding: 10px 14px; font-style: italic; color: #444; border-radius: 0 6px 6px 0; }}
h2 {{ color: {ACCENT}; font-size: 13pt; border-bottom: 2px solid {ACCENT};
    padding-bottom: 4px; margin-top: 22px; margin-bottom: 10px; page-break-after: avoid; }}
h3 {{ color: #2c3e50; font-size: 11pt; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; margin: 8px 0 14px 0; font-size: 8.5pt; page-break-inside: avoid; }}
th {{ background: {ACCENT}; color: white; padding: 5px 7px; text-align: left; font-size: 8.5pt; }}
td {{ border: 1px solid #dde3e8; padding: 4px 7px; vertical-align: top; }}
tr:nth-child(even) td {{ background: #f6f8fa; }}
ul, ol {{ margin: 6px 0 10px 0; padding-left: 18px; }}
li {{ margin-bottom: 3px; }}
p {{ margin: 6px 0; }}
strong {{ color: #1a252f; }}
.ex-bloco {{ page-break-inside: avoid; margin-bottom: 12px; }}
.ex-fotos {{ display: flex; gap: 8px; margin: 6px 0 4px 0; }}
.ex-fotos figure {{ margin: 0; flex: 1; }}
.ex-fotos img {{ width: 100%; border-radius: 8px; border: 1px solid #dde3e8; }}
.ex-fotos figcaption {{ font-size: 7.5pt; color: #888; text-align: center; margin-top: 2px; }}
"""


def baixar(ex_id: str) -> list[Path]:
    pasta = FOTOS / ex_id
    pasta.mkdir(parents=True, exist_ok=True)
    paths = []
    for i in (0, 1):
        dest = pasta / f"{i}.jpg"
        if not dest.exists():
            url = f"{RAW}/{ex_id}/{i}.jpg"
            try:
                urllib.request.urlretrieve(url, dest)
            except Exception as e:
                print(f"  AVISO: sem foto {ex_id}/{i}.jpg ({e})")
                continue
        paths.append(dest)
    return paths


def main():
    texto = ROTEIRO.read_text(encoding="utf-8")
    linhas = texto.splitlines()
    titulo = linhas[0].lstrip("# ").strip()
    meta = [l for l in linhas[1:6] if l.startswith("**")]
    meta_html = "<br/>".join(re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", l) for l in meta)

    corpo = []
    pulando = True
    for l in linhas[1:]:
        if pulando and (l.startswith("**") or not l.strip()):
            continue
        pulando = False
        corpo.append(l)
    html_corpo = markdown.markdown("\n".join(corpo), extensions=["tables"])

    # injeta fotos após cada parágrafo de execução cujo <strong> casa com o mapa
    for nome, ex_id in sorted(MAPA.items(), key=lambda kv: -len(kv[0])):
        fotos = baixar(ex_id)
        if not fotos:
            continue
        figs = "".join(
            f'<figure><img src="file://{p}"/><figcaption>'
            f'{"Posição inicial" if i == 0 else "Posição final"}</figcaption></figure>'
            for i, p in enumerate(fotos)
        )
        # casa o parágrafo que começa com <strong>NOME e injeta as fotos antes dele,
        # agrupando foto+texto num bloco que não quebra de página
        pattern = re.compile(
            r"<p><strong>" + re.escape(nome) + r"(?![\wá-ú])(.*?)</p>", re.S
        )
        html_corpo = pattern.sub(
            lambda m: (
                f'<div class="ex-bloco"><div class="ex-fotos">{figs}</div>'
                f"<p><strong>{nome}</strong>{m.group(1)}</p></div>"
            ).replace("\\", "\\\\"),
            html_corpo,
            count=0,
        )

    html = f"""<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><style>{CSS}</style></head>
<body>
<div class="capa">
  <div class="categoria">{CAT} · Programa de Treinamento</div>
  <h1>{titulo}</h1>
  <div class="meta">{meta_html}</div>
</div>
{html_corpo}
<p style="font-size:7.5pt;color:#999;margin-top:18px;">Fotos de exercícios: free-exercise-db (domínio público).</p>
</body></html>"""

    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / "HIP-F-30-39-INT-ACA.pdf"
    HTML(string=html).write_pdf(out)
    print(f"OK {out}")


if __name__ == "__main__":
    main()
