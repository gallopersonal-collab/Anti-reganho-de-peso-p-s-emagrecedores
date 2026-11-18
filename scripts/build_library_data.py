#!/usr/bin/env python3
"""Converte os 60 roteiros da Biblioteca de Treinos (Markdown) em dados do app.

Lê biblioteca-de-treinos/roteiros/*.md e grava app-programas/library-data.js com
window.LIBRARY_DATA = { "<CÓDIGO>": { title, tagline, overview, warmup, workouts, ... } }.
O app usa esses dados para preencher o programa inteiro (treinos, exercícios,
séries, repetições, descanso, cadência, execução e cuidados) ao clicar em
"Criar programa" num PDF da biblioteca.
Uso: python3 scripts/build_library_data.py
"""
import json
import re
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SRC = BASE / "biblioteca-de-treinos" / "roteiros"
OUT = BASE / "app-programas" / "library-data.js"
CODE_RE = re.compile(r"^(EMA|DEF|HIP|PER|SAU)-[FM]-\d{2}-\d{2}-(INI|INT|AVA|HIT)-(ACA|CAS|ELA)$")


def clean(t: str) -> str:
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"\[(.+?)\]\([^)]*\)", r"\1", t)
    return re.sub(r"\s+", " ", t).strip()


def norm(t: str) -> str:
    t = unicodedata.normalize("NFD", clean(t).lower())
    return re.sub(r"[^a-z0-9]+", " ", "".join(c for c in t if unicodedata.category(c) != "Mn")).strip()


def base(t: str) -> str:
    return norm(re.sub(r"\(.*?\)", " ", t))


def match_how(name: str, pool: dict, pos: int):
    """Acha o texto de execução do exercício: exato, sem parênteses, prefixo, palavras em comum, posição."""
    if not pool:
        return None
    n, b = norm(name), base(name)
    if n in pool:
        return pool[n]
    bases = {base(k): v for k, v in pool.items()}
    if b in bases:
        return bases[b]
    for k, v in bases.items():
        if k and (b.startswith(k) or k.startswith(b)):
            return v
    words = set(b.split())
    best, score = None, 0.0
    for k, v in bases.items():
        kw = set(k.split())
        s = len(words & kw) / max(1, len(words | kw))
        if s > score:
            best, score = v, s
    if score >= 0.4:
        return best
    items = list(pool.values())
    return items[pos] if pos < len(items) else None


def sections(md: str) -> dict:
    out, cur = {}, None
    for line in md.splitlines():
        m = re.match(r"^## (.+)", line)
        if m:
            cur = m.group(1).strip()
            out[cur] = []
        elif cur:
            out[cur].append(line)
    return out


def find(secs: dict, prefix: str) -> list:
    for k, v in secs.items():
        if k.startswith(prefix):
            return v
    return []


def bullets(lines: list) -> list:
    return [clean(l[2:]) for l in lines if l.startswith("- ")]


def split_treino(title: str):
    m = re.match(r"(Treino [A-Z0-9]+|[^—–-]+?)\s*[—–-]\s*(.+)", title)
    return (m.group(1).strip(), m.group(2).strip()) if m else (title.strip(), "")


def parse(md: str) -> dict:
    lines = md.splitlines()
    title = clean(lines[0].lstrip("# "))
    tagline = next((clean(l[1:]) for l in lines if l.startswith(">")), "")
    secs = sections(md)

    # Como executar: por treino -> nome normalizado -> (execução, cuidados)
    how, how_all, cur = {}, {}, None
    for l in find(secs, "Como Executar"):
        m = re.match(r"^### (.+)", l)
        if m:
            cur = split_treino(m.group(1))[0]
            how.setdefault(cur, {})
            continue
        m = re.match(r"^\*\*(.+?)\*\*\s*[—–-]\s*(.+)", l)
        if m:
            text = m.group(2)
            ex, _, caution = text.partition("⚠️")
            item = (clean(ex), clean(caution))
            how.setdefault(cur, {})[norm(m.group(1))] = item
            how_all.setdefault(norm(m.group(1)), item)

    workouts, w = [], None
    for l in find(secs, "Treinos da Semana"):
        m = re.match(r"^### (.+)", l)
        if m:
            name, focus = split_treino(clean(m.group(1)))
            w = {"name": name, "focus": focus, "exercises": [], "_cols": []}
            workouts.append(w)
            continue
        if w is None:
            continue
        if l.startswith("| #"):
            w["_cols"] = [c.strip() for c in l.strip("|").split("|")]
            continue
        if re.match(r"^\|\s*\d+", l):
            cells = [clean(c) for c in l.strip().strip("|").split("|")]
            cols = w["_cols"]
            get = lambda i: cells[i] if i < len(cells) else ""
            exname = get(1)
            label = "Tempo" if len(cols) > 3 and cols[3].lower().startswith("trabalho") else "Reps"
            pos = len([e for e in w["exercises"] if e["name"] != "Cardio / Finalizador"])
            ex_txt, caution = (match_how(exname, how.get(w["name"], {}), pos)
                               or how_all.get(norm(exname)) or ("", ""))
            w["exercises"].append({
                "name": exname, "sets": get(2), "reps": get(3), "repsLabel": label,
                "rest": get(4), "cadence": get(5), "execution": ex_txt, "cautions": caution,
            })
            continue
        m = re.match(r"^\*\*(Cardio[^*]*?):?\*\*:?\s*(.+)", l)
        if m:
            w["exercises"].append({
                "name": "Cardio / Finalizador", "sets": "", "reps": "", "repsLabel": "Tempo",
                "rest": "", "cadence": "", "execution": clean(m.group(2)), "cautions": "",
            })
    for w in workouts:
        w.pop("_cols", None)

    weeks = []
    for b in find(secs, "Progressão Semana"):
        m = re.match(r"^- \*\*(.+?)\*\*", b)
        if m:
            weeks.append(clean(m.group(1)).rstrip(":"))
    safety = bullets(find(secs, "Observações de Segurança"))
    return {
        "title": title,
        "tagline": tagline,
        "overview": clean(" ".join(find(secs, "Visão Geral"))),
        "warmup": bullets(find(secs, "Aquecimento")),
        "workouts": workouts,
        "weeks": weeks,
        "load": bullets(find(secs, "Diretrizes de Progressão")),
        "safety": safety,
        "next": clean(" ".join(find(secs, "Próximo Passo"))),
    }


FOTOS_SRC = BASE / "biblioteca-de-treinos" / "fotos-exercicios"
FOTOS_OUT = BASE / "app-programas" / "fotos"


def load_rules() -> list:
    """Reaproveita as regras nome->foto de scripts/gerar_pdfs_com_fotos.py."""
    import ast
    src = (BASE / "scripts" / "gerar_pdfs_com_fotos.py").read_text(encoding="utf-8")
    m = re.search(r"RULES = (\[.*?\n\])", src, re.S)
    return ast.literal_eval(m.group(1))


# Itens sem texto de execução no roteiro (evita herdar o texto de outro exercício)
EXEC_OVERRIDE = {
    "transicao ativa": "Caminhada leve por 3 minutos para baixar a frequência cardíaca entre os blocos. "
                       "Respire fundo pelo nariz, solte os ombros e aproveite para se hidratar antes do próximo bloco.",
}

# Exercícios que as regras do gerador de PDF não cobrem (fotos só para o app)
EXTRA_RULES = [
    (r"transi[cç][aã]o ativa", "Active_Recovery_Walk"),
    (r"^cardio|finalizador|caminhada/bike intervalada", "Cardio_Finalizador"),
    (r"circuito metab|wall ball", "Wall_Ball"),
    (r"avan[cç]o.*halter", "Dumbbell_Lunges"),
    (r"rosca direta na m[aá]quina", "Dumbbell_Bicep_Curl"),
    (r"flex[aã]o de joelho em p[eé] com el[aá]stico", "Standing_Leg_Curl"),
    (r"supino em p[eé] com el[aá]stico", "Band_Chest_Press"),
    (r"remada sentada com el[aá]stico", "Band_Seated_Row"),
    (r"abdu[cç][aã]o de quadril na polia", "Cable_Hip_Abduction"),
    (r"abdu[cç][aã]o sentada", "Seated_Band_Abduction"),
    (r"abdu[cç][aã]o de quadril em p[eé]", "Band_Standing_Hip_Abduction"),
    (r"caminhada lateral", "Band_Lateral_Walk"),
    (r"tr[ií]ceps no el[aá]stico", "Band_Triceps_Pushdown"),
    (r"remada invertida", "Inverted_Row_Table"),
    (r"mochila", "Backpack_Bent_Over_Row"),
    (r"pike push", "Pike_Push_Up"),
    (r"burpee", "Burpee_Step_Back"),
    (r"afundo lateral", "Lateral_Lunge"),
    (r"puxada com el[aá]stico", "Band_Lat_Pulldown"),
    (r"equil[ií]brio unipodal", "Single_Leg_Balance"),
    (r"calcanhar-ponta|linha reta", "Tandem_Walk"),
    (r"skipping", "High_Knees"),
    (r"maior alongamento do mundo|sequ[eê]ncia de mobilidade", "Worlds_Greatest_Stretch"),
    (r"90/90", "Hip_90_90"),
    (r"wall slide|deslizamento de bra[cç]os", "Wall_Slide"),
    (r"tornozelo", "Ankle_Mobility"),
    (r"alongamento global", "Posterior_Chain_Stretch"),
]


def photo_for(name: str, rules: list):
    n = name.lower()
    for pat, ex_id in rules:
        if re.search(pat, n):
            if (FOTOS_SRC / ex_id / "0.jpg").exists() or (FOTOS_OUT / "F" / f"{ex_id}.jpg").exists():
                return ex_id
            break
    for pat, ex_id in EXTRA_RULES:
        if re.search(pat, n) and (FOTOS_OUT / "F" / f"{ex_id}.jpg").exists():
            return ex_id
    return None


def build_photo(ex_id: str) -> None:
    """Fallback: junta as fotos de posição inicial e final numa imagem vertical.
    As fotos oficiais (geradas por IA, 600x800) ficam em fotos/F e fotos/M."""
    from PIL import Image
    dest = FOTOS_OUT / f"{ex_id}.jpg"
    if dest.exists():
        return
    imgs = [Image.open(p).convert("RGB") for p in sorted((FOTOS_SRC / ex_id).glob("*.jpg"))[:2]]
    W = 520
    imgs = [im.resize((W, round(im.height * W / im.width))) for im in imgs]
    out = Image.new("RGB", (W, sum(im.height for im in imgs) + 6 * (len(imgs) - 1)), (255, 255, 255))
    y = 0
    for im in imgs:
        out.paste(im, (0, y))
        y += im.height + 6
    FOTOS_OUT.mkdir(exist_ok=True)
    out.save(dest, "JPEG", quality=74, optimize=True)


def main() -> None:
    data = {}
    for f in sorted(SRC.glob("*.md")):
        if CODE_RE.match(f.stem):
            data[f.stem] = parse(f.read_text(encoding="utf-8"))
    rules = load_rules()
    used = set()
    for code, d in data.items():
        sex = code.split("-")[1]  # F ou M: foto com aluna ou aluno
        for w in d["workouts"]:
            for e in w["exercises"]:
                if norm(e["name"]) in EXEC_OVERRIDE:
                    e["execution"] = EXEC_OVERRIDE[norm(e["name"])]
                pid = photo_for(e["name"], rules)
                if pid:
                    sexed = FOTOS_OUT / sex / f"{pid}.jpg"
                    e["image"] = f"fotos/{sex}/{pid}.jpg" if sexed.exists() else f"fotos/{pid}.jpg"
                    used.add(pid)
    for pid in sorted(used):
        if (FOTOS_SRC / pid).exists():
            build_photo(pid)
    total = sum(len(w["exercises"]) for d in data.values() for w in d["workouts"])
    with_photo = sum(1 for d in data.values() for w in d["workouts"] for e in w["exercises"] if e.get("image"))
    print(f"fotos: {with_photo}/{total} exercícios com foto, {len(used)} imagens em {FOTOS_OUT}")
    missing = [(c, w["name"], e["name"]) for c, d in data.items() for w in d["workouts"] for e in w["exercises"]
               if not e["execution"]]
    OUT.write_text("window.LIBRARY_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
                   encoding="utf-8")
    n_ex = sum(len(w["exercises"]) for d in data.values() for w in d["workouts"])
    print(f"{len(data)} programas, {n_ex} exercícios, {len(missing)} sem texto de execução -> {OUT} "
          f"({OUT.stat().st_size // 1024} KB)")
    for m in missing[:15]:
        print("  sem execução:", *m)


if __name__ == "__main__":
    main()
