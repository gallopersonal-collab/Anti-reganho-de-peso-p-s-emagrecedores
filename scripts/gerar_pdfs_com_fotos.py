#!/usr/bin/env python3
"""Gera os PDFs da Biblioteca de Treinos PRO com fotos reais dos exercícios
(banco free-exercise-db, domínio público). Uso:
  python3 scripts/gerar_pdfs_com_fotos.py [CODIGO ...]
Sem argumentos: gera todos os roteiros."""
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

import markdown
from PIL import Image
from weasyprint import HTML

BASE = Path(__file__).resolve().parent.parent
ROTEIROS = BASE / "biblioteca-de-treinos" / "roteiros"
FOTOS = BASE / "biblioteca-de-treinos" / "fotos-exercicios"
OUT = BASE / "biblioteca-de-treinos" / "pdfs-com-fotos"
RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
DB_JSON = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"

CATEGORIAS = {
    "EMA": ("EMAGRECIMENTO", "#e74c3c"),
    "HIP": ("HIPERTROFIA", "#2e6fdb"),
    "DEF": ("DEFINIÇÃO MUSCULAR", "#0e9aa7"),
    "SAU": ("SAÚDE E QUALIDADE DE VIDA", "#27ae60"),
    "PER": ("PERFORMANCE", "#8e44ad"),
}

# Regras ordenadas (primeira que casar vence): regex PT -> id do free-exercise-db
RULES = [
    # ----- agachamentos -----
    (r"agachamento livre \(progress|agachamento (rápido|pausado|com pausa)", "Bodyweight_Squat"),
    (r"agachamento profundo com apoio", "Bodyweight_Squat"),
    (r"agachamento (no banco|na cadeira)|box squat|sentar e levantar", "Chair_Squat"),
    (r"agachamento .*smith", "Smith_Machine_Squat"),
    (r"agachamento (goblet|taça)|goblet", "Goblet_Squat"),
    (r"búlgaro", "Split_Squat_with_Dumbbells"),
    (r"agachamento sumô", "Plie_Dumbbell_Squat"),
    (r"agachamento com salto|jump squat", "Freehand_Jump_Squat"),
    (r"agachamento com (banda|elástico)", "Bodyweight_Squat"),
    (r"agachamento frontal", "Front_Squat_Clean_Grip"),
    (r"hack", "Hack_Squat"),
    (r"agachamento (livre|com barra)", "Barbell_Squat"),
    # ----- pernas máquinas -----
    (r"panturrilha no leg press|calf press", "Calf_Press_On_The_Leg_Press_Machine"),
    (r"leg press", "Leg_Press"),
    (r"cadeira extensora", "Leg_Extensions"),
    (r"mesa flexora", "Lying_Leg_Curls"),
    (r"cadeira flexora", "Seated_Leg_Curl"),
    (r"flexão de joelhos em pé|curl de posterior", "Standing_Leg_Curl"),
    (r"cadeira abdutora", "Thigh_Abductor"),
    (r"abdução de quadril deitada", "Side_Leg_Raises"),
    # ----- quadril / posteriores -----
    (r"(elevação pélvica|hip thrust) (com barra|na máquina|com barra pesada)", "Barbell_Hip_Thrust"),
    (r"elevação pélvica com anilha|ponte de glúteo|elevação pélvica no solo|elevação pélvica.*marcha|ponte unilateral|ponte de glúteo unilateral", "Butt_Lift_Bridge"),
    (r"elevação pélvica", "Barbell_Hip_Thrust"),
    (r"terra romeno|levantamento terra romeno", "Romanian_Deadlift"),
    (r"stiff com barra", "Stiff-Legged_Barbell_Deadlift"),
    (r"stiff", "Stiff-Legged_Dumbbell_Deadlift"),
    (r"good morning", "Good_Morning"),
    (r"barra hexagonal", "Trap_Bar_Deadlift"),
    (r"dobradiça de quadril com elástico|deadlift com elástico", "Band_Good_Morning"),
    (r"levantamento terra(?! romeno)", "Barbell_Deadlift"),
    (r"(coice|glúteo) (na polia|com elástico)|one.?leg.*kickback|glúteo na polia", "One-Legged_Cable_Kickback"),
    (r"coice", "Glute_Kickback"),
    (r"extensão de quadril no banco romano|hiperextensão", "Hyperextensions_Back_Extensions"),
    # ----- afundos / passadas -----
    (r"afundo (caminhando|alternado)|avanço alternado", "Dumbbell_Lunges"),
    (r"afundo reverso", "Dumbbell_Rear_Lunge"),
    (r"avanço com salto|jump lunge|troca aérea", "Scissors_Jump"),
    (r"afundo (estacionário|estático|com halteres)", "Split_Squats"),
    (r"subida no step|step.?up", "Dumbbell_Step_Ups"),
    # ----- panturrilhas -----
    (r"panturrilha sentada", "Seated_Calf_Raise"),
    (r"panturrilha", "Standing_Calf_Raises"),
    # ----- empurrar -----
    (r"supino (reto )?com barra|supino com barra em velocidade", "Barbell_Bench_Press_-_Medium_Grip"),
    (r"supino inclinado (com halteres|na máquina)?.*halter|supino inclinado com halteres", "Incline_Dumbbell_Press"),
    (r"supino inclinado na máquina", "Leverage_Incline_Chest_Press"),
    (r"supino inclinado", "Incline_Dumbbell_Press"),
    (r"supino (reto )?(com halteres|halteres)", "Dumbbell_Bench_Press"),
    (r"supino (reto )?(na máquina|máquina)|chest press", "Machine_Bench_Press"),
    (r"crucifixo invertido", "Reverse_Machine_Flyes"),
    (r"crucifixo (na máquina|máquina)|peck deck", "Butterfly"),
    (r"crucifixo (na polia|polia)|cross.?over", "Cable_Crossover"),
    (r"crucifixo", "Dumbbell_Flyes"),
    (r"desenvolvimento militar|militar com barra", "Standing_Military_Press"),
    (r"desenvolvimento (na |de ombros na )?máquina", "Machine_Shoulder_Military_Press"),
    (r"desenvolvimento (com |de ombros com )?halter", "Dumbbell_Shoulder_Press"),
    (r"push press", "Push_Press"),
    (r"desenvolvimento", "Dumbbell_Shoulder_Press"),
    (r"elevação lateral (na polia|polia)", "Cable_Seated_Lateral_Raise"),
    (r"elevação lateral com elástico", "Lateral_Raise_-_With_Bands"),
    (r"elevação lateral", "Side_Lateral_Raise"),
    (r"elevação frontal (na polia|polia)", "Front_Cable_Raise"),
    (r"elevação frontal", "Front_Dumbbell_Raise"),
    (r"face pull", "Face_Pull"),
    (r"encolhimento", "Dumbbell_Shrug"),
    (r"flexão pliométrica|com palmas", "Pushups"),
    (r"flexão de braço.*(inclinada|mesa|parede)|flexão inclinada", "Incline_Push-Up"),
    (r"flexão diamante", "Push-Ups_-_Close_Triceps_Position"),
    (r"flexão de braço.*larga|pegada larga", "Push-Up_Wide"),
    (r"flexão de braço|flexões", "Pushups"),
    (r"paralelas|mergulho|dips.*(chest|peito)", "Dips_-_Chest_Version"),
    (r"tríceps no banco|tríceps na cadeira|bench dip|dips?\)? no banco", "Bench_Dips"),
    # ----- tríceps -----
    (r"tríceps.*(corda)", "Triceps_Pushdown_-_Rope_Attachment"),
    (r"tríceps testa", "EZ-Bar_Skullcrusher"),
    (r"tríceps francês|extensão acima da cabeça", "Seated_Triceps_Press"),
    (r"tríceps coice", "Tricep_Dumbbell_Kickback"),
    (r"tríceps (na polia|polia|barra reta)", "Triceps_Pushdown"),
    # ----- puxar -----
    (r"barra fixa assistida|pull.?up assistid", "Band_Assisted_Pull-Up"),
    (r"barra fixa", "Pullups"),
    (r"puxada.*(supinada)", "Close-Grip_Front_Lat_Pulldown"),
    (r"puxada.*(neutra|triângulo)", "Close-Grip_Front_Lat_Pulldown"),
    (r"puxada (frontal|na polia|alta)", "Wide-Grip_Lat_Pulldown"),
    (r"pulldown.*(braços estendidos)|pullover (na polia|polia)", "Straight-Arm_Pulldown"),
    (r"pullover", "Straight-Arm_Dumbbell_Pullover"),
    (r"remada curvada com barra", "Bent_Over_Barbell_Row"),
    (r"remada curvada com halter", "Bent_Over_Two-Dumbbell_Row"),
    (r"remada unilateral|serrote", "One-Arm_Dumbbell_Row"),
    (r"remada (articulada|na máquina|máquina)", "Leverage_High_Row"),
    (r"remada (baixa|sentada)? ?(na polia|polia|baixa)", "Seated_Cable_Rows"),
    (r"remada alta", "Upright_Barbell_Row"),
    (r"high pull", "Upright_Barbell_Row"),
    (r"remada explosiva", "Seated_Cable_Rows"),
    # ----- bíceps -----
    (r"rosca direta com barra w|barra w", "EZ-Bar_Curl"),
    (r"rosca direta com barra", "Barbell_Curl"),
    (r"rosca (direta )?(na polia|polia)", "Standing_Biceps_Cable_Curl"),
    (r"rosca (direta )?(na |a )?máquina", "Machine_Bicep_Curl"),
    (r"rosca alternada inclinada|rosca inclinada", "Incline_Dumbbell_Curl"),
    (r"rosca martelo.*(corda)", "Cable_Hammer_Curls_-_Rope_Attachment"),
    (r"rosca martelo", "Hammer_Curls"),
    (r"rosca alternada", "Dumbbell_Alternate_Bicep_Curl"),
    (r"rosca punho|punho", "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench"),
    (r"rosca direta", "Dumbbell_Bicep_Curl"),
    # ----- core -----
    (r"prancha lateral", "Side_Bridge"),
    (r"prancha", "Plank"),
    (r"dead bug", "Dead_Bug"),
    (r"abdominal.*(máquina)", "Ab_Crunch_Machine"),
    (r"abdominal.*(polia)", "Cable_Crunch"),
    (r"abdominal infra.*(barra fixa|paralela)", "Hanging_Leg_Raise"),
    (r"abdominal infra.*(banco)", "Flat_Bench_Lying_Leg_Raise"),
    (r"abdominal infra|elevação de pernas|joelhos ao peito", "Bent-Knee_Hip_Raise"),
    (r"abdominal.*(bola)", "Exercise_Ball_Crunch"),
    (r"abdominal|crunch", "Crunches"),
    (r"pallof", "Pallof_Press"),
    (r"lenhador|rotação de tronco na polia", "Standing_Cable_Wood_Chop"),
    (r"russian twist", "Russian_Twist"),
    (r"mountain climber", "Mountain_Climbers"),
    (r"superman", "Superman"),
    # ----- potência / condicionamento -----
    (r"kettlebell swing|swing", "One-Arm_Kettlebell_Swings"),
    (r"salto (na caixa|caixa)|box jump", "Front_Box_Jump"),
    (r"salto com queda|depth jump", "Depth_Jump_Leap"),
    (r"salto horizontal|broad jump", "Standing_Long_Jump"),
    (r"medicine ball slam|slam", "One-Arm_Medicine_Ball_Slam"),
    (r"chest pass", "Medicine_Ball_Chest_Pass"),
    (r"arremesso de medicine ball", "Medicine_Ball_Scoop_Throw"),
    (r"sled push|trenó", "Sled_Push"),
    (r"farmer|fazendeiro", "Farmers_Walk"),
    (r"sprint.*esteira|corrida.*esteira", "Running_Treadmill"),
    (r"^bike|bicicleta (ergométrica|intervalada)|^assault", "Bicycling_Stationary"),
    (r"^remo|remo ergômetro", "Rowing_Stationary"),
    (r"elíptico", "Elliptical_Trainer"),
    (r"caminhada.*(esteira)|esteira", "Walking_Treadmill"),
    # ----- mobilidade / alongamento -----
    (r"gato.?camelo", "Cat_Stretch"),
    (r"alongamento de (isquiotibiais|cadeia posterior)", "Standing_Hamstring_and_Calf_Stretch"),
    (r"quadríceps em pé", "Standing_Elevated_Quad_Stretch"),
    (r"panturrilhas? na parede", "Calf_Stretch_Hands_Against_Wall"),
    (r"peitoral na (porta|parede)", "Chest_And_Front_Of_Shoulder_Stretch"),
    (r"rotação externa", "External_Rotation_with_Band"),
    # ----- elásticos (correspondências disponíveis) -----
    (r"good morning com elástico", "Band_Good_Morning"),
]

CSS_TEMPLATE = """
@page {{
    size: A4; margin: 2.2cm 1.8cm 2.4cm 1.8cm;
    @bottom-left {{ content: "Biblioteca de Treinos Validados e Personalizáveis Pro™";
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif; }}
    @bottom-right {{ content: "Prof. José Carlos Gallo · pág. " counter(page) " de " counter(pages);
        font-size: 7.5pt; color: #999; font-family: Helvetica, Arial, sans-serif; }}
}}
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 9.5pt; color: #2c3e50; line-height: 1.45; }}
.capa {{ background: {accent}; color: white; padding: 26px 30px; border-radius: 10px; margin-bottom: 22px; }}
.capa .categoria {{ font-size: 9pt; letter-spacing: 3px; text-transform: uppercase; opacity: 0.92; margin-bottom: 6px; }}
.capa h1 {{ margin: 0 0 10px 0; font-size: 23pt; line-height: 1.15; }}
.capa .meta {{ font-size: 9pt; opacity: 0.95; line-height: 1.7; }}
blockquote {{ border-left: 4px solid {accent}; background: #f6f8fa; margin: 14px 0;
    padding: 10px 14px; font-style: italic; color: #444; border-radius: 0 6px 6px 0; }}
h2 {{ color: {accent}; font-size: 13pt; border-bottom: 2px solid {accent};
    padding-bottom: 4px; margin-top: 22px; margin-bottom: 10px; page-break-after: avoid; }}
h3 {{ color: #2c3e50; font-size: 11pt; margin-top: 14px; margin-bottom: 6px; page-break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; margin: 8px 0 14px 0; font-size: 8.5pt; page-break-inside: avoid; }}
th {{ background: {accent}; color: white; padding: 5px 7px; text-align: left; font-size: 8.5pt; }}
td {{ border: 1px solid #dde3e8; padding: 4px 7px; vertical-align: top; }}
tr:nth-child(even) td {{ background: #f6f8fa; }}
ul, ol {{ margin: 6px 0 10px 0; padding-left: 18px; }}
li {{ margin-bottom: 3px; }}
p {{ margin: 6px 0; }}
strong {{ color: #1a252f; }}
.ex-bloco {{ page-break-inside: avoid; margin-bottom: 12px; }}
.ex-fotos {{ display: flex; gap: 8px; margin: 6px 0 4px 0; justify-content: center; }}
.ex-fotos figure {{ margin: 0; width: 44%; }}
.ex-fotos img {{ width: 100%; border-radius: 8px; border: 1px solid #dde3e8; }}
.ex-fotos figcaption {{ font-size: 7.5pt; color: #888; text-align: center; margin-top: 2px; }}
"""

_db_ids = None


def db_ids() -> set:
    global _db_ids
    if _db_ids is None:
        cache = FOTOS / "exercises.json"
        if not cache.exists():
            FOTOS.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(DB_JSON, cache)
        _db_ids = {e["id"] for e in json.load(open(cache, encoding="utf-8"))}
    return _db_ids


def baixar(ex_id: str) -> list:
    """Baixa (com cache) e otimiza as 2 fotos do exercício; retorna paths."""
    pasta = FOTOS / ex_id
    pasta.mkdir(parents=True, exist_ok=True)
    paths = []
    for i in (0, 1):
        dest = pasta / f"{i}.jpg"
        if not dest.exists():
            try:
                raw = urllib.request.urlopen(f"{RAW}/{ex_id}/{i}.jpg", timeout=30).read()
                img = Image.open(io.BytesIO(raw)).convert("RGB")
                img.thumbnail((640, 640))
                img.save(dest, "JPEG", quality=72, optimize=True)
            except Exception:
                continue
        paths.append(dest)
    return paths


def mapear(nome: str):
    n = nome.lower()
    for pat, ex_id in RULES:
        if re.search(pat, n):
            return ex_id if ex_id in db_ids() else None
    return None


def build_pdf(code: str) -> tuple:
    md_path = ROTEIROS / f"{code}.md"
    text = md_path.read_text(encoding="utf-8")
    cat_name, accent = CATEGORIAS[code[:3]]
    lines = text.splitlines()
    titulo = lines[0].lstrip("# ").strip()
    meta = [l for l in lines[1:6] if l.startswith("**")]
    meta_html = "<br/>".join(re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", l) for l in meta)

    body_lines, skipping = [], True
    for l in lines[1:]:
        if skipping and (l.startswith("**") or not l.strip()):
            continue
        skipping = False
        body_lines.append(l)
    body_md = "\n".join(body_lines)

    # nomes em negrito da seção de execução
    exec_match = re.search(r"## Como Executar os Exercícios(.*?)(?=\n## (?!#)|\Z)", text, re.S)
    nomes = re.findall(r"^\*\*(.+?)\*\* —", exec_match.group(1), re.M) if exec_match else []

    html_body = markdown.markdown(body_md, extensions=["tables"])

    com_foto = sem_foto = 0
    vistos = set()
    for nome in sorted(set(nomes), key=len, reverse=True):
        ex_id = mapear(nome)
        if not ex_id:
            sem_foto += 1
            continue
        fotos = baixar(ex_id)
        if not fotos:
            sem_foto += 1
            continue
        com_foto += 1
        figs = "".join(
            f'<figure><img src="file://{p}"/><figcaption>'
            f'{"Posição inicial" if i == 0 else "Posição final"}</figcaption></figure>'
            for i, p in enumerate(fotos)
        )
        pattern = re.compile(r"<p><strong>" + re.escape(nome) + r"</strong>(.*?)</p>", re.S)
        repl = (
            f'<div class="ex-bloco"><div class="ex-fotos">{figs}</div>'
            f"<p><strong>{nome}</strong>\\1</p></div>"
        )
        html_body = pattern.sub(repl, html_body)

    html = f"""<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="utf-8"><style>{CSS_TEMPLATE.format(accent=accent)}</style></head>
<body>
<div class="capa">
  <div class="categoria">{cat_name} · Programa de Treinamento</div>
  <h1>{titulo}</h1>
  <div class="meta">{meta_html}</div>
</div>
{html_body}
<p style="font-size:7.5pt;color:#999;margin-top:18px;">Fotos de exercícios: free-exercise-db (domínio público).</p>
</body></html>"""

    OUT.mkdir(parents=True, exist_ok=True)
    out_path = OUT / f"{code}.pdf"
    HTML(string=html).write_pdf(out_path)
    return out_path, com_foto, sem_foto


if __name__ == "__main__":
    targets = sys.argv[1:] or sorted(
        p.stem for p in ROTEIROS.glob("*.md") if p.stem != "README"
    )
    total_c = total_s = 0
    for code in targets:
        path, c, s = build_pdf(code)
        total_c += c
        total_s += s
        print(f"OK {code}: {c} exercícios com foto, {s} sem")
    print(f"TOTAL: {total_c} com foto, {total_s} sem foto")
