#!/usr/bin/env python3
"""Gera os prompts de imagem (PT + EN) de cada programa da biblioteca,
para o usuário criar as próprias imagens em qualquer ferramenta de IA."""
import json
import re
from pathlib import Path

import markdown
from weasyprint import HTML

BASE = Path(__file__).resolve().parent.parent
ROTEIROS = BASE / "biblioteca-de-treinos" / "roteiros"
OUT_MD = BASE / "biblioteca-de-treinos" / "prompts-de-imagem.md"
OUT_PDF = BASE / "biblioteca-de-treinos" / "prompts-de-imagem.pdf"

import sys
sys.path.insert(0, str(Path(__file__).parent))
from gerar_pdfs_com_fotos import RULES, FOTOS  # reaproveita o mapeamento PT->EN

DB = {e["id"]: e["name"] for e in json.load(open(FOTOS / "exercises.json", encoding="utf-8"))}

CATEGORIAS = {
    "EMA": "Emagrecimento", "HIP": "Hipertrofia", "DEF": "Definição Muscular",
    "SAU": "Saúde e Qualidade de Vida", "PER": "Performance",
}

SUJEITO_PT = {
    ("EMA", "F"): "mulher real de {idade} anos em processo de transformação, aparência saudável",
    ("EMA", "M"): "homem real de {idade} anos em processo de transformação, aparência saudável",
    ("HIP", "F"): "mulher atlética e forte de {idade} anos",
    ("HIP", "M"): "homem atlético e musculoso de {idade} anos",
    ("DEF", "F"): "mulher atlética definida de {idade} anos",
    ("DEF", "M"): "homem atlético definido de {idade} anos",
    ("SAU", "F"): "mulher de {idade} anos com aparência real, saudável e vital (não fisiculturista)",
    ("SAU", "M"): "homem de {idade} anos com aparência real, saudável e vital (não fisiculturista)",
    ("PER", "F"): "mulher atleta de {idade} anos em alta performance",
    ("PER", "M"): "homem atleta de {idade} anos em alta performance",
}
SUJEITO_EN = {
    ("EMA", "F"): "real woman in her {idade_en}, healthy appearance, fitness transformation journey",
    ("EMA", "M"): "real man in his {idade_en}, healthy appearance, fitness transformation journey",
    ("HIP", "F"): "strong athletic woman in her {idade_en}",
    ("HIP", "M"): "muscular athletic man in his {idade_en}",
    ("DEF", "F"): "lean athletic woman in her {idade_en}",
    ("DEF", "M"): "lean athletic man in his {idade_en}",
    ("SAU", "F"): "real healthy woman in her {idade_en}, natural look, not a bodybuilder",
    ("SAU", "M"): "real healthy man in his {idade_en}, natural look, not a bodybuilder",
    ("PER", "F"): "high-performance female athlete in her {idade_en}",
    ("PER", "M"): "high-performance male athlete in his {idade_en}",
}
AMBIENTE = {
    "ACA": ("em academia premium moderna", "in a modern premium gym"),
    "CAS": ("em casa, na sala de estar", "at home, in the living room"),
    "ELA": ("em casa, treinando com elásticos de resistência", "at home, training with resistance bands"),
}

ESTILO_PT = ("fotografia profissional realista e cinematográfica, iluminação dramática "
             "low-key com destaques quentes, profundidade de campo rasa, estilo editorial "
             "de revista fitness, pele com textura real — sem ilustração, sem desenho, sem anime")
ESTILO_EN = ("professional photorealistic cinematic photography, dramatic low-key lighting "
             "with warm highlights, shallow depth of field, high-end fitness magazine "
             "editorial style, realistic skin texture — no illustration, no drawing, no anime")


def idade_en(faixa: str) -> str:
    ini = faixa.split("–")[0].strip()
    return {"20": "20s-30s", "30": "30s", "40": "40s", "50": "50s"}.get(ini[:2], "30s") if not faixa.startswith("20–60") else "30s-50s"


def en_name(nome_pt: str):
    n = nome_pt.lower()
    for pat, ex_id in RULES:
        if re.search(pat, n):
            return DB.get(ex_id)
    return None


def main():
    blocos = []
    for md_path in sorted(ROTEIROS.glob("*.md")):
        code = md_path.stem
        if code == "README":
            continue
        cat, sexo = code[:3], code.split("-")[1]
        txt = md_path.read_text(encoding="utf-8")
        linhas = txt.splitlines()
        titulo = linhas[0].lstrip("# ").strip()
        m_faixa = re.search(r"Faixa etária:\*\* ([\d–\-]+)", txt) or re.search(r"Faixa etária:\*\*\s*([^·]+)", txt)
        faixa = m_faixa.group(1).strip() if m_faixa else "30–39"
        amb_key = code.split("-")[-1]
        amb_pt, amb_en = AMBIENTE.get(amb_key, AMBIENTE["ACA"])
        suj_pt = SUJEITO_PT[(cat, sexo)].format(idade=faixa)
        suj_en = SUJEITO_EN[(cat, sexo)].format(idade_en=idade_en(faixa))

        # seções de treino com primeiros exercícios das tabelas
        secoes = []
        for m in re.finditer(r"^### (Treino [^\n—-]+(?:[—-][^\n]*)?)\n((?:.*\n)*?)(?=^###|\Z)", txt, re.M):
            nome_sec = m.group(1).strip()
            if "executar" in nome_sec.lower():
                continue
            exs = re.findall(r"^\|\s*\d+[A-B]?\s*\|\s*([^|]+?)\s*\|", m.group(2), re.M)
            if exs:
                secoes.append((nome_sec, exs[:3]))

        bloco = [f"## {code} — {titulo}", ""]
        bloco.append(f"**Capa**")
        bloco.append(f"- PT: {suj_pt}, em pose confiante {amb_pt}, {ESTILO_PT}")
        bloco.append(f"- EN: {suj_en}, confident pose {amb_en}, {ESTILO_EN}")
        bloco.append("")
        for nome_sec, exs in secoes:
            ex_pt = exs[0]
            ex_en = en_name(ex_pt) or ex_pt
            outros_en = [en_name(e) or e for e in exs[1:2]]
            extra_en = f" (alternative: {outros_en[0]})" if outros_en else ""
            bloco.append(f"**{nome_sec}**")
            bloco.append(f"- PT: {suj_pt} executando {ex_pt.lower()} {amb_pt}, {ESTILO_PT}")
            bloco.append(f"- EN: {suj_en} performing {ex_en} {amb_en}, {ESTILO_EN}{extra_en}")
            bloco.append("")
        blocos.append("\n".join(bloco))

    cabecalho = f"""# 🎬 Prompts de Imagem — Biblioteca de Treinos PRO

*Biblioteca de Treinos Validados e Personalizáveis Pro™ · Prof. José Carlos Gallo*

Prompts prontos para gerar as imagens dos seus programas em qualquer ferramenta de IA
(Gamma, Midjourney, DALL·E, Leonardo, Freepik etc.). Cada programa tem um prompt de **capa**
e um por **seção de treino**, em português (PT) e inglês (EN — geralmente gera resultados melhores).

**Dica:** se a ferramenta tiver configuração de estilo, selecione "Fotorrealista" e cole o prompt.
No Gamma, troque o estilo de arte padrão de "Ilustração" para **Fotorrealista** em: editor →
Imagens IA → Estilo de arte.

---

"""
    md_text = cabecalho + "\n\n---\n\n".join(blocos) + "\n"
    OUT_MD.write_text(md_text, encoding="utf-8")

    css = """
@page { size: A4; margin: 2cm 1.8cm;
  @bottom-left { content: "Biblioteca de Treinos Validados e Personalizáveis Pro™"; font-size: 7.5pt; color: #999; }
  @bottom-right { content: "Prof. José Carlos Gallo · pág. " counter(page) " de " counter(pages); font-size: 7.5pt; color: #999; } }
body { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; color: #2c3e50; line-height: 1.5; }
h1 { color: #1a252f; font-size: 18pt; }
h2 { color: #8e44ad; font-size: 11.5pt; border-bottom: 2px solid #8e44ad; padding-bottom: 3px; margin-top: 18px; page-break-after: avoid; }
li { margin-bottom: 5px; }
ul { padding-left: 16px; }
strong { color: #1a252f; }
hr { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
p { margin: 6px 0; }
"""
    html_body = markdown.markdown(md_text)
    HTML(string=f"<html><head><meta charset='utf-8'><style>{css}</style></head><body>{html_body}</body></html>").write_pdf(OUT_PDF)
    print(f"OK {OUT_MD}")
    print(f"OK {OUT_PDF}")


if __name__ == "__main__":
    main()
