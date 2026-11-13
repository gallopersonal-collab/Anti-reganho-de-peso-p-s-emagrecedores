#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera os 3 PDFs (apresentação 16:9) do Método Antirreganho.
Uso:  python3 programas-antirreganho/gerar.py
Requer: Node + Playwright (Chromium) disponíveis no ambiente."""
import html
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from conteudo import FASES, PRATOS  # noqa: E402

RAIZ = AQUI.parent
FOTOS_EX = RAIZ / "biblioteca-de-treinos" / "fotos-exercicios"
PRATOS_DIR = AQUI / "imagens" / "pratos"
LOGO = RAIZ / "pagina-peso" / "logo-gallo.jpg"
OUT = AQUI / "pdf"
HTML_DIR = AQUI / "html"

e = html.escape
NAVY = "#0B1630"
TXT = "#14213D"
MUTED = "#5B6478"


def uri(p: Path) -> str:
    return p.resolve().as_uri()


def ex_img(foto, i):
    p = FOTOS_EX / foto / f"{i}.jpg"
    if not p.exists():
        raise FileNotFoundError(p)
    return uri(p)


def prato_img(chave):
    return uri(PRATOS_DIR / (PRATOS[chave]["img"] + ".jpg"))


CSS = """
@page { size: 1280px 720px; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { font-family: 'Inter', 'DejaVu Sans', sans-serif; color: %(TXT)s; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slide { width: 1280px; height: 720px; position: relative; overflow: hidden; page-break-after: always; background: #FAFAF7; padding: 54px 64px 70px; }
.slide:last-child { page-break-after: auto; }
h1, h2, h3 { font-family: 'Inter Display', 'Inter', sans-serif; letter-spacing: -0.02em; }
.kicker { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--c); margin-bottom: 8px; }
h2.t { font-size: 38px; font-weight: 800; line-height: 1.08; color: %(NAVY)s; margin-bottom: 26px; }
h2.t small { display:block; font-size: 17px; font-weight: 500; color: %(MUTED)s; letter-spacing: 0; margin-top: 8px; }
.foot { position: absolute; left: 64px; right: 64px; bottom: 24px; display: flex; justify-content: space-between; font-size: 11.5px; color: #8A92A6; border-top: 1px solid #E3E5EA; padding-top: 10px; }
.foot b { color: var(--c); }
.bar { position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: var(--c); }
.grid { display: grid; gap: 18px; }
.card { background: #fff; border-radius: 16px; padding: 28px 30px; box-shadow: 0 1px 2px rgba(20,33,61,.06), 0 6px 20px rgba(20,33,61,.06); }
.card h3 { font-size: 23px; font-weight: 750; color: %(NAVY)s; margin-bottom: 8px; }
.card p { font-size: 17px; line-height: 1.55; color: #3A4358; }
.num { width: 34px; height: 34px; border-radius: 50%%; background: var(--c); color: #fff; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; margin-bottom: 12px; }
.pill { display: inline-block; font-size: 12.5px; font-weight: 700; padding: 5px 11px; border-radius: 999px; background: var(--c2); color: var(--ce); margin-right: 6px; }
.callout { background: var(--c2); border-left: 5px solid var(--c); border-radius: 10px; padding: 20px 24px; font-size: 17px; line-height: 1.45; color: var(--ce); }
.callout b { color: var(--ce); }
ul.chk { list-style: none; font-size: 16.5px; }
ul.chk li { position: relative; padding-left: 28px; font-size: inherit; line-height: 1.45; margin-bottom: 12px; color: #2D3549; }
ul.chk li:before { content: ''; position: absolute; left: 0; top: 4px; width: 15px; height: 15px; border-radius: 50%%; background: var(--c); }
ul.chk li:after { content: ''; position: absolute; left: 5px; top: 7px; width: 4px; height: 7px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
ul.x li:before { background: #D64545; }
ul.x li:after { border: none; content: '×'; color: #fff; font-weight: 800; font-size: 13px; left: 4px; top: 2px; transform: none; }

/* capa */
.capa { background: %(NAVY)s; color: #fff; padding: 0; }
.capa .esq { position: absolute; left: 70px; top: 70px; width: 560px; }
.capa .logo { width: 210px; display: block; margin-bottom: 64px; }
.capa .tag { display: inline-block; background: var(--c); color: #fff; font-weight: 800; font-size: 13px; letter-spacing: .16em; padding: 8px 14px; border-radius: 6px; margin-bottom: 22px; }
.capa .prog { font-size: 22px; font-weight: 600; color: #AEB8CF; margin-bottom: 4px; }
.capa h1 { font-size: 96px; font-weight: 900; line-height: .95; letter-spacing: -0.04em; margin-bottom: 22px; }
.capa h1 span { color: var(--c); }
.capa .sub { font-size: 20px; line-height: 1.4; color: #D5DBE8; max-width: 520px; }
.capa .metodo { position: absolute; left: 70px; bottom: 54px; font-size: 13px; letter-spacing: .14em; color: #8C97B1; text-transform: uppercase; }
.capa .dir { position: absolute; right: 0; top: 0; bottom: 0; width: 560px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; gap: 8px; padding: 8px; }
.capa .dir div { background-size: cover; background-position: center; border-radius: 10px; }
.capa .dir .big { grid-column: 1 / 3; }
.capa .fade { position: absolute; right: 552px; top: 0; bottom: 0; width: 90px; background: linear-gradient(90deg, %(NAVY)s, rgba(11,22,48,0)); }

/* treino */
.trow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.ex { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(20,33,61,.06), 0 6px 20px rgba(20,33,61,.07); display: flex; flex-direction: column; height: 520px; }
.ex .imgs { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; background: #eee; height: 250px; position: relative; }
.ex .imgs div { background-size: cover; background-position: center; position: relative; }
.ex .imgs span { position: absolute; bottom: 6px; left: 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; background: rgba(11,22,48,.78); color: #fff; padding: 3px 7px; border-radius: 4px; }
.ex .bd { padding: 16px 18px 18px; display: flex; flex-direction: column; flex: 1; }
.ex .n { font-size: 12px; font-weight: 800; color: var(--c); letter-spacing: .1em; margin-bottom: 4px; }
.ex h3 { font-size: 21px; font-weight: 800; color: %(NAVY)s; line-height: 1.15; margin-bottom: 12px; }
.ex .presc { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.ex .presc div { background: var(--c2); border-radius: 10px; padding: 9px 11px; }
.ex .presc small { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .1em; color: var(--ce); opacity: .75; text-transform: uppercase; }
.ex .presc b { font-size: 16px; color: var(--ce); }
.ex .dica { font-size: 15px; line-height: 1.45; color: #3A4358; border-top: 1px dashed #E1E4EA; padding-top: 12px; }
.ex .dica b { color: var(--c); }

/* semana */
.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
.day { border-radius: 12px; padding: 18px 10px; text-align: center; min-height: 120px; }
.day small { display: block; font-size: 12px; font-weight: 800; letter-spacing: .12em; margin-bottom: 8px; opacity: .8; }
.day b { font-size: 16px; line-height: 1.25; display: block; }
.forca { background: var(--c); color: #fff; }
.aero { background: var(--c2); color: var(--ce); }
.lazer { background: #FFF6D9; color: #7A5A00; }
.off { background: #EEF0F4; color: #6B7388; }
.ptile { background: #fff; border-radius: 12px; padding: 20px 18px; box-shadow: 0 1px 2px rgba(20,33,61,.06), 0 4px 14px rgba(20,33,61,.05); }
.ptile small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .12em; color: var(--c); text-transform: uppercase; margin-bottom: 5px; }
.ptile b { font-size: 18px; color: %(NAVY)s; line-height: 1.25; }

/* comida */
.food { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 2px rgba(20,33,61,.06), 0 6px 18px rgba(20,33,61,.07); }
.food .ph { height: 230px; background-size: cover; background-position: center; position: relative; }
.food .ph span { position: absolute; top: 10px; left: 10px; background: var(--c); color: #fff; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; padding: 5px 9px; border-radius: 5px; }
.food .bd { padding: 11px 14px 13px; }
.food h4 { font-size: 16px; font-weight: 750; color: %(NAVY)s; line-height: 1.25; margin-bottom: 6px; min-height: 38px; }
.food .m { font-size: 12.5px; color: %(MUTED)s; }
.food .m b { color: var(--ce); }
.rec { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.rec .food .ph { height: 230px; }
.rec .food h4 { font-size: 17px; min-height: 0; margin-bottom: 8px; }
.rec ul { list-style: none; margin: 6px 0 10px; }
.rec li { font-size: 14px; line-height: 1.4; padding-left: 14px; position: relative; color: #2D3549; margin-bottom: 2px; }
.rec li:before { content: ''; position: absolute; left: 0; top: 7px; width: 6px; height: 6px; border-radius: 50%%; background: var(--c); }
.rec .modo { font-size: 13.5px; line-height: 1.45; color: %(MUTED)s; font-style: italic; }
.macros { display: flex; gap: 6px; margin-top: 2px; }
.macros div { flex: 1; text-align: center; background: var(--c2); border-radius: 8px; padding: 6px 2px; }
.macros small { display: block; font-size: 9.5px; font-weight: 800; letter-spacing: .08em; color: var(--ce); opacity: .7; }
.macros b { font-size: 14px; color: var(--ce); }

table.mon { width: 100%%; border-collapse: separate; border-spacing: 0 8px; }
table.mon th { text-align: left; font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; color: %(MUTED)s; padding: 0 16px; }
table.mon td { background: #fff; padding: 32px 20px; font-size: 17px; color: #2D3549; }
table.mon td:first-child { border-radius: 10px 0 0 10px; font-weight: 800; color: %(NAVY)s; border-left: 5px solid var(--c); }
table.mon td:last-child { border-radius: 0 10px 10px 0; color: #B03A3A; font-weight: 600; }
.tl { display: grid; gap: 14px; }
.tl .st { display: grid; grid-template-columns: 150px 240px 1fr; align-items: center; background: #fff; border-radius: 12px; padding: 26px 24px; box-shadow: 0 1px 2px rgba(20,33,61,.06), 0 4px 14px rgba(20,33,61,.05); }
.tl .st .w { font-size: 17px; font-weight: 800; color: var(--c); }
.tl .st .f { font-size: 21px; font-weight: 800; color: %(NAVY)s; }
.tl .st .d { font-size: 17px; color: #3A4358; }
.end { background: %(NAVY)s; color: #fff; }
""" % dict(TXT=TXT, NAVY=NAVY, MUTED=MUTED)


def foot(f, n):
    return (f'<div class="foot"><span><b>Método Antirreganho</b> · Programa {f["num"]} · {e(f["titulo"])}</span>'
            f'<span>Instituto Gallo Personal · {n}</span></div>')


def slide(f, n, body, cls="", bar=True):
    return f'<section class="slide {cls}">' + ('<div class="bar"></div>' if bar else '') + body + foot(f, n) + '</section>'


def capa(f):
    c = f["cardapio"]
    t = f["treinos"][0][2]
    imgs = [prato_img(c[2][1]), ex_img(t[0]["foto"], 1), prato_img(c[0][1]), ex_img(f["treinos"][1][2][0]["foto"], 0), prato_img(c[4][1])]
    cells = (f'<div class="big" style="background-image:url({imgs[0]})"></div>'
             + "".join(f'<div style="background-image:url({u})"></div>' for u in imgs[1:]))
    return (f'<section class="slide capa"><div class="dir">{cells}</div><div class="fade"></div>'
            f'<div class="esq"><img class="logo" src="{uri(LOGO)}">'
            f'<div class="tag">{e(f["tag"])}</div><div class="prog">Programa {f["num"]} de 3</div>'
            f'<h1>{e(f["titulo"])}<span>.</span></h1><p class="sub">{e(f["subtitulo"])}</p></div>'
            f'<div class="metodo">Método Antirreganho · Treino + Alimentação</div></section>')


def s_missao(f, n):
    cards = "".join(f'<div class="card" style="min-height:290px"><div class="num">{i}</div><h3>{e(a)}</h3><p>{e(b)}</p></div>'
                    for i, (a, b) in enumerate(f["corpo"], 1))
    return slide(f, n, f'''<div class="kicker">A missão desta fase · {e(f["duracao"])}</div>
    <h2 class="t" style="font-size:34px;max-width:1080px">{e(f["missao"])}</h2>
    <div class="kicker" style="color:{MUTED};margin-top:6px">O que acontece no seu corpo</div>
    <div class="grid" style="grid-template-columns:repeat(3,1fr)">{cards}</div>''')


def s_regras(f, n):
    cards = "".join(f'<div class="card" style="border-top:5px solid var(--c);min-height:205px"><div class="num">{i}</div><h3>{e(a)}</h3><p>{e(b)}</p></div>'
                    for i, (a, b) in enumerate(f["regras"], 1))
    return slide(f, n, f'''<div class="kicker">Princípios inegociáveis</div>
    <h2 class="t">As 4 regras do programa {e(f["titulo"].capitalize())}<small>Releia esta página sempre que a motivação oscilar.</small></h2>
    <div class="grid" style="grid-template-columns:repeat(2,1fr)">{cards}</div>''')


def s_estrutura(f, n):
    tiles = "".join(f'<div class="ptile"><small>{e(a)}</small><b>{e(b)}</b></div>' for a, b in f["params"])
    days = "".join(f'<div class="day {k}"><small>{d}</small><b>{e(t)}</b></div>' for d, t, k in f["semana"])
    return slide(f, n, f'''<div class="kicker">Estrutura do treino</div>
    <h2 class="t">Parâmetros e semana-modelo</h2>
    <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:26px">{tiles}</div>
    <div class="week" style="margin-top:10px">{days}</div>
    <p style="margin-top:14px;font-size:14px;color:{MUTED}">{e(f["semana_nota"])}</p>''')


def ex_card(i, x):
    return f'''<div class="ex"><div class="imgs">
      <div style="background-image:url({ex_img(x["foto"],0)})"><span>INÍCIO</span></div>
      <div style="background-image:url({ex_img(x["foto"],1)})"><span>FINAL</span></div></div>
      <div class="bd"><div class="n">EXERCÍCIO {i:02d}</div><h3>{e(x["nome"])}</h3>
      <div class="presc"><div><small>Séries × reps</small><b>{e(x["prescr"])}</b></div><div><small>Descanso</small><b>{e(x["desc"])}</b></div></div>
      <p class="dica"><b>Execução:</b> {e(x["dica"])}</p></div></div>'''


def s_treinos(f, n0):
    out = []
    n = n0
    for nome, sub, exs in f["treinos"]:
        for parte in (0, 1):
            bloco = exs[parte * 3:(parte + 1) * 3]
            cards = "".join(ex_card(parte * 3 + j + 1, x) for j, x in enumerate(bloco))
            out.append(slide(f, n, f'''<div class="kicker">{e(nome)} · parte {parte+1} de 2</div>
            <h2 class="t" style="margin-bottom:20px">{e(nome)} <span style="color:var(--c)">·</span> <span style="font-weight:600;color:{MUTED}">{e(sub)}</span></h2>
            <div class="trow">{cards}</div>'''))
            n += 1
    return out, n


def s_aerobico(f, n):
    a = f["aerobico"]
    cards = "".join(f'''<div class="ex" style="height:auto"><div class="imgs" style="height:300px">
        <div style="background-image:url({ex_img(foto,0)})"></div><div style="background-image:url({ex_img(foto,1)})"></div></div>
        <div class="bd"><h3 style="margin-bottom:6px">{e(nome)}</h3><p class="dica" style="border:0;padding:0">{e(d)}</p></div></div>'''
                    for nome, foto, d in a["itens"])
    metas = "".join(f"<li>{e(m)}</li>" for m in a["metas"])
    return slide(f, n, f'''<div class="kicker">Aeróbico e movimento diário</div>
    <h2 class="t">O aeróbico apoia, a musculação sustenta<small>{e(a["texto"])}</small></h2>
    <div class="grid" style="grid-template-columns:1fr 1fr 0.9fr;align-items:start">{cards}
    <div class="card"><h3>Metas da fase</h3><ul class="chk" style="margin-top:12px">{metas}</ul></div></div>''')


def s_progressao(f, n):
    st = "".join(f'<div class="st"><div class="w">{e(a)}</div><div class="f">{e(b)}</div><div class="d">{e(c)}</div></div>'
                 for a, b, c in f["progressao"])
    return slide(f, n, f'''<div class="kicker">Progressão</div>
    <h2 class="t">Como evoluir semana a semana</h2>
    <div class="tl">{st}</div>
    <div class="callout" style="margin-top:22px"><b>Atenção:</b> {e(f["plano_b"])}</div>''')


PRATO_SVG = """<svg viewBox="0 0 220 220" width="230" height="230">
<circle cx="110" cy="110" r="106" fill="#fff" stroke="#E3E5EA" stroke-width="4"/>
<path d="M110 110 L110 14 A96 96 0 0 1 110 206 Z" fill="#5FAE4E"/>
<path d="M110 110 L110 206 A96 96 0 0 1 14 110 Z" fill="%s"/>
<path d="M110 110 L14 110 A96 96 0 0 1 110 14 Z" fill="#E8B04A"/>
<text x="160" y="108" font-size="15" font-weight="800" fill="#fff" text-anchor="middle" font-family="Inter">½</text>
<text x="160" y="126" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter">VEGETAIS</text>
<text x="66" y="160" font-size="14" font-weight="800" fill="#fff" text-anchor="middle" font-family="Inter">¼</text>
<text x="66" y="176" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter">PROTEÍNA</text>
<text x="66" y="66" font-size="14" font-weight="800" fill="#fff" text-anchor="middle" font-family="Inter">¼</text>
<text x="66" y="82" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle" font-family="Inter">CARBO</text>
</svg>"""


def s_nutri(f, n):
    tiles = "".join(f'<div class="card" style="padding:18px 20px"><small style="font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--c);text-transform:uppercase">{e(a)}</small>'
                    f'<div style="font-size:27px;font-weight:850;color:{NAVY};margin:6px 0 8px">{e(b)}</div><p style="font-size:15px">{e(c)}</p></div>'
                    for a, b, c in f["nutri_metas"])
    dicas = "".join(f"<li>{e(d)}</li>" for d in f["nutri_dicas"])
    return slide(f, n, f'''<div class="kicker">Alimentação</div>
    <h2 class="t">Metas nutricionais da fase</h2>
    <div class="grid" style="grid-template-columns:1.25fr 1fr;align-items:start;gap:24px">
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px">{tiles}</div>
      <div class="card" style="display:flex;gap:16px;align-items:center;padding:20px">
        <div style="flex-shrink:0">{PRATO_SVG % f["cor"]}<div style="text-align:center;font-size:12px;font-weight:800;color:{MUTED};letter-spacing:.1em;margin-top:4px">O PRATO-MODELO</div></div>
        <ul class="chk" style="font-size:15px">{dicas}</ul></div>
    </div>''')


def s_cardapio(f, n):
    cards = "".join(f'''<div class="food"><div class="ph" style="background-image:url({prato_img(k)})"><span>{e(ref)}</span></div>
      <div class="bd"><h4>{e(PRATOS[k]["nome"])}</h4><div class="m"><b>{PRATOS[k]["kcal"]} kcal</b> · {PRATOS[k]["p"]} g proteína</div></div></div>'''
                    for ref, k in f["cardapio"])
    return slide(f, n, f'''<div class="kicker">Cardápio-modelo</div>
    <h2 class="t" style="margin-bottom:18px">Um dia de alimentação na prática<small>{e(f["cardapio_nota"])}</small></h2>
    <div class="grid" style="grid-template-columns:repeat(6,1fr);gap:14px">{cards}</div>
    <p style="margin-top:14px;font-size:12px;color:#8A92A6">Valores aproximados por porção. O nutricionista ajusta as quantidades ao seu peso, objetivo e exames.</p>''')


def s_receitas(f, n0):
    out = []
    ks = [k for _, k in f["cardapio"]]
    for parte in (0, 1):
        cards = ""
        for k in ks[parte * 3:(parte + 1) * 3]:
            p = PRATOS[k]
            ing = "".join(f"<li>{e(i)}</li>" for i in p["ing"])
            cards += f'''<div class="food"><div class="ph" style="background-image:url({prato_img(k)})"></div><div class="bd" style="padding:14px 16px">
              <h4>{e(p["nome"])}</h4>
              <div class="macros"><div><small>KCAL</small><b>{p["kcal"]}</b></div><div><small>PROT.</small><b>{p["p"]}g</b></div><div><small>CARB.</small><b>{p["c"]}g</b></div><div><small>GORD.</small><b>{p["g"]}g</b></div></div>
              <ul>{ing}</ul><p class="modo">{e(p["modo"])}</p></div></div>'''
        out.append(slide(f, n0 + parte, f'''<div class="kicker">Receitas · {parte+1} de 2</div>
        <h2 class="t" style="font-size:30px;margin-bottom:16px">Como montar cada prato</h2><div class="rec">{cards}</div>'''))
    return out


def s_monitor(f, n):
    rows = "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td><td>{e(c)}</td></tr>" for a, b, c in f["monitor"])
    extra = ""
    if f.get("retorno"):
        li = "".join(f"<li>{e(x)}</li>" for x in f["retorno"])
        extra = f'''<div class="card" style="border-top:5px solid #D64545"><h3>Protocolo de Retorno · 14 dias</h3>
        <p style="margin-bottom:10px">Ative ao primeiro sinal vermelho. Agir cedo resolve com pouco.</p><ul class="chk">{li}</ul></div>'''
        layout = "grid-template-columns:1.5fr 1fr"
    else:
        layout = "grid-template-columns:1fr"
    return slide(f, n, f'''<div class="kicker">Monitoramento</div>
    <h2 class="t" style="margin-bottom:14px">O que medir e quando acender o alerta</h2>
    <div class="grid" style="{layout};align-items:start">
    <table class="mon"><tr><th>Indicador</th><th>Como acompanhar</th><th>Sinal de alerta</th></tr>{rows}</table>{extra}</div>''')


def s_erros(f, n):
    li = "".join(f"<li>{e(x)}</li>" for x in f["erros"])
    return slide(f, n, f'''<div class="kicker">Evite</div>
    <h2 class="t">Os erros que mais causam perda muscular e reganho</h2>
    <div class="grid" style="grid-template-columns:1.1fr 1fr;gap:28px;align-items:center">
      <div class="card" style="padding:40px 36px"><ul class="chk x" style="font-size:21px">{li}</ul></div>
      <div><div style="font-size:36px;font-weight:850;line-height:1.2;color:{NAVY};letter-spacing:-.02em">"Mais não é melhor quando o corpo está em adaptação metabólica."</div>
      <p style="margin-top:14px;color:{MUTED};font-size:15px">Princípio do mínimo eficaz: volume moderado, intensidade controlada e frequência sustentável.</p></div>
    </div>''')


def s_fim(f, n):
    return (f'''<section class="slide end"><div class="bar"></div>
      <div style="position:absolute;left:80px;top:90px;right:80px">
      <img src="{uri(LOGO)}" style="width:180px;margin-bottom:56px">
      <div class="kicker" style="color:var(--c)">Encerramento · Programa {f["num"]}</div>
      <div style="font-size:48px;font-weight:850;line-height:1.1;letter-spacing:-.03em;max-width:1000px;margin-bottom:28px">
      Um corpo que se movimenta com força aprende que o novo peso é <span style="color:var(--c)">funcional</span>.</div>
      <div style="display:inline-block;background:var(--c);color:#fff;font-weight:700;font-size:18px;padding:14px 20px;border-radius:10px">{e(f["proxima"])}</div>
      <p style="margin-top:46px;font-size:13px;color:#8C97B1;max-width:900px;line-height:1.5">Programa aplicado com acompanhamento do médico prescritor, do nutricionista e do personal trainer. A dose, o desmame e os ajustes individuais são definidos pela equipe.</p>
      </div><div class="foot" style="border-color:#24304F"><span><b>Método Antirreganho</b> · Programa {f["num"]} · {e(f["titulo"])}</span><span>Instituto Gallo Personal · {n}</span></div></section>''')


def montar(f):
    s = [capa(f)]
    n = 2
    s.append(s_missao(f, n)); n += 1
    s.append(s_regras(f, n)); n += 1
    s.append(s_estrutura(f, n)); n += 1
    tr, n = s_treinos(f, n); s += tr
    s.append(s_aerobico(f, n)); n += 1
    s.append(s_progressao(f, n)); n += 1
    s.append(s_nutri(f, n)); n += 1
    s.append(s_cardapio(f, n)); n += 1
    s += s_receitas(f, n); n += 2
    s.append(s_monitor(f, n)); n += 1
    s.append(s_erros(f, n)); n += 1
    s.append(s_fim(f, n))
    vars_ = f':root{{--c:{f["cor"]};--c2:{f["cor2"]};--ce:{f["cor_esc"]};}}'
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{e(f["titulo"])}</title>'
            f'<style>{vars_}{CSS}</style></head><body>{"".join(s)}</body></html>')


RENDER_JS = r"""
const { chromium } = require('playwright');
(async () => {
  const [,, ...pairs] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage();
  for (let i = 0; i < pairs.length; i += 2) {
    await p.goto('file://' + pairs[i], { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: pairs[i + 1], width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true });
    console.log('PDF:', pairs[i + 1]);
  }
  await b.close();
})();
"""


def main():
    OUT.mkdir(exist_ok=True)
    HTML_DIR.mkdir(exist_ok=True)
    args = []
    for f in FASES:
        h = HTML_DIR / (f["arquivo"] + ".html")
        h.write_text(montar(f), encoding="utf-8")
        args += [str(h), str(OUT / (f["arquivo"] + ".pdf"))]
    js = HTML_DIR / "_render.js"
    js.write_text(RENDER_JS)
    subprocess.run(["node", str(js), *args], check=True)
    js.unlink()


if __name__ == "__main__":
    main()
