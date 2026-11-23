/* Trainer Pro Studio — Instituto Gallo Personal
 * App 100% no navegador: os dados ficam no IndexedDB do aparelho.
 * Bibliotecas locais em vendor/: pdf.js (ler PDFs), html2canvas + jsPDF (gerar PDFs).
 */
'use strict';
(() => {

/* =========================================================
 * Utilidades
 * ======================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (n) => (n || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const slug = (s) => (s || 'programa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'programa';
const fmtDate = (ts) => new Date(ts).toLocaleDateString('pt-BR');
const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const pad2 = (n) => String(n).padStart(2, '0');
const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
const clone = (o) => JSON.parse(JSON.stringify(o));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function readFile(file, as = 'dataURL') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    if (as === 'buffer') r.readAsArrayBuffer(file); else r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    if (/^https?:/.test(src)) i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
/** Reduz e comprime uma imagem (dataURL ou File) para JPEG. */
async function compressImage(src, max = 1400, q = 0.85, crop = null) {
  if (src instanceof Blob) src = await readFile(src);
  const img = await loadImage(src);
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const sx = c.x * img.naturalWidth, sy = c.y * img.naturalHeight;
  const sw = c.w * img.naturalWidth, sh = c.h * img.naturalHeight;
  const k = Math.min(1, max / Math.max(sw, sh));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(sw * k));
  cv.height = Math.max(1, Math.round(sh * k));
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', q);
}
function pickFile(accept, multiple = false) {
  return new Promise((res) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.multiple = multiple;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); });
    inp.click();
  });
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}

/* =========================================================
 * Banco local (IndexedDB, com fallback em memória)
 * ======================================================= */
const STORES = ['programs', 'students', 'trainers', 'pdfs', 'pdfblobs', 'settings'];
const DB = {
  db: null,
  mem: null,
  async open() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open('gallo-programas', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          STORES.forEach((s) => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      console.warn('IndexedDB indisponível, usando memória', e);
      this.mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));
      setTimeout(() => toast('Atenção: este navegador não permite salvar. Os dados somem ao fechar.'), 800);
    }
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction(store, mode);
      const r = fn(tx.objectStore(store));
      tx.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  },
  async all(store) {
    if (this.mem) return [...this.mem[store].values()].map((x) => structuredClone(x));
    return this.req(store, 'readonly', (s) => s.getAll());
  },
  async get(store, id) {
    if (this.mem) return this.mem[store].get(id);
    return this.req(store, 'readonly', (s) => s.get(id));
  },
  async put(store, obj) {
    if (this.mem) { this.mem[store].set(obj.id, obj); return; }
    return this.req(store, 'readwrite', (s) => s.put(obj));
  },
  async del(store, id) {
    if (this.mem) { this.mem[store].delete(id); return; }
    return this.req(store, 'readwrite', (s) => s.delete(id));
  },
};

/* =========================================================
 * Estado
 * ======================================================= */
const S = {
  programs: [],
  students: [],
  trainers: [],
  pdfs: [],
  settings: { id: 'app', brand: 'Trainer Pro Studio · Instituto Gallo Personal', theme: 'navy', seeded: false },
  ui: { q: '', student: '', pf: {}, pq: '', ptype: '', prf: {} },
};
const byId = (list, id) => list.find((x) => x.id === id);

async function loadAll() {
  const [programs, students, trainers, pdfs, settings] = await Promise.all([
    DB.all('programs'), DB.all('students'), DB.all('trainers'), DB.all('pdfs'), DB.get('settings', 'app'),
  ]);
  Object.assign(S, { programs, students, trainers, pdfs });
  if (settings) S.settings = { ...S.settings, ...settings };
}
function upsert(list, obj) {
  const i = list.findIndex((x) => x.id === obj.id);
  if (i >= 0) list[i] = obj; else list.push(obj);
}
async function saveEntity(store, obj) {
  obj.updatedAt = Date.now();
  if (!obj.createdAt) obj.createdAt = obj.updatedAt;
  await DB.put(store, obj);
  upsert(S[store], obj);
  if (typeof queueSync === 'function') queueSync(store, obj.id);
}
async function removeEntity(store, id) {
  await DB.del(store, id);
  S[store] = S[store].filter((x) => x.id !== id);
  if (typeof queueSync === 'function') queueSync(store, id, true);
}
async function saveSettings() {
  S.settings.updatedAt = Date.now();
  await DB.put('settings', S.settings);
  if (typeof queueSync === 'function') queueSync('settings', 'app');
}

/* =========================================================
 * Modelos
 * ======================================================= */
const THEMES = { navy: 'Azul-marinho e dourado', black: 'Preto e dourado', light: 'Claro (impressão)' };
/* Etiquetas da Biblioteca de Treinos (código OBJ-SEXO-IDADE-IDADE-NÍVEL-AMBIENTE) */
const TAGS = {
  obj: { label: 'Objetivo', opts: { EMA: 'Emagrecimento', DEF: 'Definição muscular', HIP: 'Hipertrofia', PER: 'Performance', SAU: 'Saúde' } },
  sex: { label: 'Público', opts: { F: 'Feminino', M: 'Masculino' } },
  age: { label: 'Faixa etária', opts: { '20-29': '20–29 anos', '30-39': '30–39 anos', '40-49': '40–49 anos', '50-60': '50–60 anos', '20-39': '20–39 anos', '30-49': '30–49 anos', '20-49': '20–49 anos', '40-60': '40–60 anos', '20-60': '20–60 anos' } },
  level: { label: 'Nível', opts: { INI: 'Iniciante', INT: 'Intermediário', AVA: 'Avançado', HIT: 'HIIT' } },
  env: { label: 'Ambiente', opts: { ACA: 'Academia', CAS: 'Casa', ELA: 'Elásticos' } },
};
const TAG_KEYS = Object.keys(TAGS);
const tagLabel = (k, v) => (TAGS[k].opts[v] || v || '');
const CATALOG = {
  'EMA-F-20-29-INI-ACA': ["Projeto Primeira Versão", '3x'],
  'EMA-F-20-29-INT-ACA': ["Modo Turbina", '4x'],
  'EMA-F-30-39-INI-CAS': ["Queima em Casa — Sem Desculpas", '3x'],
  'EMA-F-30-39-INT-ACA': ["Década de Ouro", '4x'],
  'EMA-F-40-49-INI-ACA': ["Recomeço Poderoso", '3x'],
  'EMA-F-40-49-INT-ACA': ["Força Madura", '4x'],
  'EMA-F-50-60-INI-ELA': ["Elástica & Forte", '3x'],
  'EMA-F-50-60-INT-ACA': ["Madura & Imparável", '4x'],
  'EMA-M-20-29-INI-ACA': ["Projeto Primeira Marra", '3x'],
  'EMA-M-20-29-AVA-ACA': ["Modo Fera", '5x'],
  'EMA-M-30-39-INI-ACA': ["Projeto Virada de Jogo", '3x'],
  'EMA-M-30-39-INT-ACA': ["Projeto Máquina 30+", '4x'],
  'EMA-M-40-49-INI-ACA': ["Projeto Recomeço de Ferro", '3x'],
  'EMA-M-40-49-INT-ACA': ["Máquina 40+", '4x'],
  'EMA-M-50-60-INI-ELA': ["Forte em Casa 50+", '3x'],
  'EMA-M-50-60-INT-ACA': ["Veterano de Elite", '4x'],
  'HIP-F-20-29-INI-ACA': ["Projeto Construção de Curvas", '3x'],
  'HIP-F-20-29-AVA-ACA': ["Projeto Escultura", '5x'],
  'HIP-F-30-39-INT-ACA': ["Projeto Glúteo Blindado", '4x'],
  'HIP-F-30-39-AVA-ACA': ["Projeto Corpo Total 30+", '5x'],
  'HIP-F-40-49-INI-ACA': ["Projeto Músculo é Juventude", '3x'],
  'HIP-F-40-49-INT-ACA': ["Projeto Força Madura", '4x'],
  'HIP-F-50-60-INI-ACA': ["Projeto Musculatura da Longevidade", '3x'],
  'HIP-F-50-60-INT-ACA': ["Força de Rainha", '4x'],
  'HIP-M-20-29-INI-ACA': ["Projeto Fundação Muscular", '3x'],
  'HIP-M-20-29-AVA-ACA': ["Projeto Dominância", '5x'],
  'HIP-M-30-39-INT-ACA': ["Projeto Monstro Clássico", '4x'],
  'HIP-M-30-39-AVA-ACA': ["Projeto Apex 30+", '5x'],
  'HIP-M-40-49-INT-ACA': ["Projeto Titã 40+", '4x'],
  'HIP-M-40-49-AVA-ACA': ["Projeto Força de Aço 40+", '5x'],
  'HIP-M-50-60-INI-ACA': ["Projeto Construção Blindada", '3x'],
  'HIP-M-50-60-INT-ACA': ["Projeto Patrimônio Muscular", '4x'],
  'DEF-F-20-39-INI-ACA': ["Projeto Primeiro Contorno", '3x'],
  'DEF-F-20-39-INT-ACA': ["Projeto Corpo em Alta Definição", '4x'],
  'DEF-F-20-39-AVA-ACA': ["Projeto Lapidação Total", '5x'],
  'DEF-F-40-60-INI-ACA': ["Projeto Renovação 40+", '3x'],
  'DEF-F-40-60-INT-ACA': ["Projeto Shape Atemporal", '4x'],
  'DEF-F-40-60-INT-ELA': ["Projeto Definição Sem Fronteiras", '4x'],
  'DEF-M-20-39-INI-ACA': ["Projeto Primeiro Trinco", '3x'],
  'DEF-M-20-39-INT-ACA': ["Projeto Shape Trincado", '4x'],
  'DEF-M-20-39-AVA-ACA': ["Protocolo Lâmina", '5x'],
  'DEF-M-40-60-INI-ACA': ["Projeto Versão Definida 40+", '3x'],
  'DEF-M-40-60-INT-ACA': ["Projeto Tanquinho 40+", '4x'],
  'DEF-M-40-60-INT-CAS': ["Projeto Definição Sem Academia", '4x'],
  'SAU-F-20-39-INI-ACA': ["Projeto Energia em Dia", '3x'],
  'SAU-F-40-49-INI-ACA': ["Projeto Equilíbrio 40+", '3x'],
  'SAU-F-50-60-INI-ACA': ["Projeto Viver Bem 50+", '3x'],
  'SAU-F-20-60-INT-ACA': ["Projeto Corpo Livre", '4x'],
  'SAU-M-20-39-INI-ACA': ["Projeto De Volta ao Jogo", '3x'],
  'SAU-M-40-49-INI-ACA': ["Projeto Motor Novo 40+", '3x'],
  'SAU-M-50-60-INI-ACA': ["Projeto Saúde Blindada 50+", '3x'],
  'SAU-M-20-60-INT-ACA': ["Projeto Corpo Funcional", '4x'],
  'PER-F-20-39-INI-ACA': ["Projeto Atleta Interior", '3x'],
  'PER-F-20-39-INT-ACA': ["Projeto Evolução Atlética", '4x'],
  'PER-F-20-39-AVA-ACA': ["Protocolo Potência Máxima", '5x'],
  'PER-F-20-39-HIT-ACA': ["Turbo HIIT — Fôlego de Atleta", '4x'],
  'PER-M-20-39-INI-ACA': ["Projeto Modo Atleta", '3x'],
  'PER-M-20-39-INT-ACA': ["Projeto Máquina de Rendimento", '4x'],
  'PER-M-20-39-AVA-ACA': ["Protocolo Limite Zero", '5x'],
  'PER-M-30-39-AVA-ACA': ["Projeto Força Explosiva 30+", '5x'],
  'EMA-M-50-60-INI-ACA': ["Projeto Motor Ativo 50+", '3x'],
  'EMA-M-40-49-INT-ACA-2': ["Projeto Queima Inteligente 40+", '4x'],
  'EMA-F-50-60-INI-CAS': ["Leve & Forte em Casa 50+", '3x'],
  'HIP-M-50-60-INI-ACA-2': ["Projeto Músculo Sem Idade", '3x'],
  'HIP-F-30-49-INT-ACA': ["O Despertar da Força Feminina", '5x'],
  'HIP-F-50-60-INI-CAS': ["Músculo em Casa 50+", '3x'],
  'SAU-M-30-39-INT-CAS': ["Projeto Base Sólida 30+", '4x'],
  'SAU-F-20-49-INI-CAS': ["Mulher Rejuvenescida — 21 Dias", '6x'],
  'HIP-F-20-49-INT-ACA': ["O Despertar da Sua Força", '4x'],
};
function parseCode(str) {
  const m = String(str || '').toUpperCase().match(/(EMA|DEF|HIP|PER|SAU)[-_ ]+([FM])[-_ ]+(\d{2})[-_ ]+(\d{2})[-_ ]+(INI|INT|AVA|HIT)[-_ ]+(ACA|CAS|ELA)(?:[-_ ]+(\d)(?!\d))?/);
  if (!m) return null;
  const base = `${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}-${m[6]}`;
  const variant = m[7] && (window.LIBRARY_DATA || {})[`${base}-${m[7]}`] ? `-${m[7]}` : '';
  return { code: base + variant, obj: m[1], sex: m[2], age: `${m[3]}-${m[4]}`, level: m[5], env: m[6] };
}
const hasTags = (t) => !!t && TAG_KEYS.some((k) => t[k]);
function tagChips(t) {
  if (!hasTags(t)) return '';
  return TAG_KEYS.filter((k) => t[k]).map((k) => `<span class="chip ${k === 'obj' ? 'gold' : ''}">${esc(tagLabel(k, t[k]))}</span>`).join('');
}
/* Faixa etária no filtro = idade do aluno. Um programa 20–39 aparece para quem filtra 20–29 ou 30–39. */
const AGE_FILTER = { '20-29': '20–29 anos', '30-39': '30–39 anos', '40-49': '40–49 anos', '50-60': '50–60 anos' };
function agesOverlap(a, b) {
  const [a1, a2] = String(a).split('-').map(Number);
  const [b1, b2] = String(b).split('-').map(Number);
  if ([a1, a2, b1, b2].some(isNaN)) return a === b;
  return a1 <= b2 && b1 <= a2;
}
function tagMatchKey(t, k, v) {
  if (!v) return true;
  if (!t || !t[k]) return false;
  return k === 'age' ? agesOverlap(t[k], v) : t[k] === v;
}
function tagMatch(t, f, except) { return TAG_KEYS.every((k) => k === except || tagMatchKey(t, k, f[k])); }
/** Filtros com contagem: cada opção mostra quantos itens existem com os demais filtros aplicados. */
function tagSelects(f, idp, items) {
  return TAG_KEYS.map((k) => {
    const base = items.filter((t) => tagMatch(t, f, k));
    const opts = k === 'age' ? AGE_FILTER : TAGS[k].opts;
    return `<select id="${idp}${k}" data-tagfilter="${k}" style="max-width:200px"><option value="">${TAGS[k].label}: todos</option>${Object.entries(opts).map(([v, l]) => {
      const n = base.filter((t) => tagMatchKey(t, k, v)).length;
      return `<option value="${v}" ${f[k] === v ? 'selected' : ''} ${n || f[k] === v ? '' : 'disabled'}>${esc(l)} (${n})</option>`;
    }).join('')}</select>`;
  }).join('');
}
const libraryPdfs = () => S.pdfs.filter((x) => !x.generated);

const DEFAULT_PSE_NOTE = 'Neste programa:\ntrabalhe a maioria das séries entre PSE 7–8.\n\nReserve PSE 9–10 apenas para a última série da semana 4.';

function newExercise(over = {}) {
  return {
    id: uid(), name: '', muscles: '', image: '', sets: '3', reps: '8-12', repsLabel: 'Reps',
    pse: '', rest: '60s', cadence: '', load: '', execution: '', cautions: '', notes: '', ...over,
  };
}
function newWorkout(name = 'Treino A', over = {}) {
  return { id: uid(), name, focus: '', coverImage: '', exercises: [], ...over };
}
function newProgram(over = {}) {
  return {
    id: uid(),
    title: 'Novo programa',
    subtitle: '',
    studentId: '',
    trainerId: S.settings.defaultTrainerId || (S.trainers[0] && S.trainers[0].id) || '',
    theme: S.settings.theme || 'navy',
    level: 'Iniciante',
    weeks: '4',
    frequency: '3x/semana',
    structure: 'Full body A/B/C',
    overview: '',
    objectives: '',
    recommendations: '',
    warmup: '',
    pseNote: DEFAULT_PSE_NOTE,
    closingMessage: 'Consistência vence intensidade. Registre suas cargas e conte comigo em cada etapa.',
    include: { trainer: true, overview: true, guidelines: true, warmup: true, pse: true, closing: true },
    sourcePdfId: '',
    workouts: [newWorkout('Treino A')],
    ...over,
  };
}
/* Conteúdo completo dos 60 programas da Biblioteca (library-data.js) */
const libraryEntry = (code) => (window.LIBRARY_DATA || {})[code];
/* Fotos dos exercícios: na pasta fotos/ ao lado do app ou, na versão de arquivo único, no Supabase */
const PHOTO_BASE = window.PHOTO_BASE || '';
const photo = (src) => (PHOTO_BASE && typeof src === 'string' && src.startsWith('fotos/') ? PHOTO_BASE + src.slice(6) : src);
function programCode(p) {
  const src = p.sourcePdfId && byId(S.pdfs, p.sourcePdfId);
  if (src && src.code) return src.code;
  if (p.libraryCode) return p.libraryCode;
  const t = p.tags || {};
  return TAG_KEYS.every((k) => t[k]) ? `${t.obj}-${t.sex}-${t.age}-${t.level}-${t.env}` : '';
}
function fillFromLibrary(p, code) {
  const d = libraryEntry(code);
  if (!d) return false;
  p.title = d.title;
  p.overview = d.overview;
  p.warmup = d.warmup.join('\n');
  p.objectives = d.weeks.join('\n');
  p.recommendations = d.load.join('\n');
  if (d.duration) p.weeks = String(d.duration);
  p.workouts = d.workouts.map((w) => newWorkout(w.name, {
    focus: w.focus,
    exercises: w.exercises.map((x) => newExercise({ ...x, pse: '', load: '', notes: '' })),
  }));
  p.libraryCode = code;
  const t = parseCode(code);
  if (t && !hasTags(p.tags)) { const { code: _c, ...tags } = t; p.tags = tags; }
  return true;
}
function libBanner(p) {
  const code = programCode(p);
  const d = code && libraryEntry(code);
  if (!d) return '';
  const empty = !totalExercises(p);
  return `<div class="section card row" style="border-color:${empty ? 'var(--gold)' : 'var(--line)'}">
    <div style="flex:1;min-width:220px"><strong>${empty ? 'Conteúdo da Biblioteca disponível' : 'Programa da Biblioteca'}:</strong> ${esc(d.title)} <span class="muted small">(${esc(code)} · ${d.workouts.length} treinos)</span>
      <div class="small muted">${empty ? 'Preencha treinos, exercícios, séries, repetições, descanso, cadência, execução e cuidados com um clique. Depois edite o que quiser.' : 'Use para restaurar o conteúdo original. Substitui treinos e textos atuais.'}</div></div>
    <button class="btn ${empty ? 'primary' : 'sm'}" data-action="fill-library">${empty ? 'Preencher com a Biblioteca' : 'Restaurar da Biblioteca'}</button></div>`;
}
function totalExercises(p) { return p.workouts.reduce((n, w) => n + w.exercises.length, 0); }

/* =========================================================
 * PDF.js — leitura de PDFs
 * ======================================================= */
if (window.pdfjsLib) {
  // Versão de arquivo único: o worker vem embutido no próprio HTML.
  const inlineWorker = document.getElementById('pdf-worker-src');
  pdfjsLib.GlobalWorkerOptions.workerSrc = inlineWorker
    ? URL.createObjectURL(new Blob([inlineWorker.textContent], { type: 'text/javascript' }))
    : 'vendor/pdf.worker.min.js';
}
const docCache = new Map();
const pageCache = new Map();
async function getPdfDoc(pdfId) {
  if (docCache.has(pdfId)) return docCache.get(pdfId);
  const rec = await DB.get('pdfblobs', pdfId);
  if (!rec) throw new Error('PDF não encontrado');
  const buf = await rec.blob.arrayBuffer();
  const p = pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  docCache.set(pdfId, p);
  return p;
}
async function renderPage(pdfId, n, width = 360) {
  const key = `${pdfId}:${n}:${width}`;
  if (pageCache.has(key)) return pageCache.get(key);
  const doc = await getPdfDoc(pdfId);
  const page = await doc.getPage(n);
  const vp1 = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: width / vp1.width });
  const cv = document.createElement('canvas');
  cv.width = Math.round(vp.width);
  cv.height = Math.round(vp.height);
  await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  const url = cv.toDataURL('image/jpeg', width > 600 ? 0.92 : 0.8);
  if (width <= 480) pageCache.set(key, url);
  return url;
}
async function pageText(pdfId, n) {
  const doc = await getPdfDoc(pdfId);
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  let out = '';
  tc.items.forEach((it) => { out += it.str + (it.hasEOL ? '\n' : ' '); });
  return out.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
async function addPdfFile(file) {
  const buf = await readFile(file, 'buffer');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const id = uid();
  const blob = new Blob([buf], { type: 'application/pdf' });
  await DB.put('pdfblobs', { id, blob });
  docCache.set(id, Promise.resolve(doc));
  const thumb = await renderPage(id, 1, 480);
  const meta = { id, name: file.name.replace(/\.pdf(\.pdf)?$/i, ''), size: file.size, pages: doc.numPages, thumb, generated: false };
  await applyDetectedTags(meta);
  await saveEntity('pdfs', meta);
  return meta;
}
/** Procura o código do programa no nome do arquivo e, se não achar, nas primeiras páginas. */
async function detectTags(meta) {
  let t = parseCode(meta.name);
  if (!t) {
    const last = Math.min(meta.pages || 1, 5);
    for (let n = 1; n <= last && !t; n++) {
      try { t = parseCode(await pageText(meta.id, n)); } catch (e) { /* página sem texto */ }
    }
  }
  return t;
}
async function applyDetectedTags(meta) {
  const t = await detectTags(meta);
  if (t) {
    const { code, ...tags } = t;
    meta.code = code;
    meta.tags = tags;
    if (CATALOG[code]) meta.title = CATALOG[code][0];
  }
  meta.tagsChecked = true;
  return !!t;
}
/** Etiqueta em segundo plano os PDFs enviados antes desta versão. */
async function tagPendingPdfs() {
  const pending = S.pdfs.filter((m) => !m.generated && !m.tagsChecked);
  if (!pending.length) return;
  let found = 0;
  for (const m of pending) {
    try { if (await applyDetectedTags(m)) found++; await saveEntity('pdfs', m); } catch (e) { console.warn(e); }
  }
  if (found) toast(`Etiquetas identificadas em ${found} PDF(s)`);
  if (location.hash.startsWith('#/pdfs')) renderPdfList();
}
const pdfTitle = (m) => m.title || m.name;
async function deletePdf(id) {
  await removeEntity('pdfs', id);
  await DB.del('pdfblobs', id);
  docCache.delete(id);
}

/* =========================================================
 * Roteador
 * ======================================================= */
const app = $('#app');
let leaveHook = null;
async function route() {
  if (leaveHook) { await leaveHook(); leaveHook = null; }
  closeModal();
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  const [r, id] = parts;
  const navKey = { programa: 'inicio', novo: 'inicio', biblioteca: 'biblioteca', alunos: 'alunos', personais: 'config', pdfs: 'pdfs', pdf: 'pdfs', config: 'config' }[r] || 'inicio';
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
  window.scrollTo(0, 0);
  if (r !== 'aluno') document.body.classList.remove('student-mode');
  if (r === 'aluno') return viewStudent(id);
  if (!hasAccess()) return viewGate();
  document.body.classList.remove('gated');
  if (!r) return viewHome();
  if (r === 'novo') return viewWizard(id);
  if (r === 'biblioteca') return viewLibrary();
  if (r === 'programa' && id && parts[2] === 'slide' && parts[3]) return viewSlideEditor(id, parts[3]);
  if (r === 'programa' && id) return viewEditor(id, parts[2]);
  if (r === 'alunos') return viewPeople('students');
  if (r === 'personais') return viewPeople('trainers');
  if (r === 'pdfs') return viewPdfs();
  if (r === 'pdf' && id) return viewPdf(id);
  if (r === 'config') return viewConfig();
  location.hash = '#/';
}
window.addEventListener('hashchange', route);

/* Ações por data-action (delegação) */
const actions = {};
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { ev.preventDefault(); fn(el, ev); }
});

/* =========================================================
 * Modelos: 60 programas do App + modelos criados pelo personal
 * ======================================================= */
function libTemplates() {
  return Object.entries(window.LIBRARY_DATA || {}).map(([code, d]) => {
    const t = parseCode(code) || {};
    const { code: _c, ...tags } = t;
    const exs = d.workouts.flatMap((w) => w.exercises);
    return {
      id: 'lib:' + code, builtin: true, code, title: d.title, tagline: d.tagline, tags,
      freq: (CATALOG[code] || [])[1] || '', info: `${d.workouts.length} treinos · ${exs.length} exercícios`,
      cover: (exs.find((x) => x.image) || {}).image || '', data: d,
    };
  });
}
function myTemplates() {
  return S.programs.filter((p) => p.isTemplate).map((p) => {
    const exs = (p.workouts || []).flatMap((w) => w.exercises);
    return {
      id: p.id, builtin: false, title: p.title, tagline: p.subtitle, tags: progTags(p), freq: String(p.frequency || '').replace(/\/semana$/i, ''),
      info: p.mode === 'slides' ? `${(p.slides || []).length} slides` : `${p.workouts.length} treinos · ${exs.length} exercícios`,
      cover: p.mode === 'slides' ? '' : (exs.find((x) => x.image) || {}).image || '', program: p,
    };
  });
}
const allTemplates = () => [...myTemplates().sort((a, b) => a.title.localeCompare(b.title)), ...libTemplates()];
const templateById = (id) => allTemplates().find((t) => t.id === id);
const studentPrograms = () => S.programs.filter((p) => !p.isTemplate);

/** Filtro a partir dos dados do aluno. */
function studentFilter(st) {
  const f = {};
  if (st.sex) f.sex = st.sex;
  if (st.obj) f.obj = st.obj;
  if (st.level) f.level = st.level;
  if (st.env) f.env = st.env;
  const age = parseInt(st.age, 10);
  if (age) f.age = `${age}-${age}`;
  return f;
}
const DROP_ORDER = [['env', 'ambiente'], ['level', 'nível'], ['age', 'faixa etária'], ['obj', 'objetivo']];
/** Programas que combinam com o aluno; se nenhum, relaxa o filtro aos poucos. */
function recommend(st) {
  const f = studentFilter(st);
  const list = allTemplates();
  let found = list.filter((t) => tagMatch(t.tags, f));
  if (found.length) return { exact: true, list: found, dropped: [] };
  const g = { ...f };
  const dropped = [];
  for (const [k, label] of DROP_ORDER) {
    if (!g[k]) continue;
    delete g[k];
    dropped.push(label);
    found = list.filter((t) => tagMatch(t.tags, g));
    if (found.length) return { exact: false, list: found, dropped };
  }
  return { exact: false, list, dropped };
}

/** Cria o programa do aluno a partir de um modelo. */
async function createFromTemplate(tplId, studentId) {
  const tpl = templateById(tplId);
  if (!tpl) return null;
  let p;
  if (tpl.builtin) {
    const t = tpl.tags;
    p = newProgram({
      tags: { ...t },
      subtitle: [tagLabel('sex', t.sex), tagLabel('age', t.age), tagLabel('level', t.level), tagLabel('env', t.env)].filter(Boolean).join(' · '),
      level: tagLabel('level', t.level),
      frequency: tpl.freq ? tpl.freq + '/semana' : '',
      structure: tpl.freq === '3x' ? 'Full body A/B/C' : '',
    });
    fillFromLibrary(p, tpl.code);
  } else {
    p = structuredClone(tpl.program);
    p.id = uid();
    p.createdAt = 0;
    p.isTemplate = false;
    (p.workouts || []).forEach((w) => { w.id = uid(); w.exercises.forEach((x) => { x.id = uid(); }); });
    (p.slides || []).forEach((sl) => { sl.id = uid(); sl.layers.forEach((l) => { l.id = uid(); }); });
  }
  p.templateId = tplId;
  p.studentId = studentId || '';
  p.trainerId = S.settings.defaultTrainerId || (S.trainers[0] && S.trainers[0].id) || '';
  await saveEntity('programs', p);
  return p;
}

/** Copia um modelo (do App ou próprio) como novo modelo editável. */
async function copyAsTemplate(tplId) {
  const p = await createFromTemplate(tplId, '');
  if (!p) return;
  p.isTemplate = true;
  p.title = p.title + ' (meu modelo)';
  delete p.templateId;
  await saveEntity('programs', p);
  location.hash = `#/programa/${p.id}`;
  setTimeout(() => toast('Modelo criado. Edite e ele fica salvo na Biblioteca.'), 300);
}

/* ---- Cartão de modelo ---- */
function templateCard(t, actionsHTML) {
  return `<div class="card pcard tpl-card">
    ${t.cover ? `<div class="tpl-cover" style="background-image:url('${esc(photo(t.cover))}')"></div>` : '<div class="tpl-cover tpl-cover-empty">Trainer Pro</div>'}
    <div class="row" style="gap:6px">${t.builtin ? '<span class="chip">Programa do App</span>' : '<span class="chip gold">Meu modelo</span>'}${t.freq ? `<span class="chip">${esc(t.freq)}/semana</span>` : ''}</div>
    <h3>${esc(t.title)}</h3>
    ${t.tagline ? `<p class="small muted tpl-tagline">${esc(t.tagline)}</p>` : ''}
    <div class="meta">${tagChips(t.tags)}</div>
    <div class="small muted">${esc(t.info)}${t.code ? ' · ' + esc(t.code) : ''}</div>
    <div class="actions">${actionsHTML}</div>
  </div>`;
}

/* =========================================================
 * Tela: Início
 * ======================================================= */
function viewHome() {
  const progs = studentPrograms().sort((a, b) => b.updatedAt - a.updatedAt);
  const q = S.ui.q.trim().toLowerCase();
  const list = progs.filter((p) => {
    if (!q) return true;
    const st = byId(S.students, p.studentId);
    return `${p.title} ${st ? st.name : ''}`.toLowerCase().includes(q);
  });
  app.innerHTML = `
    ${sb && !CLOUD.user ? `<div class="card onboard row">
      <div style="flex:1;min-width:220px"><strong>Entre na sua conta</strong><div class="small muted">Para salvar na nuvem e liberar o acesso dos seus alunos ao app (com código), entre ou crie sua conta.</div></div>
      <button class="btn primary" data-action="login">Entrar ou criar conta</button></div>` : ''}
    ${!S.trainers.length ? `<div class="card onboard row">
      <div style="flex:1;min-width:220px"><strong>Primeiro passo: cadastre seu perfil de personal</strong><div class="small muted">Seu nome, foto e CREF aparecem nos programas que você enviar.</div></div>
      <button class="btn primary" data-action="new-person" data-kind="trainers">Cadastrar meu perfil</button></div>` : ''}
    <div class="hero card">
      <div>
        <h1>Programa pronto para o seu aluno em 1 minuto</h1>
        <p class="muted">Informe os dados do aluno, escolha um dos ${libTemplates().length} programas recomendados, coloque foto e nome e envie pelo WhatsApp.</p>
      </div>
      <div class="row hero-actions">
        <a class="btn primary lg" href="#/novo">+ Novo programa para um aluno</a>
        <a class="btn lg" href="#/biblioteca">Ver Biblioteca (${allTemplates().length})</a>
        <button class="btn lg" data-action="new-aero">+ Programa aeróbico</button>
      </div>
    </div>
    <div class="page-head" style="margin-top:28px"><div><h2>Programas dos seus alunos</h2><p class="muted small">${progs.length} programa(s) neste aparelho</p></div>
      ${progs.length ? `<input type="search" id="q" placeholder="Buscar por aluno ou programa…" value="${esc(S.ui.q)}" style="max-width:280px">` : ''}</div>
    ${!progs.length ? '<div class="empty">Nenhum programa enviado ainda. Comece em <b>+ Novo programa para um aluno</b>.</div>'
      : !list.length ? '<div class="empty">Nada encontrado.</div>'
      : `<div class="grid cards">${list.map((p) => {
        const st = byId(S.students, p.studentId);
        return `<div class="card pcard" data-action="open-program" data-id="${esc(p.id)}">
          <div class="who">${avatarHTML(st && st.photo, st ? st.name : '?')}<div><strong>${st ? esc(st.name) : 'Sem aluno'}</strong><div class="small muted">Atualizado em ${fmtDate(p.updatedAt)}</div></div></div>
          <h3>${esc(p.title || 'Sem título')}</h3>
          ${hasTags(progTags(p)) ? `<div class="meta">${tagChips(progTags(p))}</div>` : ''}
          <div class="actions">
            <button class="btn sm primary" data-action="student-access" data-id="${esc(p.id)}">Acesso do aluno</button>
            ${p.mode === 'aero' ? `<button class="btn sm" data-action="open-program" data-id="${esc(p.id)}">Ver / editar</button><span class="spacer"></span>` : `<button class="btn sm" data-action="send-program" data-id="${esc(p.id)}">PDF</button>
            <button class="btn sm" data-action="open-program" data-id="${esc(p.id)}" data-tab="gerar">Ver / editar</button>
            <span class="spacer"></span>
            <button class="btn sm ghost" data-action="save-template" data-id="${esc(p.id)}" title="Salvar como modelo para usar com outros alunos">Salvar como modelo</button>`}
            <button class="btn sm danger" data-action="del-program" data-id="${esc(p.id)}" title="Excluir">✕</button>
          </div></div>`;
      }).join('')}</div>`}`;
  const qi = $('#q');
  if (qi) qi.addEventListener('input', (e) => { S.ui.q = e.target.value; const pos = e.target.selectionStart; viewHome(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); });
}

/* =========================================================
 * Tela: Novo programa (passo a passo)
 * ======================================================= */
const W2 = { studentId: '', tplId: '' };
function viewWizard(tplId) {
  if (tplId) W2.tplId = decodeURIComponent(tplId);
  const st = byId(S.students, W2.studentId);
  const tpl = W2.tplId && templateById(W2.tplId);
  const studentOpts = S.students.slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `<option value="${esc(s.id)}" ${s.id === W2.studentId ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const missing = st ? ['sex', 'age', 'obj'].filter((k) => !st[k]) : [];
  app.innerHTML = `
    <div class="page-head"><div><a class="btn ghost sm" href="#/">← Início</a><h1 style="margin-top:6px">Novo programa para um aluno</h1></div></div>
    <div class="card stack wiz-step">
      <h2><span class="step-n">1</span> Aluno</h2>
      <div class="row">
        <select id="wz-student" style="max-width:360px"><option value="">Selecione um aluno já cadastrado…</option>${studentOpts}</select>
        <span class="muted small">ou</span>
        <button class="btn primary" data-action="wz-new-student">+ Cadastrar novo aluno</button>
      </div>
      ${st ? `<div class="row wz-student">${avatarHTML(st.photo, st.name, 'lg')}
        <div style="flex:1;min-width:200px"><strong>${esc(st.name)}</strong>
          <div class="meta" style="margin-top:6px">${[st.sex && tagLabel('sex', st.sex), st.age && st.age + ' anos', st.obj && tagLabel('obj', st.obj), st.level && tagLabel('level', st.level), st.env && tagLabel('env', st.env)].filter(Boolean).map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>
          ${!st.photo ? '<div class="small" style="color:var(--gold-2);margin-top:6px">Sem foto: adicione para aparecer na capa.</div>' : ''}
          ${missing.length ? '<div class="small" style="color:var(--gold-2);margin-top:6px">Complete sexo, idade e objetivo para receber as recomendações certas.</div>' : ''}</div>
        <button class="btn sm" data-action="edit-person" data-kind="students" data-id="${esc(st.id)}" data-wizard="1">Editar dados / foto</button></div>` : ''}
    </div>
    ${st ? `<div class="card stack wiz-step" style="margin-top:16px">
      <h2><span class="step-n">2</span> ${tpl ? 'Programa escolhido' : 'Programas recomendados'}</h2>
      <div id="wz-recs"></div>
    </div>` : ''}`;
  $('#wz-student').addEventListener('change', (e) => { W2.studentId = e.target.value; viewWizard(); });
  if (st) renderRecs(st, tpl);
}
function renderRecs(st, tpl) {
  const box = $('#wz-recs');
  const useBtn = (t) => `<button class="btn sm primary" data-action="wz-use" data-tpl="${esc(t.id)}">Usar para ${esc(st.name.split(' ')[0])}</button>
    <button class="btn sm" data-action="tpl-view" data-tpl="${esc(t.id)}">Ver treinos</button>`;
  if (tpl) {
    box.innerHTML = `<div class="grid cards">${templateCard(tpl, useBtn(tpl))}</div>
      <div class="row" style="margin-top:12px"><button class="btn sm ghost" data-action="wz-clear-tpl">Ver recomendações para este aluno</button></div>`;
    return;
  }
  const r = recommend(st);
  box.innerHTML = `
    <p class="small ${r.exact ? 'muted' : ''}" style="margin:0 0 12px;${r.exact ? '' : 'color:var(--gold-2)'}">${r.exact
      ? `${r.list.length} programa(s) combinam com os dados de ${esc(st.name.split(' ')[0])}.`
      : `Nenhum programa combina 100%. Estes são os mais próximos (ignorando: ${r.dropped.join(', ')}). Você pode usar um deles e ajustar, ou ver toda a Biblioteca.`}</p>
    <div class="grid cards">${r.list.map((t) => templateCard(t, useBtn(t))).join('')}</div>
    <div class="row" style="margin-top:14px"><a class="btn sm" href="#/biblioteca">Ver toda a Biblioteca</a></div>`;
}
actions['wz-new-student'] = () => personForm('students', null, false, (x) => { W2.studentId = x.id; viewWizard(); });
actions['wz-clear-tpl'] = () => { W2.tplId = ''; viewWizard(); };
actions['wz-use'] = async (el) => {
  const p = await withBusy('Montando o programa…', async () => createFromTemplate(el.dataset.tpl, W2.studentId));
  if (!p) return;
  W2.tplId = '';
  location.hash = `#/programa/${p.id}/gerar`;
  setTimeout(() => toast('Programa pronto. Confira, ajuste se quiser e envie.'), 300);
};
actions['tpl-view'] = (el) => {
  const t = templateById(el.dataset.tpl);
  const workouts = t.builtin ? t.data.workouts : (t.program.workouts || []);
  openModal(t.title, `
    ${t.tagline ? `<p class="muted">${esc(t.tagline)}</p>` : ''}
    <div class="meta" style="margin-bottom:12px">${tagChips(t.tags)}</div>
    ${t.program && t.program.mode === 'slides' ? `<p>Programa em slides (${t.info}).</p>` : workouts.map((w) => `
      <h3 style="margin:14px 0 6px">${esc(w.name)}${w.focus ? ` <span class="muted small">· ${esc(w.focus)}</span>` : ''}</h3>
      <table class="tpl-table">${w.exercises.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.sets || '')}${x.sets ? ' × ' : ''}${esc(x.reps || '')}</td><td>${esc(fmtRest(x.rest))}</td></tr>`).join('')}</table>`).join('')}`);
};

/* =========================================================
 * Tela: Biblioteca de programas (App + meus modelos)
 * ======================================================= */
function viewLibrary() {
  const f = S.ui.lf || (S.ui.lf = {});
  const all = allTemplates();
  app.innerHTML = `
    <div class="page-head"><div><h1>Biblioteca de programas</h1><p class="muted" id="lib-count"></p></div>
      <a class="btn" href="#/pdfs">Importar meus PDFs</a></div>
    <div class="toolbar">
      <input type="search" id="lib-q" placeholder="Buscar programa…" value="${esc(S.ui.lq || '')}" style="max-width:240px">
      ${tagSelects(f, 'lf-', all.map((t) => t.tags))}
      <select id="lib-src" style="max-width:200px"><option value="">Todos</option><option value="app" ${S.ui.lsrc === 'app' ? 'selected' : ''}>Programas do App</option><option value="mine" ${S.ui.lsrc === 'mine' ? 'selected' : ''}>Meus modelos</option></select>
      ${TAG_KEYS.some((k) => f[k]) ? '<button class="btn sm ghost" data-action="lib-clear">Limpar filtros</button>' : ''}
    </div>
    <div id="lib-list"></div>`;
  $('#lib-q').addEventListener('input', (e) => { S.ui.lq = e.target.value; renderLibList(); });
  $('#lib-src').addEventListener('change', (e) => { S.ui.lsrc = e.target.value; renderLibList(); });
  $$('[data-tagfilter]', app).forEach((sel) => sel.addEventListener('change', () => { f[sel.dataset.tagfilter] = sel.value; viewLibrary(); }));
  renderLibList();
}
actions['lib-clear'] = () => { S.ui.lf = {}; viewLibrary(); };
function renderLibList() {
  const f = S.ui.lf || {}, q = (S.ui.lq || '').trim().toLowerCase();
  const all = allTemplates();
  const list = all.filter((t) => tagMatch(t.tags, f))
    .filter((t) => !S.ui.lsrc || (S.ui.lsrc === 'mine' ? !t.builtin : t.builtin))
    .filter((t) => !q || `${t.title} ${t.code || ''} ${t.tagline || ''}`.toLowerCase().includes(q));
  $('#lib-count').textContent = `${list.length} de ${all.length} programas · ${myTemplates().length} modelo(s) seus`;
  $('#lib-list').innerHTML = list.length ? `<div class="grid cards">${list.map((t) => templateCard(t, `
      <button class="btn sm primary" data-action="tpl-use" data-tpl="${esc(t.id)}">Usar para um aluno</button>
      <button class="btn sm" data-action="tpl-view" data-tpl="${esc(t.id)}">Ver</button>
      ${t.builtin ? `<button class="btn sm ghost" data-action="tpl-copy" data-tpl="${esc(t.id)}" title="Cria uma cópia sua para editar">Criar modelo a partir deste</button>`
        : `<button class="btn sm ghost" data-action="open-program" data-id="${esc(t.id)}">Editar</button><button class="btn sm ghost" data-action="tpl-copy" data-tpl="${esc(t.id)}">Duplicar</button><button class="btn sm danger" data-action="del-program" data-id="${esc(t.id)}">✕</button>`}`)).join('')}</div>`
    : '<div class="empty">Nenhum programa com esses filtros. Os números entre parênteses mostram quantos existem em cada opção.</div>';
}
actions['tpl-use'] = (el) => { W2.tplId = el.dataset.tpl; location.hash = '#/novo'; };
actions['tpl-copy'] = (el) => copyAsTemplate(el.dataset.tpl);
actions['save-template'] = async (el, ev) => {
  if (ev) ev.stopPropagation();
  const src = byId(S.programs, el.dataset.id || (E.p && E.p.id));
  await saveSoon.flush();
  const name = prompt('Nome do novo modelo:', src.title);
  if (!name) return;
  const p = structuredClone(src);
  Object.assign(p, { id: uid(), createdAt: 0, isTemplate: true, studentId: '', title: name.trim() });
  delete p.templateId;
  (p.workouts || []).forEach((w) => { w.id = uid(); w.exercises.forEach((x) => { x.id = uid(); }); });
  (p.slides || []).forEach((sl) => { sl.id = uid(); sl.layers.forEach((l) => { l.id = uid(); }); });
  await saveEntity('programs', p);
  toast('Modelo salvo na Biblioteca. Use com outros alunos.');
};

/* =========================================================
 * Envio: PDF + WhatsApp
 * ======================================================= */
function waText(p) {
  const st = byId(S.students, p.studentId), tr = byId(S.trainers, p.trainerId);
  return `Olá${st ? ' ' + st.name.split(' ')[0] : ''}! Segue seu programa de treino "${p.title}". Qualquer dúvida, é só me chamar.${tr ? '\n' + tr.name : ''}`;
}
function waNumber(st) {
  let d = String((st && st.phone) || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return d;
}
actions['send-program'] = async (el, ev) => {
  if (ev) ev.stopPropagation();
  const p = byId(S.programs, el.dataset.id || (E.p && E.p.id));
  if (E.p && E.p.id === p.id) await saveSoon.flush();
  const out = await buildProgramPdf(p);
  if (out) showSendModal(p, out);
};
function showSendModal(p, { blob, fileName, pages }) {
  const st = byId(S.students, p.studentId);
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const canShare = navigator.canShare && navigator.canShare({ files: [file] });
  const num = waNumber(st);
  const text = waText(p);
  const body = openModal('Enviar programa', `
    <p>PDF <b>${esc(fileName)}</b> pronto (${pages} páginas, ${fmtSize(blob.size)}). Uma cópia ficou salva em Meus PDFs.</p>
    <label class="field"><span>Mensagem</span><textarea id="wa-text" rows="3">${esc(text)}</textarea></label>
    <div class="stack" style="margin-top:14px;gap:10px">
      ${canShare ? '<button class="btn primary lg" id="wa-share">Enviar pelo WhatsApp (PDF anexado)</button>' : ''}
      <button class="btn ${canShare ? '' : 'primary lg'}" id="wa-open">${canShare ? 'Abrir conversa no WhatsApp' : 'Baixar PDF e abrir o WhatsApp'}</button>
      <button class="btn ghost" id="dl-pdf">Só baixar o PDF</button>
    </div>
    <p class="small muted" style="margin-bottom:0">${canShare ? 'Em "Enviar pelo WhatsApp" escolha o WhatsApp e o contato: o PDF vai anexado.' : `O PDF é baixado e a conversa ${num ? 'com ' + esc(st.name.split(' ')[0]) + ' ' : ''}abre no WhatsApp com a mensagem. Arraste o PDF baixado para a conversa.`}
      ${!num ? '<br>Dica: cadastre o WhatsApp do aluno para abrir a conversa direto com ele.' : ''}</p>`);
  const msg = () => $('#wa-text', body).value;
  if (canShare) $('#wa-share', body).onclick = () => navigator.share({ files: [file], title: p.title, text: msg() }).catch(() => {});
  $('#wa-open', body).onclick = () => {
    if (!canShare) downloadBlob(blob, fileName);
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg())}`, '_blank');
  };
  $('#dl-pdf', body).onclick = () => downloadBlob(blob, fileName);
}


/* =========================================================
 * Tela: Programas
 * ======================================================= */
function avatarHTML(photo, name, cls = '') {
  return photo
    ? `<img class="avatar ${cls}" src="${esc(photo)}" alt="">`
    : `<span class="avatar ${cls}">${esc(initials(name))}</span>`;
}
function viewPrograms() {
  const studentOpts = S.students.slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `<option value="${esc(s.id)}" ${S.ui.student === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  app.innerHTML = `
    <div class="page-head">
      <div><h1>Programas de treino</h1><p class="muted">${S.programs.length} programa(s) salvos neste aparelho</p></div>
      <div class="row">
        <button class="btn" data-action="import-pdf-new">Importar PDF</button>
        <button class="btn primary" data-action="new-program">+ Novo programa</button>
      </div>
    </div>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Buscar por título ou aluno…" value="${esc(S.ui.q)}">
      <select id="fstudent"><option value="">Todos os alunos</option>${studentOpts}</select>
      ${tagSelects(S.ui.prf, 'prf-', [...S.programs.map(progTags), ...libraryPdfs().map((x) => x.tags)])}
      ${TAG_KEYS.some((k) => S.ui.prf[k]) ? '<button class="btn sm ghost" data-action="prog-clear-filters">Limpar filtros</button>' : ''}
    </div>
    <div id="plist"></div>`;
  $('#q').addEventListener('input', (e) => { S.ui.q = e.target.value; renderProgramList(); });
  $('#fstudent').addEventListener('change', (e) => { S.ui.student = e.target.value; renderProgramList(); });
  $$('[data-tagfilter]', app).forEach((sel) => sel.addEventListener('change', () => { S.ui.prf[sel.dataset.tagfilter] = sel.value; viewPrograms(); }));
  renderProgramList();
}
function renderProgramList() {
  const q = S.ui.q.trim().toLowerCase();
  const list = S.programs
    .filter((p) => !S.ui.student || p.studentId === S.ui.student)
    .filter((p) => tagMatch(progTags(p), S.ui.prf))
    .filter((p) => {
      if (!q) return true;
      const st = byId(S.students, p.studentId);
      return (p.title + ' ' + p.subtitle + ' ' + (st ? st.name : '')).toLowerCase().includes(q);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const box = $('#plist');
  if (!S.programs.length) {
    box.innerHTML = `<div class="empty"><h2>Nenhum programa ainda</h2><p>Crie um programa do zero ou importe um PDF que você já tem.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-action="import-pdf-new">Importar PDF</button><button class="btn primary" data-action="new-program">+ Novo programa</button></div></div>`;
    return;
  }
  const filtering = TAG_KEYS.some((k) => S.ui.prf[k]);
  const lib = filtering ? libraryPdfs().filter((x) => tagMatch(x.tags, S.ui.prf)).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name)) : [];
  const libHTML = !filtering ? '' : `
    <div class="section"><h2 style="margin-bottom:4px">Na Biblioteca de Treinos (${lib.length})</h2>
      <p class="small muted" style="margin:0 0 12px">Modelos em PDF que combinam com os filtros. Use "Criar programa" para personalizar para um aluno.</p>
      ${lib.length ? `<div class="grid cards">${lib.map((x) => `<div class="card pcard" style="cursor:default">
        ${x.thumb ? `<img src="${esc(x.thumb)}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#fff">` : ''}
        <h3>${esc(pdfTitle(x))}</h3>
        <div class="small muted">${esc(x.code || x.name)}</div>
        <div class="meta">${tagChips(x.tags)}</div>
        <div class="actions"><button class="btn sm primary" data-action="pdf-to-program" data-id="${esc(x.id)}">Criar programa</button><a class="btn sm" href="#/pdf/${esc(x.id)}">Ver PDF</a></div>
      </div>`).join('')}</div>` : `<div class="empty" style="padding:24px">Nenhum PDF da biblioteca com essa combinação. ${untaggedNote()}</div>`}
    </div>`;
  const ownTitle = filtering ? `<h2 style="margin-bottom:12px">Seus programas (${list.length})</h2>` : '';
  if (!list.length) {
    box.innerHTML = (filtering
      ? `${ownTitle}<div class="empty" style="padding:24px">Nenhum programa seu com esses filtros. Programas criados antes das etiquetas não têm etiqueta: abra o programa e preencha em "1. Dados e capa".</div>`
      : `<div class="empty">Nenhum programa encontrado com essa busca.</div>`) + libHTML;
    return;
  }
  box.innerHTML = ownTitle + `<div class="grid cards">${list.map((p) => {
    const st = byId(S.students, p.studentId);
    const tr = byId(S.trainers, p.trainerId);
    return `<div class="card pcard" data-action="open-program" data-id="${esc(p.id)}">
      <div class="who">${avatarHTML(st && st.photo, st ? st.name : '?')}
        <div><div class="small muted">${st ? esc(st.name) : 'Sem aluno definido'}</div><div class="small muted">${tr ? 'por ' + esc(tr.name) : ''}</div></div></div>
      <h3>${esc(p.title || 'Sem título')}</h3>
      ${hasTags(progTags(p)) ? `<div class="meta">${tagChips(progTags(p))}</div>` : ''}
      <div class="meta">${p.mode === 'slides' ? `<span class="chip gold">${(p.slides || []).length} slides</span>` : `<span class="chip gold">${p.workouts.length} treino(s)</span><span class="chip">${totalExercises(p)} exercícios</span><span class="chip">${esc(p.weeks || '?')} semanas</span>`}</div>
      <div class="small muted">Atualizado em ${fmtDate(p.updatedAt)}</div>
      <div class="actions">
        <button class="btn sm" data-action="open-program" data-id="${esc(p.id)}">Editar</button>
        <button class="btn sm" data-action="open-program" data-id="${esc(p.id)}" data-tab="gerar">Gerar PDF</button>
        <button class="btn sm" data-action="dup-program" data-id="${esc(p.id)}" title="Duplicar para outro aluno">Duplicar</button>
        <span class="spacer"></span>
        <button class="btn sm danger" data-action="del-program" data-id="${esc(p.id)}" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('')}</div>` + libHTML;
}
actions['prog-clear-filters'] = () => { S.ui.prf = {}; viewPrograms(); };
/** Etiquetas do programa; se não tiver, herda do PDF de origem. */
function progTags(p) {
  if (hasTags(p.tags)) return p.tags;
  const src = p.sourcePdfId && byId(S.pdfs, p.sourcePdfId);
  return (src && src.tags) || {};
}
function untaggedNote() {
  const n = libraryPdfs().filter((x) => !hasTags(x.tags)).length;
  return n ? `<br><b>${n} PDF(s) estão sem etiquetas</b> e não entram nos filtros. <a href="#/pdfs" data-action="show-untagged">Ver quais</a>.` : '';
}
actions['show-untagged'] = () => {
  S.ui.pf = {}; S.ui.pq = ''; S.ui.ptype = 'untag';
  if (location.hash === '#/pdfs') viewPdfs(); else location.hash = '#/pdfs';
};
actions['new-program'] = async () => {
  const p = newProgram();
  await saveEntity('programs', p);
  location.hash = `#/programa/${p.id}`;
};
actions['open-program'] = (el, ev) => {
  ev.stopPropagation();
  location.hash = `#/programa/${el.dataset.id}${el.dataset.tab ? '/' + el.dataset.tab : ''}`;
};
actions['dup-program'] = async (el, ev) => {
  ev.stopPropagation();
  const src = byId(S.programs, el.dataset.id);
  const p = structuredClone(src);
  p.id = uid();
  p.title = src.title + ' (cópia)';
  p.studentId = '';
  p.createdAt = 0;
  p.workouts.forEach((w) => { w.id = uid(); w.exercises.forEach((x) => { x.id = uid(); }); });
  (p.slides || []).forEach((sl) => { sl.id = uid(); sl.layers.forEach((l) => { l.id = uid(); }); });
  await saveEntity('programs', p);
  toast('Programa duplicado. Escolha o aluno.');
  location.hash = `#/programa/${p.id}`;
};
actions['del-program'] = async (el, ev) => {
  ev.stopPropagation();
  const p = byId(S.programs, el.dataset.id);
  if (!confirm(`Excluir ${p.isTemplate ? 'o modelo' : 'o programa'} "${p.title}"? Isso não pode ser desfeito.`)) return;
  await removeEntity('programs', p.id);
  toast(p.isTemplate ? 'Modelo excluído' : 'Programa excluído');
  route();
};
actions['import-pdf-new'] = async () => {
  const files = await pickFile('application/pdf', false);
  if (!files.length) return;
  const meta = await withBusy('Lendo o PDF…', () => addPdfFile(files[0]));
  if (!meta) return;
  await createProgramFromPdf(meta.id);
};
async function createProgramFromPdf(pdfId) {
  const meta = byId(S.pdfs, pdfId);
  const t = meta.tags || {};
  const over = { title: pdfTitle(meta).replace(/[_]+/g, ' ').trim(), sourcePdfId: pdfId, tags: { ...t } };
  if (hasTags(t)) {
    over.subtitle = [t.sex && tagLabel('sex', t.sex), t.age && tagLabel('age', t.age), t.level && tagLabel('level', t.level), t.env && tagLabel('env', t.env)].filter(Boolean).join(' · ');
    if (t.level) over.level = tagLabel('level', t.level);
  }
  const cat = meta.code && CATALOG[meta.code];
  if (cat) {
    over.frequency = cat[1] + '/semana';
    over.structure = cat[1] === '3x' ? 'Full body A/B/C' : '';
  }
  const p = newProgram(over);
  if (meta.code) fillFromLibrary(p, meta.code);
  await saveEntity('programs', p);
  location.hash = `#/programa/${p.id}/treinos`;
  setTimeout(() => toast(p.libraryCode ? 'Programa criado com o conteúdo da Biblioteca. Edite o que quiser.' : 'PDF salvo. Agora puxe as páginas dos exercícios.'), 300);
}

/* =========================================================
 * Tela: Editor de programa
 * ======================================================= */
const E = { p: null, tab: 'dados', open: new Set(), dirty: false };
const saveSoon = (() => {
  let t;
  const run = async () => {
    if (!E.p || !E.dirty) return;
    E.dirty = false;
    await saveEntity('programs', E.p);
    const s = $('#save-state');
    if (s) { s.textContent = 'Salvo ✓'; s.classList.add('ok'); }
  };
  const fn = () => {
    E.dirty = true;
    const s = $('#save-state');
    if (s) { s.textContent = 'Salvando…'; s.classList.remove('ok'); }
    clearTimeout(t);
    t = setTimeout(run, 500);
  };
  fn.flush = () => { clearTimeout(t); return run(); };
  return fn;
})();

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  const tgt = ks.reduce((o, k) => o[k], obj);
  tgt[last] = val;
}

function viewEditor(id, tab) {
  const p = byId(S.programs, id);
  if (!p) { location.hash = '#/'; return; }
  p.include = { trainer: true, overview: true, guidelines: true, warmup: true, pse: true, closing: true, ...(p.include || {}) };
  p.tags = p.tags || {};
  E.p = p;
  const tabs = (p.mode === 'slides' ? ['slides', 'dados', 'gerar'] : p.mode === 'aero' ? AERO_TABS.map((t) => t[0]) : ['dados', 'treinos', 'gerar']).concat(p.isTemplate ? [] : ['acomp']);
  E.tab = tabs.includes(tab) ? tab : tabs[0];
  leaveHook = () => saveSoon.flush();
  renderEditor();
}
function renderEditor() {
  const p = E.p;
  app.innerHTML = `
    <div class="editor-head">
      <div class="row">
        <a class="btn ghost sm" href="${p.isTemplate ? '#/biblioteca' : '#/'}">← ${p.isTemplate ? 'Biblioteca' : 'Início'}</a>
        ${p.isTemplate ? '<span class="chip gold">Meu modelo: alterações valem para os próximos alunos</span>' : ''}
        <span class="spacer"></span>
        <span id="save-state" class="save-state ok">Salvo ✓</span>
        ${p.isTemplate ? '' : `${p.mode === 'aero' ? '' : `<button class="btn sm ghost" data-action="save-template" data-id="${esc(p.id)}">Salvar como modelo</button>
        <button class="btn sm" data-action="send-program" data-id="${esc(p.id)}">Enviar PDF</button>`}
        <button class="btn sm primary" data-action="student-access" data-id="${esc(p.id)}">Liberar acesso ao aluno</button>`}
      </div>
      <h1 id="ed-title" style="margin-top:6px">${esc(p.title || 'Sem título')}</h1>
      <div class="tabs">${(p.mode === 'slides'
        ? [['slides', '1. Slides'], ['dados', '2. Aluno e personal'], ['gerar', '3. Gerar PDF']]
        : p.mode === 'aero' ? AERO_TABS
        : [['dados', '1. Dados e capa'], ['treinos', '2. Treinos e exercícios'], ['gerar', '3. Visualizar e gerar PDF']])
        .concat(p.isTemplate ? [] : [['acomp', p.mode === 'aero' ? '7. Acompanhamento' : '4. Acompanhamento']])
        .map(([k, l]) => `<button data-action="tab" data-tab="${k}" class="${E.tab === k ? 'active' : ''}">${l}</button>`).join('')}
      </div>
    </div>
    <div id="ed-body">${E.tab === 'acomp' ? '' : p.mode === 'aero' ? aeroBody(p) : E.tab === 'slides' ? tabSlides() : E.tab === 'dados' ? (p.mode === 'slides' ? tabPessoas() : tabDados()) : E.tab === 'treinos' ? tabTreinos() : tabGerar()}</div>`;
  if (E.tab === 'acomp') tabAcompanhamento();
  bindInputs(app);
  if (p.mode === 'aero') aeroRefresh();
  if (E.tab === 'gerar') renderPreview();
  if (E.tab === 'slides') { scaleFrames(app); new ResizeObserver(() => scaleFrames(app)).observe($('#ed-body')); }
}
actions['fill-library'] = async () => {
  const p = E.p;
  if (totalExercises(p) && !confirm('Substituir os treinos e textos atuais pelo conteúdo original da Biblioteca? As fotos dos exercícios serão removidas.')) return;
  fillFromLibrary(p, programCode(p));
  E.open.clear();
  saveSoon();
  await saveSoon.flush();
  renderEditor();
  toast('Programa preenchido com a Biblioteca');
};
actions.tab = async (el) => {
  await saveSoon.flush();
  E.tab = el.dataset.tab;
  if (E.p.mode === 'aero' && !AERO_TABS.some((t) => t[0] === E.tab) && E.tab !== 'acomp') E.tab = 'aerob';
  history.replaceState(null, '', `#/programa/${E.p.id}/${E.tab}`);
  renderEditor();
  window.scrollTo(0, 0);
};

function bindInputs(root) {
  $$('[data-bind]', root).forEach((inp) => {
    const path = inp.dataset.bind;
    const v = getPath(E.p, path);
    if (inp.type === 'checkbox') inp.checked = !!v; else inp.value = v ?? '';
    const evName = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
    inp.addEventListener(evName, () => {
      setPath(E.p, path, inp.type === 'checkbox' ? inp.checked : inp.value);
      saveSoon();
      onBound(path, inp);
    });
  });
}
function onBound(path) {
  if (path === 'title') $('#ed-title').textContent = E.p.title || 'Sem título';
  if (path.startsWith('aero.')) aeroRefresh();
  const m = path.match(/^workouts\.(\d+)\.exercises\.(\d+)\./);
  if (m) {
    const ex = E.p.workouts[+m[1]].exercises[+m[2]];
    const row = $(`[data-exrow="${ex.id}"]`);
    if (row) {
      $('.ex-title strong', row).textContent = ex.name || 'Novo exercício';
      $('.ex-title span', row).textContent = exSummary(ex);
    }
  }
}

/* ---- Aba 1: Dados ---- */
function optList(list, sel, empty) {
  return `<option value="">${esc(empty)}</option>` + list.slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((x) => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
}
function tabDados() {
  const p = E.p;
  const st = byId(S.students, p.studentId);
  const tr = byId(S.trainers, p.trainerId);
  return `${libBanner(p)}
  <div class="section grid two" id="sec-pessoas">
    <div class="card stack">
      <h2>Aluno(a)</h2>
      <div class="photo-pick">${avatarHTML(st && st.photo, st ? st.name : '?', 'lg')}
        <div class="stack" style="flex:1;gap:8px">
          <select id="sel-student">${optList(S.students, p.studentId, 'Selecione o aluno…')}</select>
          <div class="row"><button class="btn sm" data-action="new-person" data-kind="students" data-assign="1">+ Novo aluno</button>
          ${st ? `<button class="btn sm" data-action="edit-person" data-kind="students" data-id="${esc(st.id)}" data-assign="1">Editar foto/nome</button>` : ''}</div>
        </div>
      </div>
    </div>
    <div class="card stack">
      <h2>Personal Trainer</h2>
      <div class="photo-pick">${avatarHTML(tr && tr.photo, tr ? tr.name : '?', 'lg')}
        <div class="stack" style="flex:1;gap:8px">
          <select id="sel-trainer">${optList(S.trainers, p.trainerId, 'Selecione o personal…')}</select>
          <div class="row"><button class="btn sm" data-action="new-person" data-kind="trainers" data-assign="1">+ Novo personal</button>
          ${tr ? `<button class="btn sm" data-action="edit-person" data-kind="trainers" data-id="${esc(tr.id)}" data-assign="1">Editar foto/dados</button>` : ''}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section card stack" id="sec-capa">
    <h2>Capa do programa</h2>
    <div class="grid two">
      <label class="field"><span>Título do programa</span><input type="text" data-bind="title" placeholder="Ex.: Projeto Fundação Muscular"></label>
      <label class="field"><span>Público / subtítulo</span><input type="text" data-bind="subtitle" placeholder="Ex.: Mulheres 20-39 anos · Iniciante · Academia"></label>
    </div>
    <div class="grid three">
      <label class="field"><span>Duração (semanas)</span><input type="text" data-bind="weeks" inputmode="numeric"></label>
      <label class="field"><span>Frequência</span><input type="text" data-bind="frequency" placeholder="3x/semana"></label>
      <label class="field"><span>Estrutura</span><input type="text" data-bind="structure" placeholder="Full body A/B/C"></label>
    </div>
    <div class="grid three">
      <label class="field"><span>Nível</span><input type="text" data-bind="level" placeholder="Iniciante"></label>
      <label class="field"><span>Visual do PDF</span><select data-bind="theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
    </div>
  </div>

  <div class="section card stack">
    <h2>Etiquetas</h2>
    <div class="grid three">${TAG_KEYS.map((k) => `<label class="field"><span>${TAGS[k].label}</span><select data-bind="tags.${k}"><option value="">—</option>${Object.entries(TAGS[k].opts).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>
  </div>

  <div class="section card stack" id="sec-conteudo">
    <h2>Conteúdo das páginas iniciais</h2>
    <label class="field"><span>Visão geral do programa</span><textarea data-bind="overview" rows="4" placeholder="Explique o objetivo e a lógica do programa."></textarea></label>
    <div class="grid two">
      <label class="field"><span>Objetivos</span><textarea data-bind="objectives" rows="4" placeholder="Um objetivo por linha"></textarea><span class="hint">Um item por linha.</span></label>
      <label class="field"><span>Recomendações</span><textarea data-bind="recommendations" rows="4" placeholder="Uma recomendação por linha"></textarea><span class="hint">Um item por linha.</span></label>
    </div>
    <label class="field"><span>Aquecimento padrão</span><textarea data-bind="warmup" rows="3" placeholder="Cárdio leve: 5-8 minutos de esteira ou bicicleta"></textarea><span class="hint">Uma etapa por linha, no formato <b>Título: descrição</b>.</span></label>
    <label class="field"><span>Nota da escala PSE</span><textarea data-bind="pseNote" rows="3"></textarea></label>
    <label class="field"><span>Mensagem final</span><textarea data-bind="closingMessage" rows="2"></textarea></label>
  </div>

  <div class="section card stack">
    <h2>Páginas incluídas no PDF</h2>
    <div class="grid three">
      ${[['trainer', 'Apresentação do personal'], ['overview', 'Visão geral'], ['guidelines', 'Objetivos e recomendações'], ['warmup', 'Aquecimento'], ['pse', 'Escala PSE'], ['closing', 'Página final']]
        .map(([k, l]) => `<label class="row"><input type="checkbox" data-bind="include.${k}"> ${l}</label>`).join('')}
    </div>
    <p class="small muted" style="margin:0">Páginas sem conteúdo são puladas automaticamente.</p>
  </div>
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="treinos">Próximo: treinos →</button></div>`;
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'sel-student') { E.p.studentId = e.target.value; saveSoon(); renderEditor(); }
  if (e.target.id === 'sel-trainer') { E.p.trainerId = e.target.value; saveSoon(); renderEditor(); }
});

/* ---- Aba 2: Treinos ---- */
function exSummary(x) {
  const parts = [];
  if (x.sets || x.reps) parts.push(`${x.sets || '?'} × ${x.reps || '?'}`);
  if (x.rest) parts.push(`desc. ${fmtRest(x.rest)}`);
  if (x.muscles) parts.push(x.muscles);
  return parts.join(' · ') || 'Toque para editar';
}
function fmtRest(r) { r = String(r || '').trim(); return /^\d+$/.test(r) ? r + 's' : r; }
function tabTreinos() {
  const p = E.p;
  const src = p.sourcePdfId && byId(S.pdfs, p.sourcePdfId);
  return `${libBanner(p)}
  ${src ? `<div class="section card row"><div style="flex:1;min-width:220px"><strong>PDF original:</strong> ${esc(src.name)} <span class="muted small">(${src.pages} páginas)</span><div class="small muted">Use "Importar páginas do PDF" em cada treino para trazer as fotos dos exercícios de uma vez.</div></div>
    <a class="btn sm" href="#/pdf/${esc(src.id)}">Ver PDF</a></div>` : ''}
  <div class="section stack">
    ${p.workouts.map((w, wi) => workoutHTML(w, wi)).join('')}
  </div>
  <div class="section row">
    <button class="btn" data-action="add-workout">+ Adicionar treino</button>
    <span class="spacer"></span>
    <button class="btn primary" data-action="tab" data-tab="gerar">Próximo: gerar PDF →</button>
  </div>`;
}
function workoutHTML(w, wi) {
  const n = E.p.workouts.length;
  return `<div class="card workout" id="w-${esc(w.id)}">
    <div class="workout-head">
      <input type="text" data-bind="workouts.${wi}.name" placeholder="Nome do treino (ex.: Treino A)" style="max-width:220px">
      <input type="text" data-bind="workouts.${wi}.focus" placeholder="Foco (ex.: Full body · ênfase inferior)">
      <div class="row" style="gap:4px">
        <button class="btn icon sm" data-action="mv-workout" data-wi="${wi}" data-d="-1" ${wi === 0 ? 'disabled' : ''} title="Subir">↑</button>
        <button class="btn icon sm" data-action="mv-workout" data-wi="${wi}" data-d="1" ${wi === n - 1 ? 'disabled' : ''} title="Descer">↓</button>
        <button class="btn sm" data-action="dup-workout" data-wi="${wi}">Duplicar</button>
        <button class="btn sm danger" data-action="del-workout" data-wi="${wi}" title="Excluir treino">✕</button>
      </div>
    </div>
    <div class="workout-body">
      <div class="row small muted">
        <span>Imagem da capa do treino:</span>
        ${w.coverImage ? `<img src="${esc(w.coverImage)}" style="width:72px;height:40px;object-fit:cover;border-radius:6px">` : '<span>usa a foto do 1º exercício</span>'}
        <button class="btn sm" data-action="img-upload" data-target="cover" data-wi="${wi}">Enviar foto</button>
        <button class="btn sm" data-action="img-pdf" data-target="cover" data-wi="${wi}">Do PDF</button>
        ${w.coverImage ? `<button class="btn sm ghost" data-action="img-clear" data-target="cover" data-wi="${wi}">Remover</button>` : ''}
      </div>
      ${w.exercises.length ? '' : '<div class="empty" style="padding:20px">Nenhum exercício neste treino ainda.</div>'}
      ${w.exercises.map((x, ei) => exerciseHTML(x, wi, ei, w.exercises.length)).join('')}
      <div class="row">
        <button class="btn sm primary" data-action="ex-bank" data-wi="${wi}">+ Do banco de exercícios (com foto)</button>
        <button class="btn sm" data-action="add-ex" data-wi="${wi}">+ Exercício em branco</button>
        <button class="btn sm" data-action="import-pages" data-wi="${wi}">Importar páginas do PDF</button>
      </div>
    </div>
  </div>`;
}
function exerciseHTML(x, wi, ei, n) {
  const open = E.open.has(x.id);
  const b = `workouts.${wi}.exercises.${ei}`;
  return `<div class="ex" data-exrow="${esc(x.id)}">
    <div class="ex-row" data-action="toggle-ex" data-id="${esc(x.id)}">
      <span class="ex-num">${pad2(ei + 1)}</span>
      ${x.image ? `<img class="ex-thumb" src="${esc(photo(x.image))}" alt="">` : '<span class="ex-thumb">sem foto</span>'}
      <span class="ex-title"><strong>${esc(x.name || 'Novo exercício')}</strong><span>${esc(exSummary(x))}</span></span>
      <span class="ex-tools">
        <button class="btn icon sm hide-sm" data-action="mv-ex" data-wi="${wi}" data-ei="${ei}" data-d="-1" ${ei === 0 ? 'disabled' : ''} title="Subir">↑</button>
        <button class="btn icon sm hide-sm" data-action="mv-ex" data-wi="${wi}" data-ei="${ei}" data-d="1" ${ei === n - 1 ? 'disabled' : ''} title="Descer">↓</button>
        <button class="btn icon sm" title="${open ? 'Fechar' : 'Editar'}">${open ? '▴' : '▾'}</button>
      </span>
    </div>
    ${open ? `<div class="ex-form">
      <div class="grid two">
        <label class="field"><span>Nome do exercício</span><input type="text" data-bind="${b}.name" placeholder="Ex.: Agachamento no Smith"></label>
        <label class="field"><span>Grupo muscular</span><input type="text" data-bind="${b}.muscles" placeholder="Ex.: Quadríceps / Glúteos"></label>
      </div>
      <div class="ex-img-edit">
        ${x.image ? `<img class="preview" src="${esc(photo(x.image))}" alt="">` : '<div class="preview">Sem imagem.<br>Envie uma foto ou puxe do PDF.</div>'}
        <div class="stack" style="gap:8px">
          <button class="btn sm" data-action="img-upload" data-target="ex" data-wi="${wi}" data-ei="${ei}">Enviar foto</button>
          <button class="btn sm" data-action="img-pdf" data-target="ex" data-wi="${wi}" data-ei="${ei}">Puxar do PDF</button>
          ${x.image ? `<button class="btn sm" data-action="img-recrop" data-wi="${wi}" data-ei="${ei}">Recortar</button>
          <button class="btn sm ghost" data-action="img-clear" data-target="ex" data-wi="${wi}" data-ei="${ei}">Remover imagem</button>` : ''}
        </div>
      </div>
      <div class="stats-grid">
        <label class="field"><span>Séries</span><input type="text" data-bind="${b}.sets"></label>
        <label class="field"><span><select data-bind="${b}.repsLabel" style="padding:0 4px;border:0;background:transparent;font-size:12px;font-weight:600;text-transform:uppercase;color:var(--muted);width:auto"><option>Reps</option><option>Tempo</option><option>Duração</option></select></span><input type="text" data-bind="${b}.reps"></label>
        <label class="field"><span>PSE</span><input type="text" data-bind="${b}.pse" placeholder="6-7"></label>
        <label class="field"><span>Descanso</span><input type="text" data-bind="${b}.rest" placeholder="90s"></label>
        <label class="field"><span>Cadência</span><input type="text" data-bind="${b}.cadence" placeholder="2-0-1"></label>
        <label class="field"><span>Carga</span><input type="text" data-bind="${b}.load" placeholder="opcional"></label>
      </div>
      <label class="field"><span>Execução</span><textarea data-bind="${b}.execution" rows="3"></textarea></label>
      <div class="grid two">
        <label class="field"><span>Cuidados</span><textarea data-bind="${b}.cautions" rows="2"></textarea></label>
        <label class="field"><span>Observações</span><textarea data-bind="${b}.notes" rows="2"></textarea></label>
      </div>
      <div class="row">
        <button class="btn sm" data-action="dup-ex" data-wi="${wi}" data-ei="${ei}">Duplicar</button>
        <button class="btn sm" data-action="mv-ex" data-wi="${wi}" data-ei="${ei}" data-d="-1" ${ei === 0 ? 'disabled' : ''}>↑ Subir</button>
        <button class="btn sm" data-action="mv-ex" data-wi="${wi}" data-ei="${ei}" data-d="1" ${ei === n - 1 ? 'disabled' : ''}>↓ Descer</button>
        <span class="spacer"></span>
        <button class="btn sm danger" data-action="del-ex" data-wi="${wi}" data-ei="${ei}">Excluir exercício</button>
      </div>
    </div>` : ''}
  </div>`;
}
function rerenderTreinos() {
  const y = window.scrollY;
  $('#ed-body').innerHTML = E.p.mode === 'aero' ? aeroBody(E.p) : tabTreinos();
  bindInputs($('#ed-body'));
  window.scrollTo(0, y);
}
const W = (el) => E.p.workouts[+el.dataset.wi];
function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
actions['toggle-ex'] = (el, ev) => {
  if (ev.target.closest('[data-action]') !== el) return;
  const id = el.dataset.id;
  if (E.open.has(id)) E.open.delete(id); else E.open.add(id);
  rerenderTreinos();
};
actions['add-workout'] = () => {
  const letter = String.fromCharCode(65 + E.p.workouts.length);
  E.p.workouts.push(newWorkout(`Treino ${letter}`));
  saveSoon(); rerenderTreinos();
};
actions['dup-workout'] = (el) => {
  const w = clone(W(el));
  w.id = uid();
  w.name += ' (cópia)';
  w.exercises.forEach((x) => { x.id = uid(); });
  E.p.workouts.splice(+el.dataset.wi + 1, 0, w);
  saveSoon(); rerenderTreinos();
};
actions['del-workout'] = (el) => {
  const w = W(el);
  if (!confirm(`Excluir "${w.name}" e seus ${w.exercises.length} exercício(s)?`)) return;
  E.p.workouts.splice(+el.dataset.wi, 1);
  saveSoon(); rerenderTreinos();
};
actions['mv-workout'] = (el) => { move(E.p.workouts, +el.dataset.wi, +el.dataset.d); saveSoon(); rerenderTreinos(); };

/* ---- Banco de exercícios (todos os exercícios da Biblioteca, com foto) ---- */
let EX_BANK = null;
const normTxt = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function exerciseBank() {
  if (EX_BANK) return EX_BANK;
  const m = new Map();
  Object.values(window.LIBRARY_DATA || {}).forEach((pr) => (pr.workouts || []).forEach((w) => (w.exercises || []).forEach((e) => {
    const k = String(e.name || '').trim();
    if (!k) return;
    const sx = /fotos\/M\//.test(e.image || '') ? 'M' : 'F';
    const o = m.get(k) || { name: k, img: {}, execution: e.execution || '', cautions: e.cautions || '', repsLabel: e.repsLabel || 'Reps' };
    if (e.image && !o.img[sx]) o.img[sx] = e.image;
    m.set(k, o);
  })));
  EX_BANK = [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  return EX_BANK;
}
actions['ex-bank'] = (el) => {
  const wi = +el.dataset.wi;
  const st = byId(S.students, E.p.studentId);
  const sx = st && st.sex === 'M' ? 'M' : 'F';
  const sel = new Set();
  const bank = exerciseBank();
  const body = openModal('Banco de exercícios', `
    <div class="stack">
      <input type="search" id="xb-q" placeholder="Buscar exercício (ex.: supino, agachamento, remada)…">
      <div class="row small muted"><span id="xb-n"></span><span class="spacer"></span><span>Fotos ${sx === 'M' ? 'masculinas' : 'femininas'} (conforme o sexo do aluno)</span></div>
      <div class="xb-grid" id="xb-list"></div>
      <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="xb-add" disabled>Adicionar</button></div>
    </div>`, { wide: true });
  const imgOf = (x) => x.img[sx] || x.img.F || x.img.M || '';
  let limit = 30;
  const draw = () => {
    const q = normTxt($('#xb-q', body).value.trim());
    const list = bank.filter((x) => !q || normTxt(x.name).includes(q));
    $('#xb-n', body).textContent = `${list.length} exercício(s)${list.length > limit ? ` · mostrando ${limit}` : ''}`;
    $('#xb-list', body).innerHTML = list.slice(0, limit).map((x) => `<button class="xb-item ${sel.has(x.name) ? 'sel' : ''}" data-xb="${esc(x.name)}">
      ${imgOf(x) ? `<span class="xb-img"><img src="${esc(photo(imgOf(x)))}" alt="" decoding="async" onerror="this.parentNode.classList.add('err')"></span>` : '<span class="xb-noimg">sem foto</span>'}<span>${esc(x.name)}</span></button>`).join('')
      + (list.length > limit ? '<button class="btn" id="xb-more" style="grid-column:1/-1">Mostrar mais exercícios</button>' : '');
    const more = $('#xb-more', body);
    if (more) more.onclick = () => { limit += 30; draw(); };
    const b = $('#xb-add', body); b.disabled = !sel.size; b.textContent = sel.size ? `Adicionar ${sel.size} exercício(s)` : 'Adicionar';
  };
  $('#xb-list', body).addEventListener('click', (e) => {
    const it = e.target.closest('[data-xb]'); if (!it) return;
    const n = it.dataset.xb; if (sel.has(n)) sel.delete(n); else sel.add(n);
    it.classList.toggle('sel');
    const b = $('#xb-add', body); b.disabled = !sel.size; b.textContent = sel.size ? `Adicionar ${sel.size} exercício(s)` : 'Adicionar';
  });
  $('#xb-q', body).addEventListener('input', () => { limit = 30; draw(); });
  $('#xb-add', body).onclick = () => {
    const w = E.p.workouts[wi];
    bank.filter((x) => sel.has(x.name)).forEach((x) => w.exercises.push(newExercise({
      name: x.name, image: imgOf(x), execution: x.execution, cautions: x.cautions, repsLabel: x.repsLabel,
      sets: '3', reps: x.repsLabel === 'Tempo' ? '30s' : '10-12', rest: '60s',
    })));
    closeModal();
    saveSoon(); rerenderTreinos();
    toast(`${sel.size} exercício(s) adicionado(s)`);
  };
  draw();
  $('#xb-q', body).focus();
};
actions['add-ex'] = (el) => {
  const x = newExercise();
  W(el).exercises.push(x);
  E.open.add(x.id);
  saveSoon(); rerenderTreinos();
  setTimeout(() => { const r = $(`[data-exrow="${x.id}"] input`); if (r) r.focus(); }, 50);
};
actions['dup-ex'] = (el) => {
  const list = W(el).exercises;
  const x = clone(list[+el.dataset.ei]);
  x.id = uid();
  list.splice(+el.dataset.ei + 1, 0, x);
  E.open.add(x.id);
  saveSoon(); rerenderTreinos();
};
actions['del-ex'] = (el) => {
  const list = W(el).exercises;
  const x = list[+el.dataset.ei];
  if (!confirm(`Excluir "${x.name || 'exercício'}"?`)) return;
  list.splice(+el.dataset.ei, 1);
  saveSoon(); rerenderTreinos();
};
actions['mv-ex'] = (el, ev) => { ev.stopPropagation(); move(W(el).exercises, +el.dataset.ei, +el.dataset.d); saveSoon(); rerenderTreinos(); };

function setTargetImage(el, url) {
  const w = W(el);
  if (el.dataset.target === 'cover') w.coverImage = url;
  else {
    const x = w.exercises[+el.dataset.ei];
    x.image = url;
    if (url) x.imageSrc = x.imageSrc || null;
  }
  saveSoon(); rerenderTreinos();
}
actions['img-upload'] = async (el) => {
  const [f] = await pickFile('image/*');
  if (!f) return;
  const src = await readFile(f);
  openCrop({ src, preset: 'full', aspectHint: el.dataset.target === 'ex' ? 'ex' : 'cover', onDone: (url) => setTargetImage(el, url) });
};
actions['img-clear'] = (el) => setTargetImage(el, '');
actions['img-pdf'] = (el) => {
  openPagePicker({
    pdfId: E.p.sourcePdfId,
    title: 'Escolha a página do PDF',
    onPick: async (pdfId, n) => {
      const src = await withBusy('Preparando página…', () => renderPage(pdfId, n, 1800));
      if (!src) return;
      openCrop({ src, preset: el.dataset.target === 'ex' ? 'left' : 'full', onDone: (url) => setTargetImage(el, url) });
    },
  });
};
actions['img-recrop'] = (el) => {
  const x = W(el).exercises[+el.dataset.ei];
  openCrop({ src: x.image, preset: 'full', onDone: (url) => { x.image = url; saveSoon(); rerenderTreinos(); } });
};
actions['import-pages'] = (el) => {
  const w = W(el);
  openPagePicker({
    pdfId: E.p.sourcePdfId,
    multi: true,
    title: `Importar páginas para "${w.name}"`,
    onPickMany: async (pdfId, pages, preset) => {
      const crop = CROP_PRESETS[preset] || CROP_PRESETS.full;
      const added = await withBusy('Importando exercícios…', async (prog) => {
        const out = [];
        for (let i = 0; i < pages.length; i++) {
          prog(i / pages.length, `Página ${pages[i]} (${i + 1} de ${pages.length})`);
          const src = await renderPage(pdfId, pages[i], 1800);
          const img = await compressImage(src, 1400, 0.86, crop);
          let txt = '';
          try { txt = await pageText(pdfId, pages[i]); } catch (e) { /* sem texto */ }
          const x = newExercise({ name: `Exercício (pág. ${pages[i]})`, image: img, execution: txt.slice(0, 600) });
          out.push(x);
        }
        return out;
      });
      if (!added) return;
      w.exercises.push(...added);
      if (E.p.sourcePdfId !== pdfId && !E.p.sourcePdfId) E.p.sourcePdfId = pdfId;
      saveSoon(); rerenderTreinos();
      toast(`${added.length} exercício(s) importados. Complete nome, séries e reps.`);
    },
  });
};

/* ---- Aba 3: Gerar ---- */
function tabGerar() {
  const p = E.p;
  if (p.mode === 'slides') {
    return `
  <div class="section card row">
    <div style="flex:1;min-width:200px"><strong>${(p.slides || []).length} slide(s)</strong><div class="small muted">Confira abaixo. Clique num slide para editar.</div></div>
    <button class="btn primary" data-action="export-pdf">Gerar PDF</button>
  </div>
  <div class="section"><div id="preview" class="preview-list"></div></div>`;
  }
  const st = byId(S.students, p.studentId);
  const warn = [];
  if (!st && !p.isTemplate) warn.push('Nenhum aluno selecionado (aba 1).');
  if (!byId(S.trainers, p.trainerId)) warn.push('Nenhum personal selecionado (aba 1).');
  if (!totalExercises(p)) warn.push('Nenhum exercício cadastrado (aba 2).');
  return `
  <div class="section card row">
    <label class="field" style="min-width:220px"><span>Visual do PDF</span>
      <select id="theme-quick">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${p.theme === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <span class="spacer"></span>
    <button class="btn" data-action="export-pdf">Gerar PDF</button>
    ${p.isTemplate ? '' : `<button class="btn" data-action="send-program" data-id="${esc(p.id)}">Enviar PDF pelo WhatsApp</button><button class="btn primary" data-action="student-access" data-id="${esc(p.id)}">Liberar acesso ao aluno</button>`}
  </div>
  ${warn.length ? `<div class="section card small" style="border-color:#5a4a2c">${warn.map((w) => '⚠ ' + esc(w)).join('<br>')}</div>` : ''}
  <div class="section"><div id="preview" class="preview-list"></div></div>`;
}
document.addEventListener('change', (e) => {
  if (e.target.id === 'theme-quick') { E.p.theme = e.target.value; saveSoon(); renderPreview(); }
});
let previewRO;
async function renderPreview() {
  const box = $('#preview');
  if (!box) return;
  const slides = buildSlides(E.p);
  box.innerHTML = slides.map((s, i) => `<div class="slide-frame editable" data-action="edit-slide" data-i="${i}" title="Clique para editar este slide" ${frameAttrs(s.w || 1334, s.h || 750)}>${s.html}<span class="edit-badge">✎ Editar este slide</span></div><div class="slide-label">${i + 1}. ${esc(s.label)}</div>`).join('');
  E.slideEdits = slides.map((s) => s.edit);
  const scaleAll = () => scaleFrames(box);
  scaleAll();
  if (previewRO) previewRO.disconnect();
  previewRO = new ResizeObserver(scaleAll);
  previewRO.observe(box);
  await document.fonts.ready;
  $$('.slide', box).forEach(fitSlide);
}
actions['edit-slide'] = async (el) => {
  const t = (E.slideEdits || [])[+el.dataset.i];
  if (!t) return;
  await saveSoon.flush();
  if (t.slide) { location.hash = `#/programa/${E.p.id}/slide/${t.slide}`; return; }
  E.tab = t.tab;
  if (t.ex) E.open.add(t.ex);
  history.replaceState(null, '', `#/programa/${E.p.id}/${E.tab}`);
  renderEditor();
  const target = t.ex ? $(`[data-exrow="${t.ex}"]`) : t.wid ? $(`#w-${t.wid}`) : $(`#${t.sec}`);
  if (target) {
    const y = target.getBoundingClientRect().top + window.scrollY - ($('.editor-head') ? $('.editor-head').offsetHeight + 80 : 150);
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    target.style.outline = '2px solid var(--gold)';
    setTimeout(() => { target.style.outline = ''; }, 1800);
  }
};
actions['export-pdf'] = async () => {
  await saveSoon.flush();
  await exportProgramPdf(E.p);
};

/* =========================================================
 * Slides do PDF (1334 x 750, mesmo formato dos PDFs atuais)
 * ======================================================= */
function bgImg(src, ph) {
  return src ? `<div class="bg" style="background-image:url('${esc(photo(src))}')"></div>` : `<div class="ph">${esc(ph)}</div>`;
}
function titleSize(t, base, widthChars) {
  const words = String(t || '').split(/\s+/);
  const longest = Math.max(1, ...words.map((w) => w.length));
  const total = String(t || '').length;
  let fs = base;
  if (longest > widthChars) fs = Math.floor(base * widthChars / longest);
  if (total > widthChars * 3) fs = Math.min(fs, Math.floor(base * 0.72));
  return fs;
}
function buildSlides(p) {
  if (p.mode === 'slides') {
    return (p.slides || []).map((sl, i) => ({ label: `Slide ${i + 1}`, edit: { slide: sl.id }, w: sl.w, h: sl.h, html: pageSlideHTML(sl, p) }));
  }
  const st = byId(S.students, p.studentId) || { name: 'Nome do aluno', photo: '' };
  const tr = byId(S.trainers, p.trainerId);
  const brand = S.settings.brand || '';
  const inc = p.include || {};
  const out = [];
  let edit = { tab: 'dados', sec: 'sec-capa' };
  const add = (cls, label, html) => out.push({ cls, label, html, edit });

  // Capa
  const tfs = titleSize(p.title, 150, 7);
  add('s-cover', 'Capa', `
    <div class="left">
      <div class="kicker">${esc(p.level ? 'Programa ' + p.level : 'Programa de treino')}</div>
      <div class="title bebas" style="font-size:${tfs}px;margin-top:18px">${esc(p.title)}</div>
      ${p.subtitle ? `<div class="subtitle">${esc(p.subtitle)}</div>` : ''}
      <div class="facts">${p.weeks ? `<span>${esc(p.weeks)} semanas</span>` : ''}<span>${esc([p.frequency, p.structure].filter(Boolean).join(' · '))}</span></div>
      ${tr ? `<div class="by">${bgImg(tr.photo, initials(tr.name))}<div><small>Personal Trainer</small><strong>${esc(tr.name)}</strong>${tr.cref ? `<em>CREF ${esc(tr.cref)}</em>` : ''}</div></div>` : ''}
    </div>
    <div class="right">
      <div class="ring">${bgImg(st.photo, initials(st.name))}</div>
      <div class="student-label">Programa exclusivo de</div>
      <div class="student-name">${esc(st.name)}</div>
    </div>`);

  // Personal
  if (inc.trainer && tr) {
    const blocks = [['Formação', tr.formacao], ['Experiência', tr.experiencia], ['Especializações', tr.especializacoes], ['Metodologia', tr.metodologia]]
      .filter(([, v]) => v && v.trim());
    edit = { tab: 'dados', sec: 'sec-pessoas' };
    add('s-trainer', 'Personal', `
      <div class="photo">${bgImg(tr.photo, initials(tr.name))}</div>
      <div class="content" data-fitbox>
        <div class="kicker">Seu personal</div>
        <div class="name bebas" data-shrink="40" style="font-size:${titleSize(tr.name, 76, 18)}px">${esc(tr.name)}</div>
        ${tr.cref ? `<div class="cref">CREF ${esc(tr.cref)}</div>` : ''}
        <div class="blocks">${blocks.map(([h, v]) => `<div class="blk"><h4>${h}</h4><p data-shrink="14">${esc(v)}</p></div>`).join('')}</div>
      </div>`);
  }

  // Visão geral
  if (inc.overview && p.overview && p.overview.trim()) {
    edit = { tab: 'dados', sec: 'sec-conteudo' };
    add('s-text', 'Visão geral', `
      <div class="content" data-fitbox>
        <div class="kicker">Introdução</div><div class="rule"></div>
        <div class="heading bebas">Visão geral do programa</div>
        <div class="body" data-shrink="16">${esc(p.overview)}</div>
        <div class="statboxes">
          ${p.weeks ? `<div class="statbox"><b>${esc(p.weeks)} semanas</b><span>Duração do ciclo</span></div>` : ''}
          ${p.frequency ? `<div class="statbox"><b>${esc(p.frequency)}</b><span>${esc(p.structure || 'Frequência')}</span></div>` : ''}
          <div class="statbox"><b>${totalExercises(p)} exercícios</b><span>${p.workouts.length} treino(s)</span></div>
        </div>
      </div>`);
  }

  // Objetivos e recomendações
  const obj = lines(p.objectives), rec = lines(p.recommendations);
  if (inc.guidelines && (obj.length || rec.length)) {
    edit = { tab: 'dados', sec: 'sec-conteudo' };
    add('s-text', 'Objetivos e recomendações', `
      <div class="content" data-fitbox>
        <div class="kicker">Orientações gerais</div><div class="rule"></div>
        <div class="heading bebas" style="font-size:84px">Objetivos e recomendações</div>
        <div class="cols">
          ${obj.length ? `<div><h3>Objetivos</h3><ul class="list">${obj.map((l) => `<li data-shrink="15">${esc(l)}</li>`).join('')}</ul></div>` : ''}
          ${rec.length ? `<div><h3>Recomendações</h3><ul class="list">${rec.map((l) => `<li data-shrink="15">${esc(l)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </div>`);
  }

  // Aquecimento
  const wu = lines(p.warmup);
  if (inc.warmup && wu.length) {
    edit = { tab: 'dados', sec: 'sec-conteudo' };
    add('s-text', 'Aquecimento', `
      <div class="content" data-fitbox>
        <div class="kicker">Antes de começar</div><div class="rule"></div>
        <div class="heading bebas">Aquecimento padrão</div>
        <div class="steps">${wu.map((l, i) => {
          const k = l.indexOf(':');
          const short = k > 0 && k <= 40;
          const h = short ? l.slice(0, k) : '';
          const d = short ? l.slice(k + 1).trim() : l;
          return `<div class="step"><div class="n">${i + 1}</div><div>${h ? `<h4>${esc(h)}</h4>` : ''}${d ? `<p data-shrink="15" style="${h ? '' : 'margin-top:20px'}">${esc(d)}</p>` : ''}</div></div>`;
        }).join('')}</div>
      </div>`);
  }

  // Escala PSE
  if (inc.pse) {
    const rows = [['1–2', 'Muito leve (aquecimento)'], ['3–4', 'Leve · esforço confortável'], ['5–6', 'Moderado · 4-5 reps em reserva'], ['7', 'Desafiador · 3 reps em reserva'], ['8', 'Forte · 2 reps em reserva'], ['9', 'Muito forte · 1 rep em reserva'], ['10', 'Máximo · falha total']];
    const note = (p.pseNote || '').split('\n');
    edit = { tab: 'dados', sec: 'sec-conteudo' };
    add('s-text s-pse', 'Escala PSE', `
      <div class="content">
        <div class="kicker">Controle da intensidade</div><div class="rule"></div>
        <div class="heading bebas" style="font-size:80px">Escala de percepção de esforço (PSE)</div>
        <table>${rows.map(([v, t]) => `<tr><td class="v">${v}</td><td>${t}</td></tr>`).join('')}</table>
      </div>
      ${p.pseNote ? `<div class="note"><b>${esc(note[0])}</b>${esc(note.slice(1).join('\n').trim())}</div>` : ''}`);
  }

  // Treinos
  p.workouts.forEach((w) => {
    const cover = w.coverImage || (w.exercises.find((x) => x.image) || {}).image;
    edit = { tab: 'treinos', wid: w.id };
    add('s-wcover', w.name || 'Treino', `
      ${cover ? `<div class="img">${bgImg(cover, '')}</div>` : ''}
      <div class="content">
        <div class="big bebas" style="font-size:${titleSize(w.name, 190, 8)}px">${esc(w.name)}</div>
        ${w.focus ? `<div class="focus">${esc(w.focus)}</div>` : ''}
        <div class="count">${w.exercises.length} exercício(s)</div>
        <div class="exlist">${w.exercises.map((x) => `<span>${esc(x.name)}</span>`).join('')}</div>
      </div>`);
    w.exercises.forEach((x, i) => {
      const stats = [['Séries', x.sets], [x.repsLabel || 'Reps', x.reps], ['PSE', x.pse], ['Descanso', fmtRest(x.rest)], ['Cadência', x.cadence], ['Carga', x.load]]
        .filter(([, v]) => v && String(v).trim());
      const txt = [['Execução', x.execution], ['Cuidados', x.cautions], ['Observações', x.notes]].filter(([, v]) => v && v.trim());
      edit = { tab: 'treinos', ex: x.id };
      add('s-ex', `${w.name} · ${pad2(i + 1)} ${x.name}`, `
        <div class="img">${bgImg(x.image, 'Sem imagem')}</div>
        <div class="panel" data-fitbox>
          <div class="head"><div class="num">${pad2(i + 1)}</div><div class="name bebas" data-shrink="38" style="font-size:${titleSize(x.name, 72, 13)}px">${esc(x.name)}</div></div>
          ${x.muscles ? `<div class="pill">${esc(x.muscles)}</div>` : ''}
          ${stats.length ? `<div class="stats">${stats.map(([k, v]) => `<div class="stat"><small>${esc(k)}</small><b class="${String(v).length > 6 ? 'sm' : ''}">${esc(v)}</b></div>`).join('')}</div>` : ''}
          <div class="txt">${txt.map(([k, v]) => `<div><h4>${k}</h4><p data-shrink="13">${esc(v)}</p></div>`).join('')}</div>
          <div class="endrule"></div>
        </div>`);
    });
  });

  // Final
  if (inc.closing) {
    edit = { tab: 'dados', sec: 'sec-conteudo' };
    add('s-close', 'Página final', `
      <div class="content">
        <div class="kicker">${esc(p.title)}</div>
        <div class="big bebas" style="margin-top:16px">Bom treino, ${esc(st.name.split(' ')[0])}!</div>
        ${p.closingMessage ? `<div class="msg">${esc(p.closingMessage)}</div>` : ''}
        <div class="people">
          <div>${bgImg(st.photo, initials(st.name))}<small>Aluno(a)</small><strong>${esc(st.name)}</strong></div>
          ${tr ? `<div>${bgImg(tr.photo, initials(tr.name))}<small>Personal Trainer</small><strong>${esc(tr.name)}</strong></div>` : ''}
        </div>
      </div>`);
  }

  const total = out.length;
  return out.map((s, i) => {
    const foot = /s-cover|s-ex|s-wcover/.test(s.cls) ? '' : `<div class="footer"><span>${esc(brand)}</span><span>${pad2(i + 1)}/${pad2(total)}</span></div>`;
    return { label: s.label, edit: s.edit, html: `<div class="slide t-${esc(p.theme || 'navy')} ${s.cls}">${s.html}${foot}</div>` };
  });
}
/** Reduz fontes até o conteúdo caber na página. */
function fitSlide(root) {
  $$('[data-fitbox]', root).forEach((box) => {
    const nodes = $$('[data-shrink]', box);
    let guard = 0;
    while (box.scrollHeight > box.clientHeight + 1 && guard++ < 40) {
      let changed = false;
      nodes.forEach((n) => {
        const fs = parseFloat(getComputedStyle(n).fontSize);
        const min = +n.dataset.shrink || 12;
        if (fs > min) { n.style.fontSize = Math.max(min, fs * 0.93) + 'px'; changed = true; }
      });
      if (!changed) break;
    }
  });
  $$('.bebas', root).forEach((n) => {
    let fs = parseFloat(getComputedStyle(n).fontSize);
    let g = 0;
    while (n.scrollWidth > n.clientWidth + 1 && fs > 24 && g++ < 30) { fs *= 0.94; n.style.fontSize = fs + 'px'; }
  });
}

async function exportProgramPdf(p) {
  const out = await buildProgramPdf(p);
  if (out) showSendModal(p, out);
}
async function buildProgramPdf(p) {
  const slides = buildSlides(p);
  const st = byId(S.students, p.studentId);
  const fileName = `${slug(p.title)}${st ? '-' + slug(st.name) : ''}.pdf`;
  const result = await withBusy('Gerando PDF…', async (prog) => {
    await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const dim = (sl) => [sl.w || 1334, sl.h || 750];
    const orient = (w, h) => (w >= h ? 'landscape' : 'portrait');
    const [w0, h0] = dim(slides[0] || {});
    const pdf = new jsPDF({ orientation: orient(w0, h0), unit: 'pt', format: [w0, h0], compress: true });
    const stage = $('#render-stage');
    let thumb = '';
    for (let i = 0; i < slides.length; i++) {
      prog(i / slides.length, `Página ${i + 1} de ${slides.length}`);
      stage.innerHTML = slides[i].html;
      const el = stage.firstElementChild;
      fitSlide(el);
      await sleep(30);
      const [W, H] = dim(slides[i]);
      if (el.tagName !== 'DIV') throw new Error('slide inválido');
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#000000', logging: false, width: W, height: H, windowWidth: W, windowHeight: H, scrollX: 0, scrollY: 0 });
      if (i > 0) pdf.addPage([W, H], orient(W, H));
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, W, H, undefined, 'FAST');
      if (i === 0) {
        const t = document.createElement('canvas');
        t.width = 480; t.height = Math.round(480 * H / W);
        t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height);
        thumb = t.toDataURL('image/jpeg', 0.8);
      }
    }
    stage.innerHTML = '';
    prog(1, 'Salvando na biblioteca…');
    const blob = pdf.output('blob');
    // guarda a última versão gerada deste programa na biblioteca de PDFs
    const id = 'gen-' + p.id;
    await DB.put('pdfblobs', { id, blob });
    docCache.delete(id);
    [...pageCache.keys()].filter((k) => k.startsWith(id + ':')).forEach((k) => pageCache.delete(k));
    await saveEntity('pdfs', { id, name: fileName.replace(/\.pdf$/, ''), size: blob.size, pages: slides.length, thumb, generated: true, programId: p.id, createdAt: Date.now(), tags: { ...(p.tags || {}) }, tagsChecked: true });
    return blob;
  });
  if (!result) return null;
  return { blob: result, fileName, pages: slides.length };
}

/* =========================================================
 * Modais, carregamento
 * ======================================================= */
function openModal(title, body, { wide = false } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal" style="${wide ? '' : 'width:min(620px,100%)'}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="btn icon sm" data-action="close-modal" aria-label="Fechar">✕</button></div>
    <div class="modal-body">${body}</div></div></div>`;
  $('.modal-backdrop', root).addEventListener('click', (e) => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
  return $('.modal-body', root);
}
let modalToken = 0;
function closeModal() { modalToken++; $('#modal-root').innerHTML = ''; }
actions['close-modal'] = closeModal;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal-root').innerHTML) closeModal(); });

async function withBusy(msg, fn) {
  const el = document.createElement('div');
  el.className = 'busy';
  el.innerHTML = `<div class="box"><strong>${esc(msg)}</strong><div class="small muted" id="busy-sub" style="margin-top:6px">&nbsp;</div><div class="bar"><i></i></div></div>`;
  document.body.appendChild(el);
  const prog = (f, sub) => { $('i', el).style.width = Math.round(f * 100) + '%'; if (sub) $('#busy-sub', el).textContent = sub; };
  try {
    return await fn(prog);
  } catch (e) {
    console.error(e);
    toast('Erro: ' + (e && e.message ? e.message : 'falha inesperada'));
    return null;
  } finally {
    el.remove();
  }
}

/* =========================================================
 * Programas em slides: importar páginas do PDF e editar cada slide
 * ======================================================= */
const FONTS = { Inter: 'Inter, sans-serif', Oswald: 'Oswald, sans-serif', Bebas: "'Bebas Neue', Oswald, sans-serif" };
const FONT_LABELS = { Inter: 'Inter (texto)', Oswald: 'Oswald (subtítulo)', Bebas: 'Bebas Neue (título)' };
function slideSize(w, h) {
  return w >= h ? { w: 1334, h: Math.round(1334 * h / w) } : { w: 800, h: Math.round(800 * h / w) };
}
const blobUrls = new WeakMap();
function blobURL(b) {
  if (!b) return '';
  if (typeof b === 'string') return b;
  let u = blobUrls.get(b);
  if (!u) { u = URL.createObjectURL(b); blobUrls.set(b, u); }
  return u;
}
async function renderPageForSlide(pdfId, n) {
  const doc = await getPdfDoc(pdfId);
  const page = await doc.getPage(n);
  const vp1 = page.getViewport({ scale: 1 });
  const size = slideSize(vp1.width, vp1.height);
  const vp = page.getViewport({ scale: (size.w * 1.3) / vp1.width });
  const cv = document.createElement('canvas');
  cv.width = Math.round(vp.width);
  cv.height = Math.round(vp.height);
  await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  const bg = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85));
  return { bg, w: size.w, h: size.h };
}
function newSlide(over = {}) {
  return { id: uid(), w: 1334, h: 750, bg: null, bgColor: '#0b1220', layers: [], ...over };
}
async function importPagesAsSlides(pdfId, pages, prog) {
  const out = [];
  for (let i = 0; i < pages.length; i++) {
    prog(i / pages.length, `Página ${pages[i]} (${i + 1} de ${pages.length})`);
    const r = await renderPageForSlide(pdfId, pages[i]);
    out.push(newSlide({ bg: r.bg, w: r.w, h: r.h, source: { pdfId, page: pages[i] } }));
  }
  return out;
}
async function createSlideProgram(pdfId, pages) {
  const meta = byId(S.pdfs, pdfId);
  if (!pages) pages = Array.from({ length: meta.pages }, (_, i) => i + 1);
  const slides = await withBusy('Importando slides…', (prog) => importPagesAsSlides(pdfId, pages, prog));
  if (!slides) return;
  const p = newProgram({ mode: 'slides', title: pdfTitle(meta), sourcePdfId: pdfId, tags: { ...(meta.tags || {}) }, slides, workouts: [] });
  await saveEntity('programs', p);
  location.hash = `#/programa/${p.id}/slides`;
  setTimeout(() => toast(`${slides.length} slide(s) importados. Clique num slide para editar.`), 300);
}
async function addSlidesToProgram(p, pdfId, pages) {
  const slides = await withBusy('Importando slides…', (prog) => importPagesAsSlides(pdfId, pages, prog));
  if (!slides) return false;
  p.slides = [...(p.slides || []), ...slides];
  await saveEntity('programs', p);
  toast(`${slides.length} slide(s) adicionados a "${p.title}"`);
  return true;
}

/* ---- Variáveis e camadas ---- */
function fillVars(text, p) {
  const st = byId(S.students, p.studentId), tr = byId(S.trainers, p.trainerId);
  const v = {
    aluno: st ? st.name : 'Nome do aluno', primeiro_nome: st ? st.name.split(' ')[0] : 'Aluno',
    personal: tr ? tr.name : 'Nome do personal', cref: tr && tr.cref ? 'CREF ' + tr.cref : '', programa: p.title || '',
  };
  return String(text || '').replace(/\{(aluno|primeiro_nome|personal|cref|programa)\}/g, (m, k) => v[k]);
}
function layerSrc(l, p) {
  if (l.src === '@aluno') { const st = byId(S.students, p.studentId); return st && st.photo; }
  if (l.src === '@personal') { const tr = byId(S.trainers, p.trainerId); return tr && tr.photo; }
  return l.src;
}
function layerHTML(l, p, selId) {
  let st = `left:${l.x}px;top:${l.y}px;width:${l.w}px;height:${l.h}px;`;
  let inner = '';
  if (l.type === 'rect') {
    st += `background:${l.fill};opacity:${l.opacity ?? 1};border-radius:${l.radius || 0}px;`;
  } else if (l.type === 'image') {
    const src = layerSrc(l, p);
    const rad = l.round ? '50%' : (l.radius || 0) + 'px';
    st += `border-radius:${rad};${l.borderW ? `border:${l.borderW}px solid ${l.borderColor || '#d2a961'};` : ''}`;
    inner = src ? `<div class="bg" style="background-image:url('${esc(src)}');border-radius:${rad}"></div>`
      : `<div class="ly-ph" style="border-radius:${rad}">${l.src === '@aluno' ? 'Foto do aluno' : l.src === '@personal' ? 'Foto do personal' : 'Imagem'}</div>`;
  } else {
    st += `color:${l.color};font-family:${FONTS[l.font] || FONTS.Inter};font-size:${l.size}px;font-weight:${l.bold ? 700 : 400};text-align:${l.align || 'left'};`
      + `letter-spacing:${l.spacing || 0}px;${l.upper ? 'text-transform:uppercase;' : ''}${l.bgOn ? `background:${l.fill};` : ''}`;
    inner = esc(fillVars(l.text, p));
  }
  const sel = selId === l.id;
  const handles = sel ? ['nw', 'ne', 'sw', 'se'].map((h) => `<span class="lh lh-${h}" data-h="${h}"></span>`).join('') : '';
  return `<div class="ly ly-${l.type}${sel ? ' sel' : ''}" data-lid="${esc(l.id)}" style="${st}">${inner}${handles}</div>`;
}
function pageSlideHTML(s, p, selId) {
  const bg = blobURL(s.bg) || s.bgUrl || '';
  return `<div class="slide sp" style="width:${s.w}px;height:${s.h}px;background:${esc(s.bgColor || '#000')}">`
    + (bg ? `<div class="bg sp-bg" style="background-image:url('${bg}')"></div>` : '')
    + (s.layers || []).map((l) => layerHTML(l, p, selId)).join('') + '</div>';
}
function scaleFrames(root) {
  $$('.slide-frame', root).forEach((f) => f.style.setProperty('--k', f.clientWidth / (+f.dataset.w || 1334)));
}
function frameAttrs(w, h) {
  return `data-w="${w}" style="aspect-ratio:${w}/${h};${h > w ? 'max-width:420px;' : ''}"`;
}

/* ---- Aba Slides ---- */
function tabSlides() {
  const p = E.p;
  const n = (p.slides || []).length;
  return `
  <div class="section card row">
    <div style="flex:1;min-width:200px"><strong>${n} slide(s)</strong><div class="small muted">Clique num slide para editar. Use as setas para mudar a ordem.</div></div>
    <button class="btn" data-action="slides-add-pdf">+ Slides de um PDF</button>
    <button class="btn" data-action="slides-add-blank">+ Slide em branco</button>
  </div>
  ${n ? `<div class="slides-grid">${p.slides.map((s, i) => `
    <div class="slide-card">
      <div class="slide-frame editable" data-action="open-slide" data-id="${esc(s.id)}" ${frameAttrs(s.w, s.h)}>${pageSlideHTML(s, p)}<span class="edit-badge">✎ Editar</span></div>
      <div class="row" style="gap:4px;margin-top:6px">
        <span class="small muted" style="min-width:28px">${i + 1}</span>
        <button class="btn icon sm" data-action="slide-mv" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Mover para antes">←</button>
        <button class="btn icon sm" data-action="slide-mv" data-i="${i}" data-d="1" ${i === n - 1 ? 'disabled' : ''} title="Mover para depois">→</button>
        <span class="spacer"></span>
        <button class="btn sm" data-action="slide-dup" data-i="${i}">Duplicar</button>
        <button class="btn sm danger" data-action="slide-del" data-i="${i}" title="Excluir slide">✕</button>
      </div>
    </div>`).join('')}</div>`
    : '<div class="empty">Nenhum slide. Adicione slides de um PDF ou um slide em branco.</div>'}
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="gerar">Próximo: gerar PDF →</button></div>`;
}
function rerenderSlidesTab() {
  const y = window.scrollY;
  $('#ed-body').innerHTML = tabSlides();
  scaleFrames($('#ed-body'));
  window.scrollTo(0, y);
}
actions['open-slide'] = (el) => { location.hash = `#/programa/${E.p.id}/slide/${el.dataset.id}`; };
actions['slide-mv'] = (el) => { move(E.p.slides, +el.dataset.i, +el.dataset.d); saveSoon(); rerenderSlidesTab(); };
actions['slide-dup'] = (el) => {
  const s = structuredClone(E.p.slides[+el.dataset.i]);
  s.id = uid();
  s.layers.forEach((l) => { l.id = uid(); });
  E.p.slides.splice(+el.dataset.i + 1, 0, s);
  saveSoon(); rerenderSlidesTab();
};
actions['slide-del'] = (el) => {
  if (!confirm('Excluir este slide?')) return;
  E.p.slides.splice(+el.dataset.i, 1);
  saveSoon(); rerenderSlidesTab();
};
actions['slides-add-blank'] = () => {
  const last = E.p.slides[E.p.slides.length - 1];
  const s = newSlide({ w: last ? last.w : 1334, h: last ? last.h : 750 });
  E.p.slides.push(s);
  saveSoon();
  location.hash = `#/programa/${E.p.id}/slide/${s.id}`;
};
actions['slides-add-pdf'] = () => {
  openPagePicker({
    pdfId: E.p.sourcePdfId, multi: true, slides: true, title: `Adicionar slides a "${E.p.title}"`,
    onPickMany: async (pdfId, pages) => {
      await saveSoon.flush();
      if (await addSlidesToProgram(E.p, pdfId, pages)) rerenderSlidesTab();
    },
  });
};

/* ---- Editor de slide ---- */
const SE = { sid: null, sel: null, undo: [], eyedrop: null, bgCanvas: null, bgFor: null };
const curSlide = () => (E.p.slides || []).find((s) => s.id === SE.sid);
const curLayer = () => { const s = curSlide(); return s && s.layers.find((l) => l.id === SE.sel); };
function viewSlideEditor(pid, sid) {
  const p = byId(S.programs, pid);
  if (!p || !(p.slides || []).some((s) => s.id === sid)) { location.hash = pid ? `#/programa/${pid}/slides` : '#/'; return; }
  E.p = p;
  E.tab = 'slides';
  if (SE.sid !== sid) Object.assign(SE, { sid, sel: null, undo: [], eyedrop: null });
  leaveHook = () => saveSoon.flush();
  renderSlideEditor();
}
function renderSlideEditor() {
  const p = E.p, s = curSlide();
  const i = p.slides.indexOf(s), n = p.slides.length;
  const prev = p.slides[i - 1], next = p.slides[i + 1];
  app.innerHTML = `
    <div class="editor-head se-head">
      <div class="row">
        <a class="btn ghost sm" href="#/programa/${esc(p.id)}/slides">← Todos os slides</a>
        <span class="small muted">Slide ${i + 1} de ${n} · ${esc(p.title)}</span>
        <span class="spacer"></span>
        ${prev ? `<a class="btn sm" href="#/programa/${esc(p.id)}/slide/${esc(prev.id)}">‹ Anterior</a>` : ''}
        ${next ? `<a class="btn sm" href="#/programa/${esc(p.id)}/slide/${esc(next.id)}">Próximo ›</a>` : ''}
        <button class="btn sm" data-action="se-undo" id="se-undo">↶ Desfazer</button>
        <span id="save-state" class="save-state ok">Salvo ✓</span>
      </div>
      <div class="row se-tools">
        <button class="btn sm" data-action="se-add" data-kind="cover" title="Coloque sobre um texto antigo para escondê-lo">▭ Cobrir texto</button>
        <button class="btn sm" data-action="se-add" data-kind="text">T Texto</button>
        <button class="btn sm" data-action="se-add" data-kind="image">▣ Imagem</button>
        <button class="btn sm" data-action="se-add" data-kind="photo-aluno">◉ Foto do aluno</button>
        <button class="btn sm" data-action="se-add" data-kind="name-aluno">Nome do aluno</button>
        <button class="btn sm" data-action="se-add" data-kind="photo-personal">◉ Foto do personal</button>
        <button class="btn sm" data-action="se-add" data-kind="name-personal">Nome do personal</button>
      </div>
    </div>
    <div class="se-layout">
      <div class="se-stage-col">
        <div class="slide-frame se-stage" id="se-stage" ${frameAttrs(s.w, s.h)}></div>
        <p class="small muted" id="se-hint" style="margin:8px 0 0">Toque num elemento para selecionar. Arraste para mover e use os cantos para redimensionar.</p>
      </div>
      <div class="card se-panel" id="se-panel"></div>
    </div>`;
  renderStage();
  renderPanel();
  scaleFrames(app);
  new ResizeObserver(() => scaleFrames(app)).observe($('#se-stage'));
}
function renderStage() {
  const st = $('#se-stage');
  if (!st) return;
  st.innerHTML = pageSlideHTML(curSlide(), E.p, SE.sel);
  st.classList.toggle('eyedrop', !!SE.eyedrop);
  const u = $('#se-undo');
  if (u) u.disabled = !SE.undo.length;
}
function refreshLayer(l) {
  const el = $(`#se-stage [data-lid="${l.id}"]`);
  if (el) el.outerHTML = layerHTML(l, E.p, SE.sel);
}
function pushUndo() {
  const s = curSlide();
  SE.undo.push(structuredClone({ layers: s.layers, bg: s.bg, bgColor: s.bgColor }));
  if (SE.undo.length > 40) SE.undo.shift();
  const u = $('#se-undo');
  if (u) u.disabled = false;
}
actions['se-undo'] = () => {
  const snap = SE.undo.pop();
  if (!snap) return;
  Object.assign(curSlide(), snap);
  if (SE.sel && !curLayer()) SE.sel = null;
  saveSoon(); renderStage(); renderPanel();
};

/* conta-gotas: lê a cor do fundo (imagem da página) */
async function bgCanvas() {
  const s = curSlide();
  if (SE.bgFor === s.bg && SE.bgCanvas) return SE.bgCanvas;
  const cv = document.createElement('canvas');
  cv.width = s.w; cv.height = s.h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = s.bgColor || '#000';
  ctx.fillRect(0, 0, s.w, s.h);
  if (s.bg) { const img = await loadImage(blobURL(s.bg)); ctx.drawImage(img, 0, 0, s.w, s.h); }
  SE.bgCanvas = cv; SE.bgFor = s.bg;
  return cv;
}
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
async function sampleColor(x, y) {
  const cv = await bgCanvas();
  const s = curSlide();
  const cx = Math.min(Math.max(1, Math.round(x)), s.w - 2), cy = Math.min(Math.max(1, Math.round(y)), s.h - 2);
  const d = cv.getContext('2d').getImageData(cx - 1, cy - 1, 3, 3).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  return hex(r / 9, g / 9, b / 9);
}
/** Cor mais provável do fundo ao redor de uma área (para cobrir texto). */
async function surroundColor(x, y, w, h) {
  const pts = [[x - 4, y + h / 2], [x + w + 4, y + h / 2], [x + w / 2, y - 4], [x + w / 2, y + h + 4], [x - 4, y - 4], [x + w + 4, y + h + 4]];
  const cols = await Promise.all(pts.map(([a, b]) => sampleColor(a, b)));
  const lum = (c) => parseInt(c.slice(1, 3), 16) * 0.3 + parseInt(c.slice(3, 5), 16) * 0.59 + parseInt(c.slice(5, 7), 16) * 0.11;
  cols.sort((a, b) => lum(a) - lum(b));
  return cols[Math.floor(cols.length / 2)];
}

actions['se-add'] = async (el) => {
  const s = curSlide();
  const W = s.w, H = s.h, k = el.dataset.kind;
  pushUndo();
  let l;
  if (k === 'cover') {
    l = { type: 'rect', x: Math.round(W * 0.3), y: Math.round(H * 0.4), w: Math.round(W * 0.35), h: Math.round(H * 0.1), radius: 0, opacity: 1 };
    l.fill = await surroundColor(l.x, l.y, l.w, l.h);
  } else if (k === 'text' || k === 'name-aluno' || k === 'name-personal') {
    const big = k !== 'text';
    l = {
      type: 'text', x: Math.round(W * 0.08), y: Math.round(H * (big ? 0.7 : 0.4)), w: Math.round(W * 0.5), h: Math.round(H * 0.12),
      text: k === 'name-aluno' ? '{aluno}' : k === 'name-personal' ? '{personal}' : 'Novo texto',
      font: 'Inter', size: Math.round(H * (big ? 0.065 : 0.05)), color: '#ffffff', bold: true, align: 'left', upper: false, spacing: 0, bgOn: false, fill: '#000000',
    };
  } else {
    const side = Math.round(H * 0.4);
    l = { type: 'image', x: Math.round(W * 0.6), y: Math.round(H * 0.25), w: side, h: side, round: k !== 'image', radius: 0, borderW: k !== 'image' ? 6 : 0, borderColor: '#d2a961',
      src: k === 'photo-aluno' ? '@aluno' : k === 'photo-personal' ? '@personal' : '' };
  }
  l.id = uid();
  s.layers.push(l);
  SE.sel = l.id;
  saveSoon(); renderStage(); renderPanel();
  if (k === 'image') pickLayerImage(l);
  if ((k === 'photo-aluno' && !layerSrc(l, E.p)) || (k === 'photo-personal' && !layerSrc(l, E.p))) {
    toast(`Cadastre a foto do ${k === 'photo-aluno' ? 'aluno' : 'personal'} na aba "Aluno e personal".`);
  }
};
async function pickLayerImage(l) {
  const [f] = await pickFile('image/*');
  if (!f) return;
  const src = await readFile(f);
  openCrop({ src, preset: 'full', onDone: (url) => { pushUndo(); l.src = url; const img = new Image(); img.onload = () => { if (!l.round) { l.h = Math.round(l.w * img.height / img.width); } saveSoon(); renderStage(); renderPanel(); }; img.src = url; } });
}

/* arrastar / redimensionar */
let seDrag = null;
document.addEventListener('pointerdown', async (e) => {
  const stage = e.target.closest('#se-stage');
  if (!stage) return;
  const k = stage.clientWidth / curSlide().w;
  const r = stage.getBoundingClientRect();
  const px = (e.clientX - r.left) / k, py = (e.clientY - r.top) / k;
  if (SE.eyedrop) {
    e.preventDefault();
    const l = curLayer();
    const c = await sampleColor(px, py);
    if (l) { pushUndo(); if (SE.eyedrop === 'color') l.color = c; else { l.fill = c; if (l.type === 'text') l.bgOn = true; } saveSoon(); }
    SE.eyedrop = null;
    renderStage(); renderPanel();
    return;
  }
  const lyEl = e.target.closest('.ly');
  if (!lyEl) { if (SE.sel) { SE.sel = null; renderStage(); renderPanel(); } return; }
  e.preventDefault();
  const id = lyEl.dataset.lid;
  if (SE.sel !== id) { SE.sel = id; renderStage(); renderPanel(); }
  const l = curLayer();
  seDrag = { h: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, o: { x: l.x, y: l.y, w: l.w, h: l.h }, k, moved: false };
});
document.addEventListener('pointermove', (e) => {
  if (!seDrag) return;
  const l = curLayer();
  if (!l) return;
  const dx = (e.clientX - seDrag.sx) / seDrag.k, dy = (e.clientY - seDrag.sy) / seDrag.k;
  if (!seDrag.moved) { if (Math.abs(dx) + Math.abs(dy) < 2) return; pushUndo(); seDrag.moved = true; }
  const o = seDrag.o, MIN = 12, h = seDrag.h;
  if (h === 'move') { l.x = Math.round(o.x + dx); l.y = Math.round(o.y + dy); } else {
    let { x, y, w, h: hh } = o;
    if (h.includes('w')) { x = Math.min(o.x + dx, o.x + o.w - MIN); w = o.x + o.w - x; }
    if (h.includes('e')) w = Math.max(MIN, o.w + dx);
    if (h.includes('n')) { y = Math.min(o.y + dy, o.y + o.h - MIN); hh = o.y + o.h - y; }
    if (h.includes('s')) hh = Math.max(MIN, o.h + dy);
    if (l.type === 'image' && l.round) { const side = Math.max(w, hh); w = side; hh = side; }
    Object.assign(l, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) });
  }
  const el = $(`#se-stage [data-lid="${l.id}"]`);
  if (el) Object.assign(el.style, { left: l.x + 'px', top: l.y + 'px', width: l.w + 'px', height: l.h + 'px' });
});
document.addEventListener('pointerup', () => {
  if (!seDrag) return;
  const moved = seDrag.moved;
  seDrag = null;
  if (moved) { saveSoon(); renderStage(); }
});
document.addEventListener('keydown', (e) => {
  if (!SE.sel || !$('#se-stage') || e.target.closest('input,textarea,select')) return;
  const l = curLayer();
  if (!l) return;
  const step = e.shiftKey ? 10 : 1;
  const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
  if (mv) { e.preventDefault(); pushUndo(); l.x += mv[0]; l.y += mv[1]; refreshLayer(l); saveSoon(); }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); actions['se-del'](); }
});

/* painel de propriedades */
function renderPanel() {
  const box = $('#se-panel');
  if (!box) return;
  const l = curLayer();
  const s = curSlide();
  if (!l) {
    box.innerHTML = `
      <h3>Como editar este slide</h3>
      <ol class="small se-help">
        <li><b>Trocar um texto do slide:</b> clique em <b>▭ Cobrir texto</b> e posicione a caixa sobre o texto antigo (a cor do fundo é copiada sozinha). Depois clique em <b>T Texto</b> e digite o novo.</li>
        <li><b>Foto e nome do aluno ou do personal:</b> use os botões da barra. Eles puxam a foto e o nome cadastrados e mudam sozinhos se você trocar o aluno.</li>
        <li><b>Mover e ajustar:</b> arraste o elemento; use os cantos para mudar o tamanho. No computador, as setas do teclado fazem ajuste fino.</li>
      </ol>
      <div class="stack" style="gap:10px;margin-top:12px">
        <div class="row"><button class="btn sm" data-action="se-bg-upload">Trocar imagem de fundo</button>${s.bg ? '<button class="btn sm ghost" data-action="se-bg-clear">Remover fundo</button>' : ''}</div>
        <label class="row small">Cor de fundo <input type="color" data-sp="bgColor" value="${esc(s.bgColor || '#000000')}"></label>
      </div>`;
  } else {
    const common = `
      <div class="row" style="gap:6px;margin-top:14px">
        <button class="btn sm" data-action="se-front" title="Trazer para frente">⬆ Frente</button>
        <button class="btn sm" data-action="se-back" title="Enviar para trás">⬇ Trás</button>
        <button class="btn sm" data-action="se-dupl">Duplicar</button>
        <button class="btn sm danger" data-action="se-del">Excluir</button>
      </div>`;
    if (l.type === 'text') {
      box.innerHTML = `
        <h3>Texto</h3>
        <label class="field"><span>Conteúdo</span><textarea data-lp="text" rows="3">${esc(l.text)}</textarea>
          <span class="hint">Variáveis: {aluno} {primeiro_nome} {personal} {cref} {programa}</span></label>
        <div class="grid two" style="gap:10px">
          <label class="field"><span>Fonte</span><select data-lp="font">${Object.entries(FONT_LABELS).map(([k, v]) => `<option value="${k}" ${l.font === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field"><span>Tamanho</span><input type="number" min="8" max="400" data-lp="size" value="${l.size}"></label>
        </div>
        <div class="row" style="gap:12px;margin-top:10px">
          <label class="row small">Cor <input type="color" data-lp="color" value="${esc(l.color)}"></label>
          <button class="btn sm" data-action="se-eyedrop" data-target="color">Conta-gotas</button>
          <label class="row small"><input type="checkbox" data-lp="bold" ${l.bold ? 'checked' : ''}> Negrito</label>
          <label class="row small"><input type="checkbox" data-lp="upper" ${l.upper ? 'checked' : ''}> MAIÚSCULAS</label>
        </div>
        <div class="row" style="gap:12px;margin-top:10px">
          <label class="row small">Alinhar <select data-lp="align" style="width:auto">${[['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']].map(([v, t]) => `<option value="${v}" ${l.align === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="row small">Espaçamento <input type="number" data-lp="spacing" value="${l.spacing || 0}" style="width:70px"></label>
        </div>
        <div class="row" style="gap:12px;margin-top:10px">
          <label class="row small"><input type="checkbox" data-lp="bgOn" ${l.bgOn ? 'checked' : ''}> Fundo atrás do texto</label>
          <input type="color" data-lp="fill" value="${esc(l.fill || '#000000')}">
          <button class="btn sm" data-action="se-eyedrop" data-target="fill">Conta-gotas</button>
        </div>${common}`;
    } else if (l.type === 'rect') {
      box.innerHTML = `
        <h3>Caixa (cobrir texto)</h3>
        <p class="small muted" style="margin-top:0">Posicione sobre o texto antigo. Se a cor não ficar igual ao fundo, use o conta-gotas e clique no fundo do slide.</p>
        <div class="row" style="gap:12px">
          <label class="row small">Cor <input type="color" data-lp="fill" value="${esc(l.fill)}"></label>
          <button class="btn sm" data-action="se-eyedrop" data-target="fill">Conta-gotas</button>
          <button class="btn sm" data-action="se-autocolor">Cor automática</button>
        </div>
        <label class="field" style="margin-top:10px"><span>Opacidade</span><input type="range" min="0.1" max="1" step="0.05" data-lp="opacity" value="${l.opacity ?? 1}"></label>
        <label class="field"><span>Cantos arredondados</span><input type="range" min="0" max="80" step="1" data-lp="radius" value="${l.radius || 0}"></label>${common}`;
    } else {
      box.innerHTML = `
        <h3>Imagem</h3>
        <label class="field"><span>Origem</span><select data-lp="srcKind">
          <option value="@aluno" ${l.src === '@aluno' ? 'selected' : ''}>Foto do aluno (cadastro)</option>
          <option value="@personal" ${l.src === '@personal' ? 'selected' : ''}>Foto do personal (cadastro)</option>
          <option value="own" ${l.src !== '@aluno' && l.src !== '@personal' ? 'selected' : ''}>Imagem própria</option></select></label>
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn sm" data-action="se-img-upload">Enviar imagem</button><button class="btn sm" data-action="se-img-pdf">Recortar de um PDF</button></div>
        <div class="row" style="gap:12px;margin-top:10px">
          <label class="row small"><input type="checkbox" data-lp="round" ${l.round ? 'checked' : ''}> Redonda</label>
          <label class="row small">Borda <input type="number" min="0" max="40" data-lp="borderW" value="${l.borderW || 0}" style="width:64px"></label>
          <input type="color" data-lp="borderColor" value="${esc(l.borderColor || '#d2a961')}">
        </div>
        <label class="field" style="margin-top:10px"><span>Cantos arredondados</span><input type="range" min="0" max="120" data-lp="radius" value="${l.radius || 0}"></label>${common}`;
    }
  }
  let undoArmed = false;
  $$('[data-lp]', box).forEach((inp) => {
    const prop = inp.dataset.lp;
    const ev = inp.type === 'checkbox' || inp.tagName === 'SELECT' || inp.type === 'color' ? 'change' : 'input';
    inp.addEventListener('focus', () => { undoArmed = false; });
    const apply = () => {
      const lay = curLayer();
      if (!lay) return;
      if (!undoArmed) { pushUndo(); undoArmed = true; }
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (['size', 'spacing', 'borderW', 'radius'].includes(prop)) v = +v || 0;
      if (prop === 'opacity') v = +v;
      if (prop === 'srcKind') { if (v === 'own') { lay.src = ''; pickLayerImage(lay); } else lay.src = v; renderPanel(); }
      else lay[prop] = v;
      if (prop === 'round' && v) { const side = Math.max(lay.w, lay.h); lay.w = side; lay.h = side; }
      refreshLayer(lay);
      saveSoon();
    };
    inp.addEventListener(ev, apply);
    if (inp.type === 'color') inp.addEventListener('input', apply);
  });
  $$('[data-sp]', box).forEach((inp) => inp.addEventListener('input', () => { pushUndo(); curSlide()[inp.dataset.sp] = inp.value; SE.bgFor = null; renderStage(); saveSoon(); }));
}
actions['se-del'] = () => {
  const s = curSlide();
  if (!SE.sel) return;
  pushUndo();
  s.layers = s.layers.filter((l) => l.id !== SE.sel);
  SE.sel = null;
  saveSoon(); renderStage(); renderPanel();
};
actions['se-dupl'] = () => {
  const s = curSlide(), l = curLayer();
  pushUndo();
  const c = { ...structuredClone(l), id: uid(), x: l.x + 20, y: l.y + 20 };
  s.layers.push(c);
  SE.sel = c.id;
  saveSoon(); renderStage(); renderPanel();
};
actions['se-front'] = () => { const s = curSlide(), l = curLayer(); pushUndo(); s.layers = [...s.layers.filter((x) => x !== l), l]; saveSoon(); renderStage(); };
actions['se-back'] = () => { const s = curSlide(), l = curLayer(); pushUndo(); s.layers = [l, ...s.layers.filter((x) => x !== l)]; saveSoon(); renderStage(); };
actions['se-eyedrop'] = (el) => {
  SE.eyedrop = el.dataset.target;
  renderStage();
  toast('Clique no fundo do slide para copiar a cor');
};
actions['se-autocolor'] = async () => {
  const l = curLayer();
  pushUndo();
  l.fill = await surroundColor(l.x, l.y, l.w, l.h);
  refreshLayer(l); renderPanel(); saveSoon();
};
actions['se-img-upload'] = () => pickLayerImage(curLayer());
actions['se-img-pdf'] = () => {
  const l = curLayer();
  openPagePicker({
    pdfId: E.p.sourcePdfId, title: 'Escolha a página com a imagem',
    onPick: async (pdfId, n) => {
      const src = await withBusy('Preparando página…', () => renderPage(pdfId, n, 1800));
      if (src) openCrop({ src, preset: 'left', onDone: (url) => { pushUndo(); l.src = url; l.round = false; saveSoon(); renderStage(); renderPanel(); } });
    },
  });
};
actions['se-bg-upload'] = async () => {
  const [f] = await pickFile('image/*');
  if (!f) return;
  const s = curSlide();
  const url = await compressImage(f, 1900, 0.86);
  pushUndo();
  s.bg = await (await fetch(url)).blob();
  SE.bgFor = null;
  saveSoon(); renderStage(); renderPanel();
};
actions['se-bg-clear'] = () => { pushUndo(); curSlide().bg = null; SE.bgFor = null; saveSoon(); renderStage(); renderPanel(); };

/* ---- Aluno e personal (programas em slides) ---- */
function tabPessoas() {
  const p = E.p;
  const st = byId(S.students, p.studentId);
  const tr = byId(S.trainers, p.trainerId);
  return `
  <div class="section card stack">
    <label class="field"><span>Nome do programa</span><input type="text" data-bind="title"></label>
  </div>
  <div class="section grid two">
    <div class="card stack">
      <h2>Aluno(a)</h2>
      <div class="photo-pick">${avatarHTML(st && st.photo, st ? st.name : '?', 'lg')}
        <div class="stack" style="flex:1;gap:8px">
          <select id="sel-student">${optList(S.students, p.studentId, 'Selecione o aluno…')}</select>
          <div class="row"><button class="btn sm" data-action="new-person" data-kind="students" data-assign="1">+ Novo aluno</button>
          ${st ? `<button class="btn sm" data-action="edit-person" data-kind="students" data-id="${esc(st.id)}" data-assign="1">Editar foto/nome</button>` : ''}</div>
        </div>
      </div>
    </div>
    <div class="card stack">
      <h2>Personal Trainer</h2>
      <div class="photo-pick">${avatarHTML(tr && tr.photo, tr ? tr.name : '?', 'lg')}
        <div class="stack" style="flex:1;gap:8px">
          <select id="sel-trainer">${optList(S.trainers, p.trainerId, 'Selecione o personal…')}</select>
          <div class="row"><button class="btn sm" data-action="new-person" data-kind="trainers" data-assign="1">+ Novo personal</button>
          ${tr ? `<button class="btn sm" data-action="edit-person" data-kind="trainers" data-id="${esc(tr.id)}" data-assign="1">Editar foto/dados</button>` : ''}</div>
        </div>
      </div>
    </div>
  </div>
  <p class="small muted">As fotos e nomes colocados nos slides com os botões "Foto do aluno", "Nome do aluno", "Foto do personal" e "Nome do personal" usam este cadastro. Trocou o aluno aqui, todos os slides mudam.</p>
  <div class="section card stack">
    <h2>Etiquetas</h2>
    <div class="grid three">${TAG_KEYS.map((k) => `<label class="field"><span>${TAGS[k].label}</span><select data-bind="tags.${k}"><option value="">—</option>${Object.entries(TAGS[k].opts).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>
  </div>`;
}

/* ---- Seleção de páginas no visualizador de PDF ---- */
const PV = { sel: new Set(), pdfId: null };
function updatePvBar() {
  const n = PV.sel.size;
  const c = $('#pv-count');
  if (c) c.textContent = n ? `${n} selecionado(s)` : 'Nenhum selecionado';
  const b = $('#pv-import-sel');
  if (b) { b.disabled = !n; b.textContent = `Importar ${n || ''} selecionado(s)`; }
  $$('#pv-grid .page-tile').forEach((t) => t.classList.toggle('picked', PV.sel.has(+t.dataset.page)));
}
actions['pv-all'] = () => { const m = byId(S.pdfs, PV.pdfId); for (let i = 1; i <= m.pages; i++) PV.sel.add(i); updatePvBar(); };
actions['pv-none'] = () => { PV.sel.clear(); updatePvBar(); };
actions['pv-import-all'] = () => chooseImportTarget(PV.pdfId, null);
actions['pv-import-sel'] = () => chooseImportTarget(PV.pdfId, [...PV.sel].sort((a, b) => a - b));
function chooseImportTarget(pdfId, pages) {
  const meta = byId(S.pdfs, pdfId);
  const targets = S.programs.filter((p) => p.mode === 'slides').sort((a, b) => b.updatedAt - a.updatedAt);
  const n = pages ? pages.length : meta.pages;
  if (!targets.length) { createSlideProgram(pdfId, pages); return; }
  const body = openModal(`Importar ${n} slide(s)`, `
    <div class="stack">
      <label class="row"><input type="radio" name="imp" value="new" checked> Criar um programa novo</label>
      <label class="row"><input type="radio" name="imp" value="add"> Adicionar a um programa existente</label>
      <select id="imp-prog">${targets.map((p) => `<option value="${esc(p.id)}">${esc(p.title)} (${(p.slides || []).length} slides)</option>`).join('')}</select>
      <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="imp-go">Importar</button></div>
    </div>`);
  $('#imp-go', body).onclick = async () => {
    const mode = $('input[name="imp"]:checked', body).value;
    const pid = $('#imp-prog', body).value;
    closeModal();
    if (mode === 'new') return createSlideProgram(pdfId, pages);
    const p = byId(S.programs, pid);
    const pg = pages || Array.from({ length: meta.pages }, (_, i) => i + 1);
    if (await addSlidesToProgram(p, pdfId, pg)) location.hash = `#/programa/${p.id}/slides`;
  };
}

/* =========================================================
 * Nuvem (Supabase): conta do personal, sincronização, acesso do aluno
 * ======================================================= */
const SB_URL = 'https://dzmgbvyffxtcjsdpedqb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bWdidnlmZnh0Y2pzZHBlZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ5NTc1NjMsImV4cCI6MjExMDUzMzU2M30.SwPdVvklPQrSm1dnsLbGvEk8Li0VsgfE3siegg_iXh8';
const sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'tps-auth', autoRefreshToken: true } }) : null;
const CLOUD = { user: null, queue: new Map(), timer: null, busy: false, lastSync: 0, error: '' };
const SYNC_STORES = ['programs', 'students', 'trainers', 'settings'];
const fmtCode = (c) => String(c || '').replace(/^(.{4})(.{4})$/, '$1-$2');

function cloudJSON(obj) {
  // Blobs (imagens de slides) não vão no JSON: vão para o Storage (bgUrl)
  return JSON.parse(JSON.stringify(obj, (k, v) => (v instanceof Blob ? undefined : v)));
}
function queueSync(store, id, del = false) {
  if (!CLOUD.user || !SYNC_STORES.includes(store)) return;
  CLOUD.queue.set(store + '|' + id, { store, id, del });
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(flushSync, 1500);
}
async function uploadSlideImages(p) {
  let changed = false;
  for (const s of p.slides || []) {
    if (s.bg instanceof Blob && s.bgUploaded !== s.bg.size) {
      const path = `${CLOUD.user.id}/${p.id}/${s.id}-${Date.now()}.jpg`;
      const { error } = await sb.storage.from('slides').upload(path, s.bg, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      s.bgUrl = sb.storage.from('slides').getPublicUrl(path).data.publicUrl;
      s.bgUploaded = s.bg.size;
      changed = true;
    }
  }
  if (changed) await DB.put('programs', p);
}
async function flushSync() {
  if (!CLOUD.user || CLOUD.busy || !CLOUD.queue.size) return;
  CLOUD.busy = true;
  const jobs = [...CLOUD.queue.values()];
  CLOUD.queue.clear();
  try {
    const up = [];
    for (const j of jobs) {
      if (j.del) {
        await sb.from('items').delete().eq('store', j.store).eq('id', j.id);
        continue;
      }
      const obj = j.store === 'settings' ? S.settings : byId(S[j.store], j.id);
      if (!obj) continue;
      if (j.store === 'programs' && obj.mode === 'slides') await uploadSlideImages(obj);
      up.push({ owner: CLOUD.user.id, store: j.store, id: j.id, data: cloudJSON(obj), updated_at: new Date(obj.updatedAt || Date.now()).toISOString() });
    }
    for (let i = 0; i < up.length; i += 20) {
      const { error } = await sb.from('items').upsert(up.slice(i, i + 20));
      if (error) throw error;
    }
    CLOUD.lastSync = Date.now();
    CLOUD.error = '';
  } catch (e) {
    console.warn('sync', e);
    CLOUD.error = e.message || 'falha ao sincronizar';
    jobs.forEach((j) => CLOUD.queue.set(j.store + '|' + j.id, j));
    clearTimeout(CLOUD.timer);
    CLOUD.timer = setTimeout(flushSync, 15000);
  } finally {
    CLOUD.busy = false;
    updateCloudBadge();
  }
}
async function syncNow() {
  clearTimeout(CLOUD.timer);
  while (CLOUD.busy) await sleep(200);
  await flushSync();
  if (CLOUD.error) throw new Error(CLOUD.error);
}
/** Ao entrar: junta o que está no aparelho com o que está na nuvem (o mais recente vence). */
async function pullAndMerge() {
  const { data, error } = await sb.from('items').select('store,id,data');
  if (error) throw error;
  const remote = new Map(data.map((r) => [r.store + '|' + r.id, r]));
  for (const r of data) {
    const d = r.data;
    if (r.store === 'settings') {
      if ((d.updatedAt || 0) > (S.settings.updatedAt || 0)) { S.settings = { ...S.settings, ...d }; await DB.put('settings', S.settings); }
      continue;
    }
    const local = byId(S[r.store], r.id);
    if (!local || (d.updatedAt || 0) > (local.updatedAt || 0)) {
      if (local && r.store === 'programs') {
        // preserva as imagens locais de slides que ainda batem
        (d.slides || []).forEach((sl) => { const ls = (local.slides || []).find((x) => x.id === sl.id); if (ls && ls.bg instanceof Blob && ls.bgUploaded === sl.bgUploaded) sl.bg = ls.bg; });
      }
      await DB.put(r.store, d);
      upsert(S[r.store], d);
    }
  }
  for (const st of ['programs', 'students', 'trainers']) {
    for (const x of S[st]) {
      const r = remote.get(st + '|' + x.id);
      if (!r || (x.updatedAt || 0) > (r.data.updatedAt || 0)) CLOUD.queue.set(st + '|' + x.id, { store: st, id: x.id });
    }
  }
  if (!remote.has('settings|app') || (S.settings.updatedAt || 0) > ((remote.get('settings|app') || {}).data || {}).updatedAt) CLOUD.queue.set('settings|app', { store: 'settings', id: 'app' });
  await flushSync();
}
async function cloudInit() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  CLOUD.user = data.session ? data.session.user : null;
  sb.auth.onAuthStateChange((ev, session) => {
    const was = CLOUD.user;
    CLOUD.user = session ? session.user : null;
    updateCloudBadge();
    if (!was && CLOUD.user && ev === 'SIGNED_IN') checkLicense().then(() => { if (LIC.active) return pullAndMerge().then(softRefresh); }).catch((e) => toast('Erro ao sincronizar: ' + e.message));
    if (was && !CLOUD.user) { LIC.active = false; route(); }
  });
  updateCloudBadge();
  if (CLOUD.user) {
    await checkLicense();
    if (LIC.active) pullAndMerge().then(softRefresh).catch((e) => console.warn(e));
  }
}
/** Atualiza a tela depois de sincronizar, sem fechar janelas abertas nem atrapalhar a edição. */
function softRefresh() {
  if ($('#modal-root').innerHTML || $('.busy')) return;
  const h = location.hash || '#/';
  if (['#/', '#/biblioteca', '#/alunos', '#/config', '#/novo'].includes(h) || h === '#') route();
}
function updateCloudBadge() {
  const b = $('#cloud-badge');
  if (!b) return;
  if (!CLOUD.user) { b.textContent = 'Entrar'; b.className = 'cloud-badge off'; b.title = 'Entre para salvar na nuvem e liberar acesso aos alunos'; return; }
  b.textContent = CLOUD.error ? '⚠ Nuvem' : CLOUD.busy || CLOUD.queue.size ? '⟳ Nuvem' : '✓ Nuvem';
  b.className = 'cloud-badge ' + (CLOUD.error ? 'err' : 'on');
  b.title = CLOUD.error ? 'Erro ao sincronizar: ' + CLOUD.error : 'Salvo na nuvem' + (CLOUD.lastSync ? ' às ' + new Date(CLOUD.lastSync).toLocaleTimeString('pt-BR') : '');
}

/* ---- Licença (assinatura Kiwify) ---- */
// Links de compra exibidos para quem não tem licença ativa (lista vazia esconde os botões)
const KIWIFY_OFFERS = [
  { title: 'Assine o Trainer Pro Studio', plans: [
    { label: 'Assinatura anual', hint: 'melhor custo-benefício', url: 'https://pay.kiwify.com.br/vpzl9M0', primary: true },
    { label: 'Assinatura mensal', url: 'https://pay.kiwify.com.br/yP2MzG4' },
  ] },
];
const plansHTML = () => !KIWIFY_OFFERS.length ? '' : `
  <div class="gate-plans">
    ${KIWIFY_OFFERS.map((o) => `
      <div class="gate-offer${o.special ? ' special' : ''}">
        <p class="small" style="${o.special ? 'color:var(--gold-2)' : ''}"><b>${esc(o.title)}</b></p>
        ${o.plans.map((pl) => `<a class="btn lg ${pl.primary ? 'primary' : ''}" href="${esc(pl.url)}" target="_blank" rel="noopener"><span>${esc(pl.label)}${pl.hint ? `<span class="plan-hint">${esc(pl.hint)}</span>` : ''}</span></a>`).join('')}
      </div>`).join('')}
    <p class="small muted">Depois do pagamento, crie a conta (ou entre) com o mesmo e-mail da compra.</p>
  </div>`;
const LIC = { checked: false, active: false, admin: false, expires_at: null, offline: false };
const LIC_CACHE_DAYS = 7; // sem internet, vale a última verificação por até 7 dias
async function checkLicense() {
  LIC.checked = true; LIC.offline = false;
  if (!sb || !CLOUD.user) { LIC.active = false; return LIC; }
  const email = (CLOUD.user.email || '').toLowerCase();
  try {
    const { data, error } = await sb.rpc('my_license');
    if (error) throw error;
    LIC.active = !!(data && data.active);
    LIC.admin = !!(data && data.admin);
    LIC.expires_at = data && data.expires_at;
    lsSet('tps-lic', JSON.stringify({ email, active: LIC.active, admin: LIC.admin, expires_at: LIC.expires_at, at: Date.now() }));
  } catch (e) {
    let c = null;
    try { c = JSON.parse(lsGet('tps-lic') || 'null'); } catch (x) { /* cache inválido */ }
    const fresh = c && c.email === email && Date.now() - c.at < LIC_CACHE_DAYS * 86400000;
    LIC.active = !!(fresh && c.active && (!c.expires_at || new Date(c.expires_at) > new Date()));
    LIC.expires_at = fresh ? c.expires_at : null;
    LIC.admin = !!(fresh && c.admin);
    LIC.offline = true;
  }
  return LIC;
}
const hasAccess = () => !!(CLOUD.user && LIC.active);
const afterLogin = () => checkLicense().then(() => route());
function viewGate() {
  document.body.classList.add('gated');
  const logged = !!CLOUD.user;
  app.innerHTML = `
    <div class="gate card">
      <div class="gate-logo">TP</div>
      <h1>Trainer Pro Studio</h1>
      ${!logged ? `
        <p class="muted">Entre com a sua conta de personal para usar o app.</p>
        <p class="small muted">Primeiro acesso? Clique em <b>Entrar</b> e depois em <b>Criar conta</b>, usando o <b>mesmo e-mail da compra</b> na Kiwify.</p>
        <div class="stack"><button class="btn primary lg" data-action="gate-login">Entrar</button></div>
        ${KIWIFY_OFFERS.length ? '<p class="muted" style="margin-top:6px">Ainda não tem acesso?</p>' + plansHTML() : ''}`
      : `
        <p><b>Sua assinatura não está ativa.</b></p>
        <p class="muted">Conta: <b>${esc(CLOUD.user.email || '')}</b></p>
        <p class="small muted">${LIC.offline ? 'Sem conexão para verificar a assinatura. Conecte-se à internet e tente de novo.'
          : 'O acesso é liberado automaticamente após a confirmação do pagamento na Kiwify. Use o mesmo e-mail da compra. Se pagou com outro e-mail, saia e crie a conta com ele.'}</p>
        <div class="stack">
          <button class="btn primary lg" data-action="gate-recheck">Verificar novamente</button>
          <button class="btn ghost" data-action="gate-logout">Sair e entrar com outro e-mail</button>
        </div>
        ${plansHTML()}`}
    </div>`;
}
actions['gate-login'] = () => openLogin(afterLogin);
actions['gate-recheck'] = async () => {
  await withBusy('Verificando assinatura…', () => checkLicense());
  if (LIC.active) toast('Assinatura ativa. Bem-vindo!');
  route();
};
actions['gate-logout'] = async () => { await sb.auth.signOut(); LIC.active = false; route(); };

/* ---- Conta do personal ---- */
const AUTH_ERRORS = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Este e-mail já tem conta. Use "Entrar".',
};
function authError(e) {
  const m = (e && e.message) || String(e);
  if (/password/i.test(m) && /6/.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  return AUTH_ERRORS[m] || m;
}
function openLogin(after) {
  if (!sb) { toast('Sem conexão com a nuvem.'); return; }
  const body = openModal('Sua conta Trainer Pro', `
    <p class="muted" style="margin-top:0">Com a conta, seus programas ficam salvos na nuvem (em qualquer aparelho) e você libera o acesso dos alunos ao app.</p>
    <p class="small muted" style="margin-top:0">Use o <b>mesmo e-mail da compra</b> na Kiwify.</p>
    <div class="stack">
      <label class="field"><span>E-mail</span><input type="text" id="lg-email" autocomplete="email" inputmode="email"></label>
      <label class="field"><span>Senha</span><input type="password" id="lg-pass" autocomplete="current-password" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg-2);color:var(--text)"></label>
      <p class="small" id="lg-msg" style="margin:0;color:var(--gold-2)"></p>
      <div class="row"><button class="btn primary" id="lg-in">Entrar</button><button class="btn" id="lg-up">Criar conta</button><span class="spacer"></span><button class="btn ghost sm" id="lg-reset">Esqueci a senha</button></div>
    </div>`);
  const msg = (t) => { $('#lg-msg', body).textContent = t; };
  const creds = () => ({ email: $('#lg-email', body).value.trim(), password: $('#lg-pass', body).value });
  const done = () => { closeModal(); toast('Conta conectada. Sincronizando…'); if (after) after(); };
  $('#lg-in', body).onclick = async () => {
    msg('Entrando…');
    const { error } = await sb.auth.signInWithPassword(creds());
    if (error) return msg(authError(error));
    done();
  };
  $('#lg-up', body).onclick = async () => {
    const c = creds();
    if (!c.email || c.password.length < 6) return msg('Informe o e-mail e uma senha com pelo menos 6 caracteres.');
    msg('Criando conta…');
    const { data, error } = await sb.auth.signUp({ ...c, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return msg(authError(error));
    if (!data.session) return msg('Conta criada. Abra o e-mail de confirmação que enviamos e depois clique em "Entrar".');
    done();
  };
  $('#lg-reset', body).onclick = async () => {
    const email = $('#lg-email', body).value.trim();
    if (!email) return msg('Digite seu e-mail acima.');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    msg(error ? authError(error) : 'Enviamos um link para redefinir a senha.');
  };
  setTimeout(() => $('#lg-email', body).focus(), 50);
}
actions.login = () => openLogin(afterLogin);
actions.logout = async () => {
  if (!confirm('Sair da conta? Os dados continuam neste aparelho e na nuvem.')) return;
  await sb.auth.signOut();
  LIC.active = false;
  route();
};
actions['cloud-badge'] = () => { if (CLOUD.user) location.hash = '#/config'; else openLogin(afterLogin); };
actions['sync-now'] = async () => {
  try { await withBusy('Sincronizando…', async () => { await pullAndMerge(); await syncNow(); return true; }); toast('Tudo sincronizado'); route(); } catch (e) { toast('Erro: ' + e.message); }
};
function cloudCardHTML() {
  if (!sb) return '';
  if (!CLOUD.user) {
    return `<div class="card stack"><h2>Conta na nuvem</h2>
      <p class="muted" style="margin:0">Entre para salvar seus programas na nuvem, usar em qualquer aparelho e liberar o acesso dos alunos ao app.</p>
      <div class="row"><button class="btn primary" data-action="login">Entrar ou criar conta</button></div></div>`;
  }
  return `<div class="card stack"><h2>Conta na nuvem</h2>
    <p style="margin:0">Conectado como <b>${esc(CLOUD.user.email)}</b></p>
    <p class="small muted" style="margin:0">${CLOUD.error ? '⚠ ' + esc(CLOUD.error) : CLOUD.lastSync ? 'Sincronizado às ' + new Date(CLOUD.lastSync).toLocaleTimeString('pt-BR') : 'Sincronização automática ativa.'}</p>
    <div class="row"><button class="btn" data-action="sync-now">Sincronizar agora</button><button class="btn ghost" data-action="logout">Sair da conta</button></div></div>`;
}

/* ---- Painel de licenças (só o dono do app) ---- */
function licAdminHTML() {
  if (!LIC.admin || !CLOUD.user) return '';
  return `<div class="card stack" id="lic-admin">
    <h2>Licenças <span class="small muted" style="font-weight:400">· só você vê esta área</span></h2>
    <p class="muted" style="margin:0">Libere cortesias e parceiros, bloqueie ou reative qualquer personal. Quem comprou pela Kiwify entra aqui sozinho.</p>
    <div class="grid two">
      <label class="field"><span>E-mail do personal</span><input type="text" id="la-email" inputmode="email" placeholder="email@exemplo.com"></label>
      <label class="field"><span>Validade</span><select id="la-exp">
        <option value="">Sem vencimento</option><option value="30">30 dias</option><option value="90">90 dias</option>
        <option value="180">6 meses</option><option value="365">1 ano</option><option value="date">Até uma data…</option></select></label>
    </div>
    <label class="field" id="la-date-wrap" style="display:none"><span>Data final</span><input type="date" id="la-date"></label>
    <label class="field"><span>Observação (opcional)</span><input type="text" id="la-note" placeholder="Ex.: cortesia aluno do curso, parceiro Fulano"></label>
    <div class="row"><button class="btn primary" data-action="lic-grant">Liberar acesso</button><span class="small muted" id="la-msg"></span></div>
    <div class="row"><input type="text" id="la-q" placeholder="Buscar e-mail ou observação…" style="flex:1;min-width:180px"><span class="small muted" id="la-count"></span></div>
    <div id="la-list" class="stack"><p class="muted small">Carregando…</p></div>
  </div>`;
}
let LIC_ROWS = [];
async function loadLicAdmin() {
  const box = $('#la-list');
  if (!box) return;
  const { data, error } = await sb.rpc('admin_list_licenses');
  if (error) { box.innerHTML = `<p class="small" style="color:#ffb4a9">Erro: ${esc(error.message)}</p>`; return; }
  LIC_ROWS = data || [];
  renderLicAdmin();
}
function renderLicAdmin() {
  const box = $('#la-list');
  if (!box) return;
  const q = ($('#la-q') || {}).value ? $('#la-q').value.trim().toLowerCase() : '';
  const rows = LIC_ROWS.filter((r) => !q || (r.email + ' ' + (r.note || '')).toLowerCase().includes(q));
  const act = LIC_ROWS.filter((r) => r.active).length;
  $('#la-count').textContent = `${act} ativa(s) de ${LIC_ROWS.length}`;
  if (!rows.length) { box.innerHTML = '<p class="muted small">Nenhuma licença encontrada.</p>'; return; }
  box.innerHTML = rows.map((r) => {
    const exp = r.expires_at ? new Date(r.expires_at) : null;
    const st = r.active ? ['Ativa', 'on'] : r.status === 'inactive' ? ['Bloqueada', 'off'] : ['Vencida', 'off'];
    return `<div class="lic-row">
      <div class="lic-main"><b>${esc(r.email)}</b>
        <div class="small muted">${r.source === 'kiwify' ? 'Kiwify' : 'Manual'}${exp ? ' · ' + (r.active ? 'até ' : 'desde ') + exp.toLocaleDateString('pt-BR') : r.active ? ' · sem vencimento' : ''}${r.has_account ? '' : ' · ainda não criou conta'}${r.note ? ' · ' + esc(r.note) : ''}</div></div>
      <span class="chip ${st[1] === 'on' ? 'gold' : ''}">${st[0]}</span>
      ${r.active
        ? `<button class="btn sm danger" data-action="lic-block" data-email="${esc(r.email)}">Bloquear</button>`
        : `<button class="btn sm" data-action="lic-edit" data-email="${esc(r.email)}">Reativar</button>`}
    </div>`;
  }).join('');
}
function bindLicAdmin() {
  if (!$('#lic-admin')) return;
  $('#la-exp').onchange = () => { $('#la-date-wrap').style.display = $('#la-exp').value === 'date' ? '' : 'none'; };
  $('#la-q').oninput = renderLicAdmin;
  loadLicAdmin();
}
async function setLicense(email, active, expiresAt, note) {
  const { data, error } = await sb.rpc('admin_set_license', { _email: email, _active: active, _expires_at: expiresAt, _note: note || null });
  if (error) throw error;
  if (data && data.error) throw new Error(data.error);
}
actions['lic-grant'] = async () => {
  const email = $('#la-email').value.trim().toLowerCase();
  const v = $('#la-exp').value;
  let exp = null;
  if (v === 'date') {
    if (!$('#la-date').value) { $('#la-msg').textContent = 'Escolha a data final.'; return; }
    exp = new Date($('#la-date').value + 'T23:59:59').toISOString();
  } else if (v) exp = new Date(Date.now() + Number(v) * 86400000).toISOString();
  try {
    await setLicense(email, true, exp, $('#la-note').value.trim());
    toast('Acesso liberado para ' + email);
    $('#la-email').value = ''; $('#la-note').value = ''; $('#la-msg').textContent = '';
    loadLicAdmin();
  } catch (e) { $('#la-msg').textContent = e.message; }
};
actions['lic-block'] = async (el) => {
  const email = el.dataset.email;
  if (!confirm(`Bloquear o acesso de ${email}? O personal deixa de usar o app (pode reativar depois).`)) return;
  try { await setLicense(email, false, null, null); toast('Acesso bloqueado'); loadLicAdmin(); } catch (e) { toast('Erro: ' + e.message); }
};
actions['lic-edit'] = (el) => {
  const r = LIC_ROWS.find((x) => x.email === el.dataset.email) || {};
  $('#la-email').value = r.email || '';
  $('#la-note').value = r.note || '';
  $('#la-email').scrollIntoView({ block: 'center' });
  $('#la-msg').textContent = 'Escolha a validade e clique em "Liberar acesso".';
};

/* ---- Acesso do aluno (código) ---- */
const studentLink = () => location.origin + location.pathname + '#/aluno';
function accessStatus(a) {
  if (!a.active) return ['Desativado', 'off'];
  if (a.expires_at && new Date(a.expires_at) < new Date()) return ['Expirado', 'off'];
  return ['Ativo', 'on'];
}
function accessMessage(p, a) {
  const st = byId(S.students, p.studentId), tr = byId(S.trainers, p.trainerId);
  return `Olá${st ? ' ' + st.name.split(' ')[0] : ''}! Seu programa de treino "${p.title}" já está no app.\n\n1) Acesse: ${studentLink()}\n2) Digite o código: ${fmtCode(a.code)}\n\nLá você vê os treinos com fotos e explicações, marca o treino feito e registra suas cargas.${a.expires_at ? `\nAcesso válido até ${new Date(a.expires_at).toLocaleDateString('pt-BR')}.` : ''}${tr ? '\n\n' + tr.name : ''}`;
}
actions['student-access'] = async (el, ev) => {
  if (ev) ev.stopPropagation();
  const p = byId(S.programs, el.dataset.id || (E.p && E.p.id));
  if (!CLOUD.user) {
    openModal('Liberar acesso ao aluno', `<p>Para o aluno acessar o programa pelo app, entre na sua conta (os programas passam a ficar na nuvem).</p>
      <div class="row"><button class="btn primary" id="la-login">Entrar ou criar conta</button></div>`);
    $('#la-login').onclick = () => openLogin(() => actions['student-access'](el));
    return;
  }
  await openAccessModal(p);
};
async function openAccessModal(p) {
  if (E.p && E.p.id === p.id) await saveSoon.flush();
  queueSync('programs', p.id);
  if (p.studentId) queueSync('students', p.studentId);
  if (p.trainerId) queueSync('trainers', p.trainerId);
  const ok = await withBusy('Enviando o programa para a nuvem…', async () => { await syncNow(); return true; });
  if (!ok) return;
  const st = byId(S.students, p.studentId);
  const body = openModal('Acesso do aluno ao app', `
    <p class="muted" style="margin-top:0">O aluno abre o link, digita o código e vê "${esc(p.title)}" sempre atualizado: se você editar o programa, ele vê na hora. Ele também marca os treinos feitos e registra as cargas.</p>
    <div id="acc-list" class="stack"><p class="muted">Carregando…</p></div>
    <div class="card stack" style="margin-top:14px;background:var(--bg)">
      <strong>Gerar novo código${st ? ' para ' + esc(st.name.split(' ')[0]) : ''}</strong>
      <div class="row">
        <label class="field" style="min-width:200px"><span>Validade</span><select id="acc-valid">
          <option value="">Até eu desativar</option><option value="30" selected>30 dias (ciclo do programa)</option><option value="60">60 dias</option><option value="90">90 dias</option><option value="date">Data específica…</option></select></label>
        <label class="field hidden" id="acc-date-w"><span>Válido até</span><input type="date" id="acc-date" style="padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg-2);color:var(--text)"></label>
        <button class="btn primary" id="acc-new" style="align-self:flex-end">Gerar código</button>
      </div>
    </div>`);
  $('#acc-valid', body).onchange = (e) => $('#acc-date-w', body).classList.toggle('hidden', e.target.value !== 'date');
  const expiresFrom = () => {
    const v = $('#acc-valid', body).value;
    if (!v) return null;
    if (v === 'date') { const d = $('#acc-date', body).value; return d ? new Date(d + 'T23:59:59').toISOString() : undefined; }
    return new Date(Date.now() + (+v) * 86400000).toISOString();
  };
  const load = async () => {
    const { data, error } = await sb.from('student_access').select('*').eq('program_ref', p.id).order('created_at', { ascending: false });
    const box = $('#acc-list', body);
    if (!box) return;
    if (error) { box.innerHTML = `<p>Erro: ${esc(error.message)}</p>`; return; }
    if (!data.length) { box.innerHTML = '<p class="muted">Nenhum código gerado para este programa ainda.</p>'; return; }
    box.innerHTML = data.map((a) => {
      const [label, cls] = accessStatus(a);
      return `<div class="card acc-item">
        <div class="row"><span class="acc-code">${esc(fmtCode(a.code))}</span><span class="chip ${cls === 'on' ? 'gold' : ''}">${label}</span><span class="spacer"></span>
          <span class="small muted">${a.expires_at ? 'Válido até ' + new Date(a.expires_at).toLocaleDateString('pt-BR') : 'Sem validade'} · ${a.last_seen_at ? 'Último acesso ' + new Date(a.last_seen_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Ainda não acessou'}</span></div>
        <div class="row" style="margin-top:10px;gap:6px">
          <button class="btn sm primary" data-acc="wa" data-id="${a.id}">Enviar pelo WhatsApp</button>
          <button class="btn sm" data-acc="copy" data-id="${a.id}">Copiar mensagem</button>
          <button class="btn sm" data-acc="toggle" data-id="${a.id}">${a.active ? 'Desativar' : 'Reativar'}</button>
          <button class="btn sm" data-acc="renew" data-id="${a.id}">+30 dias</button>
          <button class="btn sm danger" data-acc="del" data-id="${a.id}" title="Excluir código e histórico">✕</button>
        </div></div>`;
    }).join('');
    $$('[data-acc]', box).forEach((b) => b.addEventListener('click', async () => {
      const a = data.find((x) => x.id === b.dataset.id);
      const kind = b.dataset.acc;
      if (kind === 'wa' || kind === 'copy') {
        const text = accessMessage(p, a);
        if (kind === 'copy') { navigator.clipboard.writeText(text).then(() => toast('Mensagem copiada'), () => toast('Não foi possível copiar')); return; }
        window.open(`https://wa.me/${waNumber(byId(S.students, p.studentId))}?text=${encodeURIComponent(text)}`, '_blank');
        return;
      }
      let res;
      if (kind === 'toggle') res = await sb.from('student_access').update({ active: !a.active }).eq('id', a.id);
      if (kind === 'renew') {
        const base = a.expires_at && new Date(a.expires_at) > new Date() ? new Date(a.expires_at) : new Date();
        res = await sb.from('student_access').update({ expires_at: new Date(base.getTime() + 30 * 86400000).toISOString(), active: true }).eq('id', a.id);
      }
      if (kind === 'del') {
        if (!confirm('Excluir este código? O aluno perde o acesso e o histórico de treinos dele é apagado.')) return;
        res = await sb.from('student_access').delete().eq('id', a.id);
      }
      if (res && res.error) toast('Erro: ' + res.error.message); else load();
    }));
  };
  $('#acc-new', body).onclick = async () => {
    const exp = expiresFrom();
    if (exp === undefined) { toast('Escolha a data'); return; }
    const { error } = await sb.from('student_access').insert({ program_ref: p.id, student_ref: p.studentId || null, student_name: st ? st.name : null, expires_at: exp });
    if (error) { toast('Erro: ' + error.message); return; }
    toast('Código gerado');
    load();
  };
  load();
}

/* ---- Acompanhamento (personal vê os treinos do aluno) ---- */
async function tabAcompanhamento() {
  const box = $('#ed-body');
  const p = E.p;
  if (!CLOUD.user) {
    box.innerHTML = `<div class="section empty"><h2>Acompanhamento</h2><p>Entre na sua conta e libere o acesso do aluno para ver aqui os treinos feitos e as cargas registradas.</p><button class="btn primary" data-action="login">Entrar ou criar conta</button></div>`;
    return;
  }
  box.innerHTML = '<div class="section muted">Carregando…</div>';
  const { data: acc, error: e1 } = await sb.from('student_access').select('id,code,active,expires_at,last_seen_at').eq('program_ref', p.id);
  if (e1) { box.innerHTML = `<div class="section">Erro: ${esc(e1.message)}</div>`; return; }
  if (!acc.length) {
    box.innerHTML = `<div class="section empty"><h2>Nenhum acesso liberado</h2><p>Gere o código para o aluno usar o app. Os treinos que ele marcar aparecem aqui.</p><button class="btn primary" data-action="student-access" data-id="${esc(p.id)}">Liberar acesso ao aluno</button></div>`;
    return;
  }
  const { data: logs, error: e2 } = await sb.from('workout_logs').select('*').in('access_id', acc.map((a) => a.id)).order('log_date', { ascending: false }).order('created_at', { ascending: false }).limit(200);
  if (e2) { box.innerHTML = `<div class="section">Erro: ${esc(e2.message)}</div>`; return; }
  const last = acc.map((a) => a.last_seen_at).filter(Boolean).sort().pop();
  const since30 = logs.filter((l) => new Date(l.log_date) > new Date(Date.now() - 30 * 86400000)).length;
  box.innerHTML = `
    <div class="section grid three">
      <div class="card"><div class="small muted">Treinos registrados</div><div class="kpi">${logs.length}</div></div>
      <div class="card"><div class="small muted">Nos últimos 30 dias</div><div class="kpi">${since30}</div></div>
      <div class="card"><div class="small muted">Último acesso ao app</div><div class="kpi sm">${last ? new Date(last).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div></div>
    </div>
    <div class="section row"><button class="btn sm" data-action="student-access" data-id="${esc(p.id)}">Gerenciar acesso do aluno</button><button class="btn sm ghost" data-action="tab" data-tab="acomp">Atualizar</button></div>
    <div class="section stack">${logs.length ? logs.map((l) => `
      <div class="card">
        <div class="row"><strong>${new Date(l.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><span class="chip gold">${esc(l.workout_name || 'Treino')}</span>
          <span class="small muted">${(l.exercises || []).filter((x) => (x.sets || []).some((s) => s.done)).length} de ${(l.exercises || []).length} exercícios</span></div>
        <table class="tpl-table" style="margin-top:8px">${(l.exercises || []).map((x) => `<tr><td>${esc(x.name)}</td><td>${(x.sets || []).filter((s) => s.done || s.reps || s.load).map((s) => `${esc(s.reps || '–')}${s.load ? ' × ' + esc(s.load) + 'kg' : ''}${s.done ? '' : ' (não feita)'}`).join(' · ') || '<span class="muted">—</span>'}</td></tr>`).join('')}</table>
        ${l.notes ? `<p class="small" style="margin:8px 0 0">💬 ${esc(l.notes)}</p>` : ''}
      </div>`).join('') : '<div class="empty">O aluno ainda não registrou treinos.</div>'}</div>`;
}

/* =========================================================
 * Área do aluno (#/aluno)
 * ======================================================= */
const ST = { code: '', data: null, wid: null, timer: null };
const STUDENT_ERRORS = {
  INVALID_CODE: 'Código não encontrado. Confira com seu personal.',
  INACTIVE: 'Este acesso foi desativado pelo seu personal.',
  EXPIRED: 'Seu acesso expirou. Fale com seu personal para renovar.',
  TOO_MANY_ATTEMPTS: 'Muitas tentativas. Aguarde 1 hora e tente de novo.',
  PROGRAM_NOT_FOUND: 'O programa não está disponível. Fale com seu personal.',
};
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
async function viewStudent(codeFromUrl) {
  document.body.classList.add('student-mode');
  if (codeFromUrl) { lsSet('tps-student-code', codeFromUrl); history.replaceState(null, '', '#/aluno'); }
  ST.code = lsGet('tps-student-code') || '';
  if (!ST.code) return studentLoginView();
  app.innerHTML = '<div class="empty" style="margin-top:40px">Carregando seu programa…</div>';
  const { data, error } = await sb.rpc('student_open', { _code: ST.code });
  if (error || !data || data.error) {
    const msg = error ? 'Sem conexão. Verifique a internet e tente de novo.' : STUDENT_ERRORS[data.error] || data.error;
    if (data && ['INVALID_CODE', 'INACTIVE', 'EXPIRED', 'PROGRAM_NOT_FOUND'].includes(data.error)) lsSet('tps-student-code', null);
    return studentLoginView(msg);
  }
  ST.data = data;
  renderStudent();
}
function studentLoginView(msg = '') {
  app.innerHTML = `
    <div class="st-login card">
      <div class="brand-mark" style="width:56px;height:56px;font-size:22px;margin:0 auto">TP</div>
      <h1 style="text-align:center;margin-top:14px">Seu programa de treino</h1>
      <p class="muted" style="text-align:center">Digite o código que seu personal enviou.</p>
      <input type="text" id="st-code" placeholder="XXXX-XXXX" maxlength="9" autocomplete="one-time-code" autocapitalize="characters" class="st-code-input">
      ${msg ? `<p class="small" style="color:var(--gold-2);text-align:center">${esc(msg)}</p>` : ''}
      <button class="btn primary lg" id="st-go" style="width:100%">Entrar</button>
      <p class="small muted" style="text-align:center;margin-bottom:0">É personal? <a href="#/" data-action="leave-student">Abrir o Trainer Pro Studio</a></p>
    </div>`;
  const go = () => {
    const c = $('#st-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length < 8) { toast('O código tem 8 caracteres'); return; }
    lsSet('tps-student-code', c);
    viewStudent();
  };
  $('#st-go').onclick = go;
  $('#st-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  $('#st-code').focus();
}
actions['leave-student'] = () => { location.hash = '#/'; location.reload(); };
actions['st-logout'] = () => { if (!confirm('Sair? Para voltar, use o código de novo.')) return; lsSet('tps-student-code', null); ST.data = null; studentLoginView(); };
function lastLogFor(wref) { return (ST.data.logs || []).find((l) => l.workout_ref === wref); }
function lastSetsFor(exRef, exName) {
  for (const l of ST.data.logs || []) {
    const x = (l.exercises || []).find((e) => e.ref === exRef || e.name === exName);
    if (x && (x.sets || []).some((s) => s.done && (s.reps || s.load))) return { date: l.log_date, sets: x.sets.filter((s) => s.done) };
  }
  return null;
}
function nextWorkout(p) {
  const ws = p.workouts || [];
  const last = (ST.data.logs || [])[0];
  if (!last) return ws[0];
  const i = ws.findIndex((w) => w.id === last.workout_ref);
  return ws[(i + 1) % ws.length] || ws[0];
}
function draftKey(wid) { return `tps-draft-${ST.code}-${wid}`; }
function loadDraft(wid) { try { return JSON.parse(lsGet(draftKey(wid)) || 'null'); } catch (e) { return null; } }
function saveDraft(wid, d) { lsSet(draftKey(wid), JSON.stringify(d)); }
function renderStudent(tab) {
  const { program: p, trainer: tr, student: st, access } = ST.data;
  const isSlides = p.mode === 'slides';
  const isAero = p.mode === 'aero' && p.aero;
  const hasForca = (p.workouts || []).some((w) => (w.exercises || []).length);
  if (!ST.wid || !(p.workouts || []).some((w) => w.id === ST.wid)) ST.wid = (nextWorkout(p) || {}).id;
  ST.tab = tab || ST.tab || (isAero ? 'aero' : 'treino');
  if (isAero && !['aero', 'plano', 'treino', 'hist'].includes(ST.tab)) ST.tab = 'aero';
  const exp = access.expires_at ? new Date(access.expires_at) : null;
  const daysLeft = exp ? Math.ceil((exp - new Date()) / 86400000) : null;
  app.innerHTML = `
    <div class="st-head card">
      <div class="row">
        ${avatarHTML(st && st.photo, st && st.name, 'lg')}
        <div style="flex:1;min-width:0"><div class="small muted">Olá,</div><h1 style="font-size:24px">${esc(st && st.name ? st.name.split(' ')[0] : 'Aluno')}</h1>
          <div class="small muted">${esc(p.title)}</div></div>
        <button class="btn sm ghost" data-action="st-logout">Sair</button>
      </div>
      ${tr ? `<div class="row st-trainer">${avatarHTML(tr.photo, tr.name)}<div><div class="small muted">Seu personal</div><strong>${esc(tr.name)}</strong>${tr.cref ? `<div class="small muted">CREF ${esc(tr.cref)}</div>` : ''}</div></div>` : ''}
      ${daysLeft !== null && daysLeft <= 7 ? `<div class="small" style="color:var(--gold-2);margin-top:10px">Seu acesso vence em ${daysLeft} dia(s). Fale com seu personal para renovar.</div>` : ''}
    </div>
    ${isAero ? `<div class="tabs st-tabs"><button data-action="st-tab" data-tab="aero" class="${ST.tab === 'aero' ? 'active' : ''}">Treino de hoje</button><button data-action="st-tab" data-tab="plano" class="${ST.tab === 'plano' ? 'active' : ''}">Plano</button>${hasForca ? `<button data-action="st-tab" data-tab="treino" class="${ST.tab === 'treino' ? 'active' : ''}">Força</button>` : ''}<button data-action="st-tab" data-tab="hist" class="${ST.tab === 'hist' ? 'active' : ''}">Histórico (${(ST.data.logs || []).length})</button></div>` : isSlides ? '' : `<div class="tabs st-tabs"><button data-action="st-tab" data-tab="treino" class="${ST.tab === 'treino' ? 'active' : ''}">Treino de hoje</button><button data-action="st-tab" data-tab="hist" class="${ST.tab === 'hist' ? 'active' : ''}">Histórico (${(ST.data.logs || []).length})</button><button data-action="st-tab" data-tab="info" class="${ST.tab === 'info' ? 'active' : ''}">Orientações</button></div>`}
    <div id="st-body"></div>`;
  if (isSlides) return renderStudentSlides(p);
  if (ST.tab === 'hist') return renderStudentHistory();
  if (ST.tab === 'info') return renderStudentInfo(p);
  if (isAero && ST.tab === 'aero') return renderStudentAero(p);
  if (isAero && ST.tab === 'plano') return renderStudentAeroPlan(p);
  renderStudentWorkout(p);
}
actions['st-tab'] = (el) => renderStudent(el.dataset.tab);
function renderStudentSlides(p) {
  const box = $('#st-body');
  const { student: st, trainer: tr } = ST.data;
  const bs = S.students, bt = S.trainers;
  S.students = st ? [{ ...st, id: p.studentId }] : [];
  S.trainers = tr ? [{ ...tr, id: p.trainerId }] : [];
  try {
    box.innerHTML = `<div class="stack" style="margin-top:14px">${(p.slides || []).map((s) => `<div class="slide-frame" ${frameAttrs(s.w, s.h)}>${pageSlideHTML(s, p)}</div>`).join('')}</div>`;
  } finally { S.students = bs; S.trainers = bt; }
  scaleFrames(box);
  new ResizeObserver(() => scaleFrames(box)).observe(box);
}
function renderStudentInfo(p) {
  const box = $('#st-body');
  const sec = (h, t) => (t && String(t).trim() ? `<div class="card"><h3>${h}</h3><p style="white-space:pre-line;margin:8px 0 0">${esc(t)}</p></div>` : '');
  box.innerHTML = `<div class="stack" style="margin-top:14px">
    ${sec('Sobre o programa', p.overview)}${sec('Aquecimento', p.warmup)}${sec('Progressão', p.objectives)}${sec('Recomendações', p.recommendations)}${sec('Intensidade (PSE)', p.pseNote)}</div>`;
}
function renderStudentHistory() {
  const box = $('#st-body');
  const logs = ST.data.logs || [];
  box.innerHTML = logs.length ? `<div class="stack" style="margin-top:14px">${logs.map((l) => `
    <div class="card"><div class="row"><strong>${new Date(l.log_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><span class="chip gold">${esc(l.workout_name || 'Treino')}</span><span class="spacer"></span><button class="btn sm ghost" data-action="st-del-log" data-id="${l.id}" title="Apagar registro">✕</button></div>
      <table class="tpl-table" style="margin-top:8px">${(l.exercises || []).map((x) => `<tr><td>${esc(x.name)}</td><td>${(x.sets || []).filter((s) => s.done).map((s) => `${esc(s.reps || '–')}${s.load ? ' × ' + esc(s.load) + 'kg' : ''}`).join(' · ') || '<span class="muted">—</span>'}</td></tr>`).join('')}</table>
      ${l.notes ? `<p class="small" style="margin:8px 0 0">💬 ${esc(l.notes)}</p>` : ''}</div>`).join('')}</div>`
    : '<div class="empty" style="margin-top:14px">Nenhum treino registrado ainda. Marque as séries no "Treino de hoje" e toque em "Concluir treino".</div>';
}
actions['st-del-log'] = async (el) => {
  if (!confirm('Apagar este registro de treino?')) return;
  const { data, error } = await sb.rpc('student_delete_log', { _code: ST.code, _id: el.dataset.id });
  if (error || (data && data.error)) { toast('Erro ao apagar'); return; }
  ST.data.logs = ST.data.logs.filter((l) => l.id !== el.dataset.id);
  renderStudent('hist');
};
function setCount(x) { const n = parseInt(x.sets, 10); return n > 0 && n < 15 ? n : (x.sets ? 1 : 0); }
function renderStudentWorkout(p) {
  const box = $('#st-body');
  const w = (p.workouts || []).find((x) => x.id === ST.wid);
  if (!w) { box.innerHTML = '<div class="empty">Programa sem treinos.</div>'; return; }
  const draft = loadDraft(w.id) || {};
  const last = lastLogFor(w.id);
  box.innerHTML = `
    <div class="row st-wsel">${p.workouts.map((x) => `<button class="btn sm ${x.id === w.id ? 'primary' : ''}" data-action="st-w" data-id="${x.id}">${esc(x.name)}</button>`).join('')}</div>
    <div class="st-wtitle"><h2>${esc(w.name)}</h2>${w.focus ? `<div class="small muted">${esc(w.focus)}</div>` : ''}${last ? `<div class="small muted">Feito pela última vez em ${new Date(last.log_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}</div>
    <div class="stack">${w.exercises.map((x, i) => {
      const n = setCount(x);
      const prev = lastSetsFor(x.id, x.name);
      const d = (draft.ex || {})[x.id] || {};
      return `<div class="card st-ex" data-ex="${x.id}">
        <div class="st-ex-top">
          ${x.image ? `<img src="${esc(photo(x.image))}" alt="" class="st-ex-img" data-action="st-zoom" data-src="${esc(photo(x.image))}">` : ''}
          <div style="flex:1;min-width:0"><div class="small muted">${pad2(i + 1)}${x.muscles ? ' · ' + esc(x.muscles) : ''}</div><h3>${esc(x.name)}</h3>
            <div class="meta" style="margin-top:6px">${x.sets || x.reps ? `<span class="chip gold">${esc(x.sets || '')}${x.sets && x.reps ? ' × ' : ''}${esc(x.reps || '')}</span>` : ''}${x.rest ? `<span class="chip">Descanso ${esc(fmtRest(x.rest))}</span>` : ''}${x.cadence ? `<span class="chip">Cadência ${esc(x.cadence)}</span>` : ''}${x.pse ? `<span class="chip">PSE ${esc(x.pse)}</span>` : ''}</div>
            ${prev ? `<div class="small" style="margin-top:6px;color:var(--gold-2)">Última vez: ${prev.sets.map((s) => `${esc(s.reps || '–')}${s.load ? '×' + esc(s.load) + 'kg' : ''}`).join(' · ')}</div>` : ''}</div>
        </div>
        ${x.execution || x.cautions || x.notes ? `<details class="st-how"><summary>Como fazer</summary>${x.execution ? `<p>${esc(x.execution)}</p>` : ''}${x.cautions ? `<p><b>Cuidados:</b> ${esc(x.cautions)}</p>` : ''}${x.notes ? `<p><b>Obs.:</b> ${esc(x.notes)}</p>` : ''}</details>` : ''}
        ${n ? `<div class="st-sets">${Array.from({ length: n }, (_, s) => {
          const ds = (d.sets || [])[s] || {};
          const ps = prev && prev.sets[s];
          return `<div class="st-set${ds.done ? ' done' : ''}">
            <span class="st-set-n">${s + 1}ª</span>
            <input type="text" inputmode="numeric" data-f="reps" data-s="${s}" value="${esc(ds.reps || '')}" placeholder="${esc(ps && ps.reps ? ps.reps : String(x.reps || 'reps').replace(/\/.*$/, ''))}" ${ps && ps.reps ? 'data-prev="1"' : ''} aria-label="Repetições">
            <span class="small muted">reps</span>
            <input type="text" inputmode="decimal" data-f="load" data-s="${s}" value="${esc(ds.load || '')}" placeholder="${esc(ps && ps.load ? ps.load : 'kg')}" ${ps && ps.load ? 'data-prev="1"' : ''} aria-label="Carga em kg">
            <span class="small muted">kg</span>
            <button class="st-check" data-action="st-check" data-s="${s}" aria-label="Série feita">${ds.done ? '✓' : ''}</button>
          </div>`;
        }).join('')}</div>` : `<div class="row" style="margin-top:10px"><button class="st-check wide${(d.sets || [])[0] && d.sets[0].done ? ' on' : ''}" data-action="st-check" data-s="0">${(d.sets || [])[0] && d.sets[0].done ? '✓ Feito' : 'Marcar como feito'}</button></div>`}
        ${x.rest ? `<button class="btn sm ghost st-rest" data-action="st-rest" data-rest="${esc(x.rest)}">⏱ Descanso ${esc(fmtRest(x.rest))}</button>` : ''}
      </div>`;
    }).join('')}</div>
    <div class="card stack" style="margin-top:14px">
      <label class="field"><span>Como foi o treino? (opcional)</span><textarea id="st-notes" rows="2" placeholder="Ex.: senti o joelho no agachamento">${esc(draft.notes || '')}</textarea></label>
      <button class="btn primary lg" data-action="st-finish">Concluir treino</button>
    </div>`;
  box.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-f]');
    if (inp) { setDraftValue(w.id, inp.closest('[data-ex]').dataset.ex, +inp.dataset.s, inp.dataset.f, inp.value); return; }
    if (e.target.id === 'st-notes') { const dr = loadDraft(w.id) || {}; dr.notes = e.target.value; saveDraft(w.id, dr); }
  });
}
function setDraftValue(wid, exId, s, field, value) {
  const dr = loadDraft(wid) || {};
  dr.ex = dr.ex || {};
  dr.ex[exId] = dr.ex[exId] || { sets: [] };
  dr.ex[exId].sets[s] = { ...(dr.ex[exId].sets[s] || {}), [field]: value };
  saveDraft(wid, dr);
  return dr.ex[exId].sets[s];
}
actions['st-w'] = (el) => { ST.wid = el.dataset.id; renderStudent('treino'); window.scrollTo(0, 0); };
actions['st-check'] = (el) => {
  const card = el.closest('[data-ex]');
  const s = +el.dataset.s;
  const row = el.closest('.st-set');
  const cur = (((loadDraft(ST.wid) || {}).ex || {})[card.dataset.ex] || { sets: [] }).sets[s] || {};
  // ao marcar sem digitar, usa o que estava sugerido (última vez / prescrito)
  if (!cur.done && row) {
    ['reps', 'load'].forEach((f) => {
      const inp = $(`[data-f="${f}"]`, row);
      // repete o que foi feito da última vez (não preenche com a faixa prescrita, ex.: 8–12)
      const exact = inp.dataset.prev || (f === 'reps' && /^\d+$/.test(inp.placeholder));
      if (!inp.value && exact) { inp.value = inp.placeholder; setDraftValue(ST.wid, card.dataset.ex, s, f, inp.value); }
    });
  }
  const v = setDraftValue(ST.wid, card.dataset.ex, s, 'done', !cur.done);
  if (row) { row.classList.toggle('done', v.done); el.textContent = v.done ? '✓' : ''; }
  else { el.classList.toggle('on', v.done); el.textContent = v.done ? '✓ Feito' : 'Marcar como feito'; }
  if (v.done && row) { const btn = $('.st-rest', card); if (btn) startRest(btn.dataset.rest); }
};
function startRest(rest) {
  const secs = parseInt(String(rest).replace(/\D/g, ''), 10) || 60;
  clearInterval(ST.timer);
  let left = /min/i.test(rest) ? secs * 60 : secs;
  let bar = $('#st-timer');
  if (!bar) { bar = document.createElement('div'); bar.id = 'st-timer'; bar.className = 'st-timer'; document.body.appendChild(bar); }
  const draw = () => { bar.innerHTML = `<span>Descanso</span><b>${Math.floor(left / 60)}:${pad2(left % 60)}</b><button class="btn sm" id="st-timer-x">Pular</button>`; $('#st-timer-x').onclick = stop; };
  const stop = () => { clearInterval(ST.timer); bar.remove(); };
  draw();
  ST.timer = setInterval(() => {
    left--;
    if (left <= 0) { stop(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); toast('Descanso terminado. Próxima série!'); return; }
    draw();
  }, 1000);
}
actions['st-rest'] = (el) => startRest(el.dataset.rest);
actions['st-zoom'] = (el) => openModal('Exercício', `<img src="${esc(el.dataset.src)}" alt="" style="width:100%;border-radius:10px">`);
actions['st-finish'] = async () => {
  const p = ST.data.program;
  const w = p.workouts.find((x) => x.id === ST.wid);
  const dr = loadDraft(w.id) || {};
  const exercises = w.exercises.map((x) => ({ ref: x.id, name: x.name, sets: (((dr.ex || {})[x.id] || {}).sets || []).map((s) => ({ reps: (s && s.reps) || '', load: (s && s.load) || '', done: !!(s && s.done) })) }));
  const doneCount = exercises.filter((x) => x.sets.some((s) => s.done)).length;
  if (!doneCount && !confirm('Nenhuma série marcada como feita. Registrar mesmo assim?')) return;
  const log = { workout_ref: w.id, workout_name: w.name, exercises, notes: dr.notes || '' };
  const res = await withBusy('Salvando treino…', async () => {
    const { data, error } = await sb.rpc('student_save_log', { _code: ST.code, _log: log });
    if (error) throw error;
    if (data && data.error) throw new Error(STUDENT_ERRORS[data.error] || data.error);
    return data;
  });
  if (!res) return;
  lsSet(draftKey(w.id), null);
  ST.data.logs = [{ ...log, id: res.id, log_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) }, ...(ST.data.logs || [])];
  ST.wid = null;
  toast(`Treino concluído! ${doneCount} exercício(s) registrados. 💪`);
  renderStudent('hist');
  window.scrollTo(0, 0);
};

/* ---- Recorte de imagem ---- */
const CROP_PRESETS = {
  full: { x: 0, y: 0, w: 1, h: 1 },
  left: { x: 0, y: 0, w: 0.43, h: 1 },
  right: { x: 0.48, y: 0, w: 0.52, h: 1 },
  center: { x: 0.25, y: 0, w: 0.5, h: 1 },
};
const PRESET_LABELS = { full: 'Página inteira', left: 'Foto à esquerda', right: 'Foto à direita', center: 'Centro' };
function openCrop({ src, preset = 'full', onDone }) {
  const body = openModal('Recortar imagem', `
    <div class="row" style="margin-bottom:12px">${Object.entries(PRESET_LABELS).map(([k, v]) => `<button class="btn sm" data-preset="${k}">${v}</button>`).join('')}</div>
    <div class="crop-wrap" id="crop-wrap"><img src="${esc(src)}" alt="" draggable="false"><div class="crop-box" id="crop-box">
      <span class="crop-handle nw" data-h="nw"></span><span class="crop-handle ne" data-h="ne"></span><span class="crop-handle sw" data-h="sw"></span><span class="crop-handle se" data-h="se"></span></div></div>
    <p class="small muted">Arraste a área clara para mover; arraste os cantos para ajustar.</p>
    <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="crop-ok">Usar imagem</button></div>`, { wide: true });
  const wrap = $('#crop-wrap', body), box = $('#crop-box', body);
  let c = { ...CROP_PRESETS[preset] };
  const draw = () => Object.assign(box.style, { left: c.x * 100 + '%', top: c.y * 100 + '%', width: c.w * 100 + '%', height: c.h * 100 + '%' });
  draw();
  $$('[data-preset]', body).forEach((b) => b.addEventListener('click', () => { c = { ...CROP_PRESETS[b.dataset.preset] }; draw(); }));
  let drag = null;
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    drag = { h: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, c0: { ...c }, W: r.width, H: r.height };
    box.setPointerCapture(e.pointerId);
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / drag.W, dy = (e.clientY - drag.sy) / drag.H;
    const o = drag.c0, MIN = 0.05;
    let { x, y, w, h } = o;
    if (drag.h === 'move') {
      x = Math.min(Math.max(0, o.x + dx), 1 - o.w);
      y = Math.min(Math.max(0, o.y + dy), 1 - o.h);
    } else {
      if (drag.h.includes('w')) { x = Math.min(Math.max(0, o.x + dx), o.x + o.w - MIN); w = o.x + o.w - x; }
      if (drag.h.includes('e')) { w = Math.min(Math.max(MIN, o.w + dx), 1 - o.x); }
      if (drag.h.includes('n')) { y = Math.min(Math.max(0, o.y + dy), o.y + o.h - MIN); h = o.y + o.h - y; }
      if (drag.h.includes('s')) { h = Math.min(Math.max(MIN, o.h + dy), 1 - o.y); }
    }
    c = { x, y, w, h };
    draw();
  });
  const end = () => { drag = null; };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  $('#crop-ok', body).addEventListener('click', async () => {
    const url = await compressImage(src, 1400, 0.86, c);
    closeModal();
    onDone(url);
  });
}

/* ---- Seletor de páginas de PDF ---- */
function openPagePicker({ pdfId, multi = false, slides = false, title, onPick, onPickMany }) {
  if (!S.pdfs.length) {
    openModal(title, `<p>Nenhum PDF na biblioteca ainda.</p><div class="row"><button class="btn primary" id="pp-up">Enviar um PDF</button></div>`);
    $('#pp-up').onclick = async () => {
      const [f] = await pickFile('application/pdf');
      if (!f) return;
      const meta = await withBusy('Lendo o PDF…', () => addPdfFile(f));
      if (meta) openPagePicker({ pdfId: meta.id, multi, slides, title, onPick, onPickMany });
    };
    return;
  }
  const pdfs = S.pdfs.slice().sort((a, b) => (a.generated - b.generated) || b.updatedAt - a.updatedAt);
  let cur = byId(S.pdfs, pdfId) ? pdfId : pdfs[0].id;
  const selected = new Set();
  const body = openModal(title, `
    <div class="row" style="margin-bottom:12px">
      <select id="pp-pdf" style="max-width:420px">${pdfs.map((x) => `<option value="${esc(x.id)}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)} (${x.pages} pág.)</option>`).join('')}</select>
      <button class="btn sm" id="pp-up">Enviar outro PDF</button>
    </div>
    ${multi ? `<div class="card row small" style="margin-bottom:12px;padding:12px">
        <span>${slides ? 'Selecione os slides para adicionar.' : 'Selecione as páginas dos exercícios (uma página = um exercício).'}</span><span class="spacer"></span>
        <label class="row" style="${slides ? 'display:none' : ''}">Recorte da foto: <select id="pp-preset" style="width:auto">${['left', 'right', 'full'].map((k) => `<option value="${k}">${PRESET_LABELS[k]}</option>`).join('')}</select></label>
        <button class="btn primary sm" id="pp-go" disabled>Importar 0 páginas</button></div>` : '<p class="small muted" style="margin-top:0">Toque na página para escolher e depois ajuste o recorte.</p>'}
    <div class="pages-grid" id="pp-grid"></div>`, { wide: true });
  const token = ++modalToken;
  const grid = $('#pp-grid', body);
  const updateGo = () => { const b = $('#pp-go', body); if (b) { b.disabled = !selected.size; b.textContent = `Importar ${selected.size} página(s)`; } };
  const load = async () => {
    const meta = byId(S.pdfs, cur);
    selected.clear(); updateGo();
    grid.innerHTML = Array.from({ length: meta.pages }, (_, i) => `<div class="page-tile" data-page="${i + 1}"><img alt=""><span class="pn">${i + 1}</span></div>`).join('');
    const myCur = cur;
    for (let n = 1; n <= meta.pages; n++) {
      if (token !== modalToken || myCur !== cur) return;
      try {
        const url = await renderPage(myCur, n, 360);
        const img = $(`[data-page="${n}"] img`, grid);
        if (img && myCur === cur) img.src = url;
      } catch (e) { console.warn(e); }
    }
  };
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.page-tile');
    if (!t) return;
    const n = +t.dataset.page;
    if (multi) {
      if (selected.has(n)) { selected.delete(n); t.style.borderColor = ''; } else { selected.add(n); t.style.borderColor = 'var(--gold)'; }
      t.querySelector('.pn').style.background = selected.has(n) ? 'var(--gold)' : '';
      t.querySelector('.pn').style.color = selected.has(n) ? '#000' : '';
      updateGo();
    } else {
      closeModal();
      onPick(cur, n);
    }
  });
  $('#pp-pdf', body).addEventListener('change', (e) => { cur = e.target.value; load(); });
  $('#pp-up', body).addEventListener('click', async () => {
    const [f] = await pickFile('application/pdf');
    if (!f) return;
    const meta = await withBusy('Lendo o PDF…', () => addPdfFile(f));
    if (meta) openPagePicker({ pdfId: meta.id, multi, slides, title, onPick, onPickMany });
  });
  if (multi) {
    $('#pp-go', body).addEventListener('click', () => {
      const pages = [...selected].sort((a, b) => a - b);
      const preset = $('#pp-preset', body).value;
      closeModal();
      onPickMany(cur, pages, preset);
    });
  }
  load();
}

/* =========================================================
 * Telas: Alunos / Personais
 * ======================================================= */
const KIND = {
  students: {
    title: 'Alunos', one: 'aluno',
    fields: [['phone', 'WhatsApp (com DDD)', 'tel'], ['sex', 'Sexo', 'select', TAGS.sex.opts], ['age', 'Idade', 'number'],
      ['obj', 'Objetivo', 'select', TAGS.obj.opts], ['level', 'Nível', 'select', TAGS.level.opts], ['env', 'Onde treina', 'select', TAGS.env.opts],
      ['notes', 'Observações (lesões, restrições…)', 'area']],
  },
  trainers: {
    title: 'Personais', one: 'personal',
    fields: [['cref', 'CREF', 'text'], ['formacao', 'Formação', 'area'], ['experiencia', 'Experiência', 'area'], ['especializacoes', 'Especializações', 'area'], ['metodologia', 'Metodologia', 'area']],
  },
};
function viewPeople(kind) {
  const K = KIND[kind];
  const list = S[kind].slice().sort((a, b) => a.name.localeCompare(b.name));
  const count = (id) => S.programs.filter((p) => (kind === 'students' ? p.studentId : p.trainerId) === id).length;
  app.innerHTML = `
    <div class="page-head"><div><h1>${K.title}</h1><p class="muted">${list.length} cadastrado(s)</p></div>
      <button class="btn primary" data-action="new-person" data-kind="${kind}">+ Novo ${K.one}</button></div>
    ${list.length ? `<div class="grid cards">${list.map((x) => `
      <div class="card person">${avatarHTML(x.photo, x.name, 'lg')}
        <div class="info"><h3>${esc(x.name)}</h3><div class="small muted">${kind === 'trainers' && x.cref ? 'CREF ' + esc(x.cref) + ' · ' : ''}${count(x.id)} programa(s)</div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm" data-action="edit-person" data-kind="${kind}" data-id="${esc(x.id)}">Editar</button>
            ${kind === 'students' ? `<button class="btn sm primary" data-action="student-new-program" data-id="${esc(x.id)}">Novo programa</button><button class="btn sm" data-action="filter-student" data-id="${esc(x.id)}">Programas</button>` : ''}
            <button class="btn sm danger" data-action="del-person" data-kind="${kind}" data-id="${esc(x.id)}">✕</button>
          </div></div></div>`).join('')}</div>`
    : `<div class="empty"><h2>Nenhum ${K.one} cadastrado</h2><p>Cadastre nome e foto para aparecerem na capa do PDF.</p><button class="btn primary" data-action="new-person" data-kind="${kind}">+ Novo ${K.one}</button></div>`}`;
}
actions['filter-student'] = (el) => { const st = byId(S.students, el.dataset.id); S.ui.q = st ? st.name : ''; location.hash = '#/'; };
actions['student-new-program'] = (el) => { W2.studentId = el.dataset.id; W2.tplId = ''; location.hash = '#/novo'; };
actions['new-person'] = (el) => personForm(el.dataset.kind, null, !!el.dataset.assign);
actions['edit-person'] = (el) => personForm(el.dataset.kind, byId(S[el.dataset.kind], el.dataset.id), !!el.dataset.assign);
actions['del-person'] = async (el) => {
  const kind = el.dataset.kind;
  const x = byId(S[kind], el.dataset.id);
  if (!confirm(`Excluir ${x.name}? Os programas continuam salvos, mas ficam sem ${KIND[kind].one}.`)) return;
  await removeEntity(kind, x.id);
  viewPeople(kind);
};
function personForm(kind, rec, assign, onSaved) {
  const K = KIND[kind];
  const x = rec ? clone(rec) : { id: uid(), name: '', photo: '' };
  const body = openModal(rec ? `Editar ${K.one}` : `Novo ${K.one}`, `
    <div class="stack">
      <div class="photo-pick"><span id="pf-av">${avatarHTML(x.photo, x.name, 'xl')}</span>
        <div class="stack" style="gap:8px"><button class="btn sm" id="pf-photo">Escolher foto</button><button class="btn sm ghost" id="pf-nophoto">Remover foto</button></div></div>
      <label class="field"><span>Nome completo</span><input type="text" id="pf-name" value="${esc(x.name)}" placeholder="Nome"></label>
      <div class="grid two" style="gap:12px">${K.fields.filter(([, , t]) => t !== 'area').map(([k, l, t, opts]) => `<label class="field"><span>${l}</span>${t === 'select'
        ? `<select id="pf-${k}"><option value="">—</option>${Object.entries(opts).map(([v, lb]) => `<option value="${v}" ${x[k] === v ? 'selected' : ''}>${esc(lb)}</option>`).join('')}</select>`
        : `<input type="${t === 'number' ? 'number' : t === 'tel' ? 'tel' : 'text'}" id="pf-${k}" value="${esc(x[k] || '')}" ${t === 'number' ? 'min="10" max="99"' : ''}>`}</label>`).join('')}</div>
      ${K.fields.filter(([, , t]) => t === 'area').map(([k, l]) => `<label class="field"><span>${l}</span><textarea id="pf-${k}" rows="2">${esc(x[k] || '')}</textarea></label>`).join('')}
      <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="pf-save">Salvar</button></div>
    </div>`);
  const refreshAv = () => { $('#pf-av', body).innerHTML = avatarHTML(x.photo, $('#pf-name', body).value, 'xl'); };
  $('#pf-photo', body).onclick = async () => {
    const [f] = await pickFile('image/*');
    if (!f) return;
    x.photo = await compressImage(f, 900, 0.88);
    refreshAv();
  };
  $('#pf-nophoto', body).onclick = () => { x.photo = ''; refreshAv(); };
  $('#pf-name', body).focus();
  $('#pf-save', body).onclick = async () => {
    x.name = $('#pf-name', body).value.trim();
    if (!x.name) { toast('Informe o nome'); return; }
    K.fields.forEach(([k]) => { x[k] = $(`#pf-${k}`, body).value.trim(); });
    await saveEntity(kind, x);
    if (kind === 'trainers' && !S.settings.defaultTrainerId) { S.settings.defaultTrainerId = x.id; await saveSettings(); }
    closeModal();
    toast('Salvo');
    if (onSaved) { onSaved(x); return; }
    if (location.hash.startsWith('#/novo')) { viewWizard(); return; }
    if (!location.hash || location.hash === '#/') { viewHome(); return; }
    if (assign && E.p && location.hash.startsWith('#/programa/')) {
      if (kind === 'students') E.p.studentId = x.id; else E.p.trainerId = x.id;
      saveSoon();
      renderEditor();
    } else if (location.hash.startsWith('#/alunos') || location.hash.startsWith('#/personais')) {
      viewPeople(kind);
    }
  };
}

/* =========================================================
 * Telas: PDFs
 * ======================================================= */
function viewPdfs() {
  const f = S.ui.pf;
  app.innerHTML = `
    <div class="page-head"><div><h1>Meus PDFs</h1><p class="muted" id="pdf-count"></p><p class="small muted" style="margin:4px 0 0;max-width:640px">Opcional: envie PDFs próprios para guardar, importar slides e editar. Todos os programas do App já estão na Biblioteca.</p></div>
      <button class="btn primary" data-action="upload-pdfs">+ Enviar PDFs</button></div>
    <div id="cloudlib"></div>
    ${S.pdfs.length ? `<div class="toolbar">
      <input type="search" id="pdf-q" placeholder="Buscar por nome ou código…" value="${esc(S.ui.pq)}" style="max-width:240px">
      ${tagSelects(f, 'pf-', S.pdfs.map((x) => x.tags))}
      <select id="pdf-type" style="max-width:190px">
        <option value="">Todos os PDFs</option>
        <option value="orig" ${S.ui.ptype === 'orig' ? 'selected' : ''}>Originais enviados</option>
        <option value="gen" ${S.ui.ptype === 'gen' ? 'selected' : ''}>Gerados pelo app</option>
        <option value="untag" ${S.ui.ptype === 'untag' ? 'selected' : ''}>Sem etiquetas</option>
      </select>
      <button class="btn sm ghost" data-action="pdf-clear-filters">Limpar filtros</button>
    </div>` : ''}
    <div id="pdflist"></div>`;
  if (S.pdfs.length) {
    $('#pdf-q').addEventListener('input', (e) => { S.ui.pq = e.target.value; renderPdfList(); });
    $('#pdf-type').addEventListener('change', (e) => { S.ui.ptype = e.target.value; renderPdfList(); });
    $$('[data-tagfilter]', app).forEach((sel) => sel.addEventListener('change', () => { S.ui.pf[sel.dataset.tagfilter] = sel.value; viewPdfs(); }));
  }
  renderPdfList();
  renderCloudLib();
}
actions['pdf-clear-filters'] = () => { S.ui.pf = {}; S.ui.pq = ''; S.ui.ptype = ''; viewPdfs(); };
function renderPdfList() {
  const box = $('#pdflist');
  if (!box) return;
  const f = S.ui.pf, q = S.ui.pq.trim().toLowerCase();
  const prog = (x) => byId(S.programs, x.programId) || S.programs.find((p) => p.sourcePdfId === x.id);
  const list = S.pdfs
    .filter((x) => tagMatch(x.tags, f))
    .filter((x) => !S.ui.ptype || (S.ui.ptype === 'gen' ? x.generated : S.ui.ptype === 'orig' ? !x.generated : !hasTags(x.tags)))
    .filter((x) => !q || `${x.name} ${x.title || ''} ${x.code || ''}`.toLowerCase().includes(q))
    .sort((a, b) => (a.code || '~' + a.name).localeCompare(b.code || '~' + b.name));
  const cnt = $('#pdf-count');
  if (cnt) cnt.textContent = S.pdfs.length ? `${list.length} de ${S.pdfs.length} PDF(s)` : 'PDFs enviados e PDFs gerados pelo app';
  if (!S.pdfs.length) {
    box.innerHTML = `<div class="empty"><h2>Nenhum PDF seu neste aparelho</h2><p>Os PDFs da Biblioteca ficam na nuvem, logo acima. Aqui você pode enviar PDFs próprios. O app lê o código de cada programa (ex.: HIP-M-20-29-INI-ACA) e etiqueta sozinho.</p><button class="btn primary" data-action="upload-pdfs">+ Enviar PDFs</button></div>`;
    return;
  }
  const nUntag = libraryPdfs().filter((x) => !hasTags(x.tags)).length;
  const banner = nUntag && S.ui.ptype !== 'untag' ? `<div class="card small" style="margin-bottom:12px;border-color:#5a4a2c">⚠ ${nUntag} PDF(s) sem etiquetas não aparecem nos filtros. <a href="#/pdfs" data-action="show-untagged">Ver e etiquetar</a></div>` : '';
  if (!list.length) { box.innerHTML = banner + '<div class="empty">Nenhum PDF com essa combinação de filtros. Os números entre parênteses em cada filtro mostram quantos PDFs existem para cada opção.</div>'; return; }
  box.innerHTML = banner + `<div class="stack">${list.map((x) => {
    const p = prog(x);
    return `<div class="card pdf-item">
      ${x.thumb ? `<img class="pdf-thumb" src="${esc(x.thumb)}" alt="">` : '<span class="pdf-thumb"></span>'}
      <div style="flex:1;min-width:0">
        <h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pdfTitle(x))}</h3>
        <div class="small muted">${x.title && x.title !== x.name ? 'Arquivo: ' + esc(x.name) + ' · ' : ''}${x.code ? esc(x.code) + ' · ' : ''}${x.pages} páginas · ${fmtSize(x.size)}</div>
        <div class="row" style="margin-top:6px;gap:6px">${tagChips(x.tags) || '<span class="chip">Sem etiquetas</span>'}
          ${x.generated ? '<span class="chip gold">Gerado pelo app</span>' : ''}
          ${p ? `<a class="chip" href="#/programa/${esc(p.id)}">Programa: ${esc(p.title)}</a>` : ''}</div>
      </div>
      <div class="row" style="gap:6px;justify-content:flex-end">
        <a class="btn sm" href="#/pdf/${esc(x.id)}">Abrir</a>
        ${x.generated ? '' : `<button class="btn sm" data-action="pdf-to-program" data-id="${esc(x.id)}">Criar programa</button>`}
        <button class="btn sm" data-action="edit-tags" data-id="${esc(x.id)}">Etiquetas</button>
        <button class="btn sm" data-action="dl-pdf" data-id="${esc(x.id)}">Baixar</button>
        <button class="btn sm danger" data-action="del-pdf" data-id="${esc(x.id)}">✕</button>
      </div></div>`;
  }).join('')}</div>`;
}
actions['edit-tags'] = (el) => {
  const meta = byId(S.pdfs, el.dataset.id);
  const t = { ...(meta.tags || {}) };
  const body = openModal('Etiquetas do PDF', `
    <div class="stack">
      <p class="small muted" style="margin:0">${esc(pdfTitle(meta))}</p>
      <label class="field"><span>Código do programa</span><input type="text" id="tg-code" value="${esc(meta.code || '')}" placeholder="Ex.: HIP-F-30-39-INT-ACA"><span class="hint">Digite o código para preencher tudo automaticamente.</span></label>
      <div class="grid two">${TAG_KEYS.map((k) => `<label class="field"><span>${TAGS[k].label}</span><select id="tg-${k}"><option value="">—</option>${Object.entries(TAGS[k].opts).map(([v, l]) => `<option value="${v}" ${t[k] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>
      <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="tg-save">Salvar</button></div>
    </div>`);
  $('#tg-code', body).addEventListener('input', (e) => {
    const c = parseCode(e.target.value);
    if (c) TAG_KEYS.forEach((k) => { $(`#tg-${k}`, body).value = c[k]; });
  });
  $('#tg-save', body).onclick = async () => {
    const c = parseCode($('#tg-code', body).value);
    meta.tags = Object.fromEntries(TAG_KEYS.map((k) => [k, $(`#tg-${k}`, body).value]).filter(([, v]) => v));
    meta.code = c ? c.code : '';
    meta.title = c && CATALOG[c.code] ? CATALOG[c.code][0] : meta.title;
    meta.tagsChecked = true;
    await saveEntity('pdfs', meta);
    closeModal();
    toast('Etiquetas salvas');
    if (location.hash.startsWith('#/pdf/')) viewPdf(meta.id); else renderPdfList();
  };
};
actions['upload-pdfs'] = async () => {
  const files = await pickFile('application/pdf', true);
  if (!files.length) return;
  const ok = await withBusy('Lendo PDFs…', async (prog) => {
    for (let i = 0; i < files.length; i++) { prog(i / files.length, files[i].name); await addPdfFile(files[i]); }
    return true;
  });
  if (ok) toast(`${files.length} PDF(s) adicionados`);
  viewPdfs();
};
actions['dl-pdf'] = async (el) => {
  const meta = byId(S.pdfs, el.dataset.id);
  const rec = await DB.get('pdfblobs', meta.id);
  if (rec) downloadBlob(rec.blob, meta.name + '.pdf');
};
actions['del-pdf'] = async (el) => {
  const meta = byId(S.pdfs, el.dataset.id);
  if (!confirm(`Excluir o PDF "${meta.name}"? As imagens já usadas nos programas continuam salvas.`)) return;
  await deletePdf(meta.id);
  if (location.hash.startsWith('#/pdf/')) location.hash = '#/pdfs'; else viewPdfs();
};
async function viewPdf(id) {
  const meta = byId(S.pdfs, id);
  if (!meta) { location.hash = '#/pdfs'; return; }
  app.innerHTML = `
    <div class="page-head"><div><a class="btn ghost sm" href="#/pdfs">← PDFs</a><h1 style="margin-top:6px">${esc(pdfTitle(meta))}</h1><p class="muted">${meta.code ? esc(meta.code) + ' · ' : ''}${meta.pages} páginas · ${fmtSize(meta.size)}</p><div class="row" style="gap:6px">${tagChips(meta.tags)}<button class="btn sm ghost" data-action="edit-tags" data-id="${esc(id)}">Editar etiquetas</button></div></div>
      <div class="row">
        <button class="btn" data-action="dl-pdf" data-id="${esc(id)}">Baixar</button>
        <button class="btn danger" data-action="del-pdf" data-id="${esc(id)}">Excluir</button>
      </div></div>
    <div class="card pv-bar">
      <div class="row">
        <button class="btn primary" data-action="pv-import-all">Importar programa inteiro (${meta.pages} slides)</button>
        <button class="btn" id="pv-import-sel" data-action="pv-import-sel" disabled>Importar selecionados</button>
        <span class="spacer"></span>
        <span class="small muted" id="pv-count"></span>
        <button class="btn sm ghost" data-action="pv-all">Selecionar todos</button>
        <button class="btn sm ghost" data-action="pv-none">Limpar</button>
      </div>
      <div class="small muted" style="margin-top:8px">Toque nos slides para selecionar. Depois de importar, cada slide pode ser editado: cobrir e reescrever textos, trocar fotos, colocar nome e foto do aluno e do personal.
        ${meta.code && libraryEntry(meta.code) ? ` Alternativa: <a href="#" data-action="pdf-to-template" data-id="${esc(id)}">montar no modelo do app</a> (treinos e exercícios em formulário).` : ''}</div>
    </div>
    <div class="pages-grid" id="pv-grid">${Array.from({ length: meta.pages }, (_, i) => `<div class="page-tile" data-page="${i + 1}"><img alt=""><span class="pn">${i + 1}</span><span class="pick">✓</span><button class="zoom" title="Ampliar">🔍</button></div>`).join('')}</div>`;
  if (PV.pdfId !== id) { PV.pdfId = id; PV.sel = new Set(); }
  updatePvBar();
  const grid = $('#pv-grid');
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.page-tile');
    if (!t) return;
    const n = +t.dataset.page;
    if (e.target.closest('.zoom')) { openPageView(id, n); return; }
    if (PV.sel.has(n)) PV.sel.delete(n); else PV.sel.add(n);
    updatePvBar();
  });
  const h = location.hash;
  for (let n = 1; n <= meta.pages; n++) {
    if (location.hash !== h) return;
    try { const url = await renderPage(id, n, 360); const img = $(`[data-page="${n}"] img`, grid); if (img) img.src = url; } catch (e) { console.warn(e); }
  }
}
actions['pdf-to-program'] = (el) => createSlideProgram(el.dataset.id);
actions['pdf-to-template'] = (el) => createProgramFromPdf(el.dataset.id);
async function openPageView(pdfId, n) {
  const meta = byId(S.pdfs, pdfId);
  const body = openModal(`Página ${n} de ${meta.pages}`, `<div class="page-view"><img id="pv-img" alt=""><div class="row">
      <button class="btn sm" id="pv-prev" ${n <= 1 ? 'disabled' : ''}>← Anterior</button><button class="btn sm" id="pv-next" ${n >= meta.pages ? 'disabled' : ''}>Próxima →</button>
      <span class="spacer"></span><button class="btn sm" id="pv-copy">Copiar texto</button></div>
      <div class="field"><span>Texto encontrado na página</span><div class="page-text" id="pv-text">Lendo…</div></div></div>`, { wide: true });
  $('#pv-prev', body).onclick = () => openPageView(pdfId, n - 1);
  $('#pv-next', body).onclick = () => openPageView(pdfId, n + 1);
  $('#pv-img', body).src = await renderPage(pdfId, n, 1400);
  let txt = '';
  try { txt = await pageText(pdfId, n); } catch (e) { /* ignore */ }
  const tEl = $('#pv-text', body);
  if (tEl) tEl.textContent = txt || 'Nenhum texto selecionável nesta página (o conteúdo está dentro da imagem).';
  $('#pv-copy', body).onclick = () => { navigator.clipboard.writeText(txt).then(() => toast('Texto copiado'), () => toast('Não foi possível copiar')); };
}

/* =========================================================
 * Tela: Ajustes e backup
 * ======================================================= */
function viewConfig() {
  app.innerHTML = `
    <div class="page-head"><div><h1>Ajustes</h1><p class="muted">Conta, perfil, padrões e cópia de segurança</p></div></div>
    <div class="stack">
      ${cloudCardHTML()}
      ${licAdminHTML()}
      ${cloudPublishHTML()}
      <div class="card stack">
        <h2>Seu perfil de personal</h2>
        <p class="muted" style="margin:0">Nome, foto, CREF e apresentação que aparecem nos programas.</p>
        <div class="row">${S.trainers.map((t) => `<span class="row" style="gap:8px">${avatarHTML(t.photo, t.name)}<b>${esc(t.name)}</b></span>`).join('')}
          <a class="btn sm" href="#/personais">${S.trainers.length ? 'Editar perfil' : 'Cadastrar perfil'}</a></div>
      </div>
      <div class="card stack">
        <h2>Padrões</h2>
        <label class="field"><span>Marca no rodapé do PDF</span><input type="text" id="cf-brand" value="${esc(S.settings.brand)}"></label>
        <div class="grid two">
          <label class="field"><span>Visual padrão de novos programas</span><select id="cf-theme">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${S.settings.theme === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="field"><span>Personal padrão</span><select id="cf-trainer">${optList(S.trainers, S.settings.defaultTrainerId, 'Nenhum')}</select></label>
        </div>
        <div class="row"><span class="spacer"></span><button class="btn primary" data-action="save-config">Salvar ajustes</button></div>
      </div>
      <div class="card stack">
        <h2>Cópia de segurança</h2>
        <p class="muted" style="margin:0">Os dados ficam salvos <b>neste navegador, neste aparelho</b>. Faça uma cópia de segurança com frequência e use-a para levar tudo para outro aparelho.</p>
        <label class="row"><input type="checkbox" id="bk-pdfs"> Incluir os arquivos PDF na cópia (arquivo fica maior)</label>
        <div class="row"><button class="btn" data-action="backup">Baixar cópia de segurança</button><button class="btn" data-action="restore">Restaurar de um arquivo</button></div>
      </div>
      <div class="card small muted">Espaço usado: <span id="cf-usage">calculando…</span></div>
    </div>`;
  bindLicAdmin();
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((e) => { $('#cf-usage').textContent = `${fmtSize(e.usage || 0)} de ${fmtSize(e.quota || 0)} disponíveis`; });
  } else $('#cf-usage').textContent = 'indisponível';
}
actions['save-config'] = async () => {
  S.settings.brand = $('#cf-brand').value.trim();
  S.settings.theme = $('#cf-theme').value;
  S.settings.defaultTrainerId = $('#cf-trainer').value;
  await saveSettings();
  toast('Ajustes salvos');
};
const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
actions.backup = async () => {
  const withPdfs = $('#bk-pdfs').checked;
  const data = await withBusy('Preparando cópia…', async () => {
    const programs = [];
    for (const pr of S.programs) {
      const c = structuredClone(pr);
      for (const sl of c.slides || []) if (sl.bg instanceof Blob) sl.bg = await blobToDataURL(sl.bg);
      programs.push(c);
    }
    const out = { app: 'gallo-programas', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, programs, students: S.students, trainers: S.trainers, pdfs: [] };
    if (withPdfs) {
      for (const m of S.pdfs) {
        const rec = await DB.get('pdfblobs', m.id);
        out.pdfs.push({ ...m, data: rec ? await blobToDataURL(rec.blob) : null });
      }
    }
    return out;
  });
  if (!data) return;
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `backup-programas-${new Date().toISOString().slice(0, 10)}.json`);
};
actions.restore = async () => {
  const [f] = await pickFile('application/json,.json');
  if (!f) return;
  const ok = await withBusy('Restaurando…', async () => {
    const data = JSON.parse(await f.text());
    if (data.app !== 'gallo-programas') throw new Error('Arquivo não é uma cópia deste app');
    for (const pr of data.programs || []) for (const sl of pr.slides || []) if (typeof sl.bg === 'string' && sl.bg.startsWith('data:')) sl.bg = await (await fetch(sl.bg)).blob();
    for (const k of ['programs', 'students', 'trainers']) for (const x of data[k] || []) { await DB.put(k, x); upsert(S[k], x); }
    for (const m of data.pdfs || []) {
      if (!m.data) continue;
      const blob = await (await fetch(m.data)).blob();
      const { data: _d, ...meta } = m;
      await DB.put('pdfblobs', { id: m.id, blob });
      await DB.put('pdfs', meta);
      upsert(S.pdfs, meta);
    }
    return true;
  });
  if (ok) { toast('Cópia restaurada'); viewConfig(); }
};

/* =========================================================
 * Programa Aeróbico (prescrição individualizada por zonas)
 * ======================================================= */
const AERO_OBJ = { EMA: 'Emagrecimento', EST: 'Redução do estresse', PER: 'Performance' };
const AERO_ZONES = {
  reg: { label: 'Regenerativa', lo: 0.28, hi: 0.42, cls: 'z-reg' },
  lip: { label: 'Lipolítica', lo: 0.43, hi: 0.58, cls: 'z-lip' },
  gli: { label: 'Glicolítica', lo: 0.60, hi: 0.70, cls: 'z-gli' },
};
const AERO_MUSC = {
  RML: 'Musculação RML (40% a 60% de 1RM)',
  FD: 'Musculação Força Dinâmica (60% a 70% de 1RM)',
};
const AERO_TEMPLATE = [
  { fase: 1, micro: 'Microciclo introdutório', dias: [40, 42, 44, 40, 46, 48, 'R'] },
  { fase: 1, micro: 'Microciclo condicionante', dias: [47, 47, 47, 43, 39, 35, 'R'] },
  { fase: 2, micro: 'Microciclo condicionante 1', dias: [49, 49, 49, 45, 41, 38, 'R'] },
  { fase: 2, micro: 'Microciclo condicionante 2', dias: [51, 51, 51, 47, 43, 39, 'R'] },
  { fase: 3, micro: 'Microciclo condicionante 1', dias: [49, 'RML', 49, 'RML', 49, 45, 'R'] },
  { fase: 3, micro: 'Microciclo condicionante 2', dias: [49, 'RML', 49, 'RML', 49, 45, 'R'] },
  { fase: 4, micro: 'Microciclo condicionante 1', dias: [45, 'FD', 45, 'FD', 45, 41, 'R'] },
  { fase: 4, micro: 'Microciclo condicionante 2', dias: [45, 'FD', 45, 'FD', 45, 41, 'R'] },
  { fase: 5, micro: 'Microciclo de recuperação', dias: [49, 45, 41, 37, 45, 41, 'R'] },
];
const AERO_MODAL = ['Esteira', 'Bicicleta ergométrica', 'Elíptico', 'Remo ergômetro', 'Caminhada ao ar livre', 'Corrida ao ar livre', 'Natação', 'Outra'];
const AERO_EXAMS = [
  ['ct', 'Colesterol total', 'mg/dL'], ['ldl', 'LDL colesterol', 'mg/dL'], ['vldl', 'VLDL colesterol', 'mg/dL'], ['hdl', 'HDL colesterol', 'mg/dL'],
  ['tg', 'Triglicerídeos', 'mg/dL'], ['glic', 'Glicemia', 'mg/dL'], ['hem', 'Hemácias', 'milhões/mm³'], ['hb', 'Hemoglobina', 'g/dL'],
  ['hba1c', 'Hemoglobina glicada', '%'], ['ins', 'Insulina', 'µUI/mL'], ['au', 'Ácido úrico', 'mg/dL'], ['so2', 'SO2 (saturação de O2)', '%'],
];
const aeroNum = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const aeroFmt = (n, d = 1) => (n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
function aeroDefaultZone(obj, fase, min) {
  if (fase === 5) return 'reg';
  if (obj === 'EST') return 'reg';
  if (obj === 'PER') return min <= 45 ? 'gli' : 'lip';
  return 'lip';
}
function aeroPlan(obj) {
  return AERO_TEMPLATE.map((w) => ({
    fase: w.fase, micro: w.micro,
    dias: w.dias.map((d) => (typeof d === 'number' ? { t: 'aero', min: String(d), zona: aeroDefaultZone(obj, w.fase, d) } : { t: d })),
  }));
}
function newAeroProgram(obj, studentId) {
  return newProgram({
    mode: 'aero',
    title: `Programa Aeróbico · ${AERO_OBJ[obj] || ''}`,
    studentId: studentId || '',
    weeks: String(AERO_TEMPLATE.length),
    frequency: '6x/semana',
    structure: '5 fases · aeróbico por zonas + musculação',
    workouts: [newWorkout('Série A'), newWorkout('Série B')],
    aero: { obj, inicio: '', av: {}, hemo: {}, ex: {}, exerc: { modalidade: '' }, plano: aeroPlan(obj) },
  });
}
/* Cálculos a partir da avaliação (p = programa, st = aluno) */
function aeroCalc(p, st) {
  const a = p.aero || {};
  const av = a.av || {}, he = a.hemo || {};
  const peso = aeroNum(av.peso), alt = aeroNum(av.altura), g = aeroNum(av.gordura);
  const sex = (st && st.sex) || av.sexo || '';
  const idade = aeroNum(av.idade) ?? aeroNum(st && st.age);
  const altM = alt ? (alt > 3 ? alt / 100 : alt) : null;
  const r = { peso, idade, sex };
  r.imc = peso && altM ? peso / (altM * altM) : null;
  r.mcmPct = g != null ? 100 - g : null;
  r.mg = peso && g != null ? peso * g / 100 : null;
  r.mm = peso && g != null ? peso - r.mg : null;
  r.gIdeal = sex === 'M' ? 15 : sex === 'F' ? 23 : null;
  r.mgIdeal = peso && r.gIdeal != null ? peso * r.gIdeal / 100 : null;
  r.mmIdeal = peso && r.gIdeal != null ? peso - r.mgIdeal : null;
  // Gordura excedente = (% gordura medido − % gordura sugerido) × peso atual / 100
  r.excedente = peso && g != null && r.gIdeal != null ? Math.max(0, (g - r.gIdeal) * peso / 100) : null;
  // Carência muscular = [(% MCM de referência − % MCM) / 100] × MCM (kg); referência 81% (masc.) e 77% (fem.)
  r.mcmRef = sex === 'M' ? 81 : sex === 'F' ? 77 : null;
  r.carencia = r.mm != null && r.mcmRef != null ? Math.max(0, (r.mcmRef - r.mcmPct) / 100 * r.mm) : null;
  r.rcq = aeroNum(av.cintura) && aeroNum(av.quadril) ? aeroNum(av.cintura) / aeroNum(av.quadril) : null;
  r.fcmaxCalc = idade != null ? 220 - idade : null;
  r.fcmax = aeroNum(he.fcmax) ?? r.fcmaxCalc;
  r.fcrep = aeroNum(he.fcrep);
  r.fcr = r.fcmax != null && r.fcrep != null ? r.fcmax - r.fcrep : null;
  r.vo2max = aeroNum(he.vo2max);
  r.vo2r = r.vo2max != null ? r.vo2max - 3.5 : null;
  r.zones = {};
  Object.entries(AERO_ZONES).forEach(([k, z]) => {
    const o = {};
    if (r.fcr != null) { o.bpmLo = Math.round(r.fcrep + z.lo * r.fcr); o.bpmHi = Math.round(r.fcrep + z.hi * r.fcr); }
    if (r.vo2r != null) {
      o.vo2Lo = 3.5 + z.lo * r.vo2r; o.vo2Hi = 3.5 + z.hi * r.vo2r;
      if (peso) o.kcalMin = ((o.vo2Lo + o.vo2Hi) / 2) * peso * 5 / 1000;
    }
    r.zones[k] = o;
  });
  return r;
}
function aeroBpm(c, zk) { const z = c.zones[zk] || {}; return z.bpmLo != null ? `${z.bpmLo}–${z.bpmHi} bpm` : 'FC: preencha FC de repouso e idade'; }
function aeroKcal(c, zk, min) { const z = c.zones[zk] || {}; const m = aeroNum(min); return z.kcalMin != null && m ? Math.round(z.kcalMin * m) : null; }
function aeroTotals(p, c) {
  const days = (p.aero.plano || []).flatMap((w) => w.dias).filter((d) => d.t === 'aero');
  const mins = days.map((d) => aeroNum(d.min) || 0);
  const kcal = days.map((d) => aeroKcal(c, d.zona, d.min)).filter((x) => x != null);
  const weeks = (p.aero.plano || []).length || 1;
  return {
    sessoes: days.length, minTotal: mins.reduce((a, b) => a + b, 0),
    minMedio: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0,
    freq: Math.round(days.length / weeks * 10) / 10,
    kcalTotal: kcal.length === days.length ? kcal.reduce((a, b) => a + b, 0) : null,
  };
}

/* ---- Editor (personal) ---- */
const AERO_TABS = [['aval', '1. Avaliação física'], ['hemo', '2. Hemodinâmica'], ['exames', '3. Exames'], ['exerc', '4. Exercício físico'], ['treinos', '5. Treino de força'], ['aerob', '6. Treinos aeróbicos']];
const aeroField = (path, label, unit = '', ph = '') => `<label class="field"><span>${label}${unit ? ` <em class="unit">(${unit})</em>` : ''}</span><input type="text" inputmode="decimal" data-bind="${path}" placeholder="${esc(ph)}"></label>`;
const aeroOut = (id, label, unit = '') => `<div class="aero-out"><span>${label}</span><b id="${id}">—</b>${unit ? `<em>${unit}</em>` : ''}</div>`;
function aeroStudent(p) { return byId(S.students, p.studentId); }
function aeroHead(p) {
  const st = aeroStudent(p);
  return `<div class="section card row">
    <div style="flex:1;min-width:220px"><div class="small muted">Aluno</div><select id="aero-student">${optList(S.students, p.studentId, 'Escolha o aluno')}</select>
      ${st ? `<div class="small muted" style="margin-top:6px">${st.sex ? esc(TAGS.sex.opts[st.sex]) : 'Sexo não informado'} · ${st.age ? esc(st.age) + ' anos' : 'idade não informada'} <a href="#" data-action="edit-person" data-assign="1" data-kind="students" data-id="${esc(st.id)}">editar</a></div>` : ''}</div>
    <label class="field" style="min-width:200px"><span>Objetivo</span><select data-bind="aero.obj">${Object.entries(AERO_OBJ).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="field" style="min-width:160px"><span>Início do programa</span><input type="date" data-bind="aero.inicio"></label>
  </div>`;
}
function tabAeroAval(p) {
  return `${aeroHead(p)}
  <div class="section card"><h3>Avaliação física</h3>
    <div class="grid three">
      ${aeroField('aero.av.data', 'Data da avaliação', '', 'dd/mm/aaaa')}${aeroField('aero.av.idade', 'Idade', 'anos', 'usa a do cadastro')}${aeroField('aero.av.peso', 'Peso', 'kg')}
      ${aeroField('aero.av.altura', 'Altura', 'cm')}${aeroField('aero.av.cintura', 'Circ. de cintura', 'cm')}${aeroField('aero.av.abdome', 'Circ. de abdome', 'cm')}
      ${aeroField('aero.av.quadril', 'Circ. de quadril', 'cm')}${aeroField('aero.av.punho', 'Circ. de punho', 'cm')}${aeroField('aero.av.gordura', '% de gordura', '%')}
    </div></div>
  <div class="section card"><h3>Resultados (calculados)</h3>
    <div class="aero-outs">
      ${aeroOut('o-imc', 'IMC', 'kg/m²')}${aeroOut('o-mcm', '% MCM (massa corporal magra)', '%')}${aeroOut('o-mg', 'Massa gorda', 'kg')}${aeroOut('o-mm', 'Massa magra', 'kg')}
      ${aeroOut('o-exc', 'Gordura excedente', 'kg')}${aeroOut('o-car', 'Carência muscular', 'kg')}${aeroOut('o-rcq', 'Relação cintura/quadril', '')}
    </div>
    <p class="small muted" style="margin:10px 0 0">Gordura excedente = (% de gordura medido − % de gordura sugerido) × peso atual ÷ 100, com % sugerido de 15% (masculino) e 23% (feminino). Carência muscular = [(81% − %MCM) ÷ 100] × MCM no masculino e [(77% − %MCM) ÷ 100] × MCM no feminino. O sexo vem do cadastro do aluno.</p>
  </div>
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="hemo">Próximo: hemodinâmica →</button></div>`;
}
function tabAeroHemo(p) {
  const sel = (path, label, opts) => `<label class="field"><span>${label}</span><select data-bind="${path}"><option value="">—</option>${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label>`;
  return `<div class="section card"><h3>Medidas hemodinâmicas</h3>
    <div class="grid three">
      ${aeroField('aero.hemo.pas', 'Pressão arterial sistólica', 'mmHg')}${aeroField('aero.hemo.pad', 'Pressão arterial diastólica', 'mmHg')}${aeroField('aero.hemo.fcrep', 'FC de repouso', 'bpm')}
      ${aeroField('aero.hemo.fcmax', 'FC máxima', 'bpm', 'automático: 220 − idade')}${aeroField('aero.hemo.vo2max', 'VO2 máximo', 'ml/kg/min')}
      ${sel('aero.hemo.sono', 'Qualidade do sono', ['Boa', 'Regular', 'Ruim'])}
      ${sel('aero.hemo.intestino', 'Funcionamento do intestino', ['Regular', 'Preso', 'Solto', 'Irregular'])}
      ${sel('aero.hemo.estresse', 'Nível de estresse', ['Baixo', 'Moderado', 'Alto', 'Muito alto'])}
    </div>
    <label class="field" style="margin-top:12px"><span>Objetivos do aluno</span><textarea rows="3" data-bind="aero.hemo.objetivos" placeholder="Ex.: reduzir 6 kg de gordura em 9 semanas, dormir melhor…"></textarea></label>
  </div>
  <div class="section card"><h3>Valores calculados</h3>
    <div class="aero-outs">
      ${aeroOut('o-fcmax', 'FC máxima usada', 'bpm')}${aeroOut('o-fcr', 'FC de reserva (FCmáx − FCrep)', 'bpm')}${aeroOut('o-vo2r', 'VO2 de reserva (VO2máx − 3,5)', 'ml/kg/min')}
    </div></div>
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="exames">Próximo: exames →</button></div>`;
}
function tabAeroExames() {
  return `<div class="section card"><h3>Exames laboratoriais</h3>
    <div class="grid three">${aeroField('aero.ex.data', 'Data dos exames', '', 'dd/mm/aaaa')}${AERO_EXAMS.map(([k, l, u]) => aeroField(`aero.ex.${k}`, l, u)).join('')}</div>
    <label class="field" style="margin-top:12px"><span>Observações</span><textarea rows="2" data-bind="aero.ex.obs"></textarea></label>
  </div>
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="exerc">Próximo: exercício físico →</button></div>`;
}
function tabAeroExerc(p) {
  return `<div class="section card"><h3>Exercício físico</h3>
    <div class="grid three">
      <label class="field"><span>Modalidade aeróbica</span><select data-bind="aero.exerc.modalidade"><option value="">—</option>${AERO_MODAL.map((m) => `<option>${m}</option>`).join('')}</select></label>
      <label class="field"><span>Observações da modalidade</span><input type="text" data-bind="aero.exerc.obs" placeholder="Ex.: esteira com 1% de inclinação"></label>
    </div></div>
  <div class="section card"><h3>Resumo do programa (calculado)</h3>
    <div class="aero-outs">
      ${aeroOut('o-int', 'Intensidade predominante')}${aeroOut('o-freq', 'Frequência semanal', 'sessões aeróbicas')}${aeroOut('o-dur', 'Duração média', 'min')}
      ${aeroOut('o-min', 'Volume total', 'min')}${aeroOut('o-kcal', 'Gasto calórico total estimado', 'kcal')}${aeroOut('o-kcalw', 'Gasto médio por semana', 'kcal')}
    </div>
    <p class="small muted" style="margin:10px 0 0">Gasto calórico = VO2 alvo da zona × peso × minutos × 5 kcal/L. Precisa do peso e do VO2máx.</p></div>
  <div class="section row"><span class="spacer"></span><button class="btn primary" data-action="tab" data-tab="treinos">Próximo: treino de força →</button></div>`;
}
function tabAeroAerob(p) {
  const c = aeroCalc(p, aeroStudent(p));
  const zoneRows = Object.entries(AERO_ZONES).map(([k, z]) => {
    const o = c.zones[k];
    return `<tr><td><span class="zchip ${z.cls}">${z.label}</span></td><td>${Math.round(z.lo * 100)}% a ${Math.round(z.hi * 100)}%</td>
      <td><b>${o.bpmLo != null ? `${o.bpmLo} a ${o.bpmHi} bpm` : '—'}</b></td><td>${o.vo2Lo != null ? `${aeroFmt(o.vo2Lo)} a ${aeroFmt(o.vo2Hi)}` : '—'}</td><td>${o.kcalMin != null ? aeroFmt(o.kcalMin) : '—'}</td></tr>`;
  }).join('');
  let n = 0;
  const weeks = (p.aero.plano || []).map((w, wi) => {
    const prevFase = wi > 0 ? p.aero.plano[wi - 1].fase : 0;
    return `${w.fase !== prevFase ? `<h3 class="aero-fase">Fase ${w.fase}</h3>` : ''}
    <div class="card aero-week"><div class="row"><strong>Semana ${wi + 1}</strong><span class="small muted">${esc(w.micro)}</span></div>
      <div class="aero-days">${w.dias.map((d, di) => {
        const lab = `Dia ${di + 1}`;
        if (d.t === 'R') return `<div class="aero-day rest"><span class="small muted">${lab}</span><b>Descanso</b></div>`;
        if (d.t !== 'aero') return `<div class="aero-day musc"><span class="small muted">${lab}</span><b>${esc(AERO_MUSC[d.t] || d.t)}</b><span class="small muted">Treino de força (aba 5)</span></div>`;
        n++;
        const kc = aeroKcal(c, d.zona, d.min);
        return `<div class="aero-day"><span class="small muted">${lab} · sessão ${n}</span>
          <div class="row" style="gap:6px"><input type="text" inputmode="numeric" data-bind="aero.plano.${wi}.dias.${di}.min" class="min-in"><span class="small">min</span></div>
          <select data-bind="aero.plano.${wi}.dias.${di}.zona" class="${AERO_ZONES[d.zona] ? AERO_ZONES[d.zona].cls : ''}">${Object.entries(AERO_ZONES).map(([k, z]) => `<option value="${k}">${z.label}</option>`).join('')}</select>
          <span class="small" data-zbpm="${wi}-${di}">${esc(aeroBpm(c, d.zona))}</span>${kc != null ? `<span class="small muted" data-zkcal="${wi}-${di}">≈ ${kc} kcal</span>` : `<span class="small muted" data-zkcal="${wi}-${di}"></span>`}</div>`;
      }).join('')}</div></div>`;
  }).join('');
  return `<div class="section card"><h3>Zonas de treinamento do aluno</h3>
    <table class="tpl-table aero-ztable"><tr><th>Zona</th><th>% da reserva</th><th>FC alvo (Karvonen)</th><th>VO2 alvo (ml/kg/min)</th><th>kcal/min</th></tr>${zoneRows}</table>
    <p class="small muted" style="margin:10px 0 0">FC alvo = FC repouso + % × (FCmáx − FC repouso). VO2 alvo = 3,5 + % × (VO2máx − 3,5). Atualize a avaliação e a hemodinâmica que as zonas se recalculam.</p></div>
  <div class="section stack">${weeks}</div>
  <div class="section row"><button class="btn" data-action="aero-reset-plan">Restaurar periodização padrão</button><span class="spacer"></span><button class="btn primary" data-action="student-access" data-id="${esc(p.id)}">Liberar acesso ao aluno</button></div>`;
}
function aeroBody(p) {
  if (E.tab === 'aval') return tabAeroAval(p);
  if (E.tab === 'hemo') return tabAeroHemo(p);
  if (E.tab === 'exames') return tabAeroExames(p);
  if (E.tab === 'exerc') return tabAeroExerc(p);
  if (E.tab === 'treinos') return `<div class="section card small muted">Monte as séries de musculação (A, B, C…). Use o campo "Foco" para os grupos musculares e "Obs." para a técnica utilizada. Elas aparecem para o aluno nos dias de musculação RML e Força Dinâmica.</div>${tabTreinos().replace(/<button class="btn primary" data-action="tab" data-tab="gerar">[^<]*<\/button>/, '<button class="btn primary" data-action="tab" data-tab="aerob">Próximo: treinos aeróbicos →</button>')}`;
  if (E.tab === 'aerob') return tabAeroAerob(p);
  return '';
}
function aeroRefresh() {
  const p = E.p;
  if (!p || p.mode !== 'aero') return;
  const c = aeroCalc(p, aeroStudent(p));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('o-imc', aeroFmt(c.imc)); set('o-mcm', aeroFmt(c.mcmPct)); set('o-mg', aeroFmt(c.mg)); set('o-mm', aeroFmt(c.mm));
  set('o-exc', aeroFmt(c.excedente)); set('o-car', aeroFmt(c.carencia)); set('o-rcq', aeroFmt(c.rcq, 2));
  set('o-fcmax', c.fcmax != null ? String(Math.round(c.fcmax)) : '—'); set('o-fcr', c.fcr != null ? String(Math.round(c.fcr)) : '—'); set('o-vo2r', aeroFmt(c.vo2r));
  const t = aeroTotals(p, c);
  const zc = {};
  p.aero.plano.flatMap((w) => w.dias).filter((d) => d.t === 'aero').forEach((d) => { zc[d.zona] = (zc[d.zona] || 0) + 1; });
  const top = Object.entries(zc).sort((a, b) => b[1] - a[1])[0];
  set('o-int', top ? AERO_ZONES[top[0]].label : '—'); set('o-freq', aeroFmt(t.freq)); set('o-dur', String(t.minMedio)); set('o-min', String(t.minTotal));
  set('o-kcal', t.kcalTotal != null ? Math.round(t.kcalTotal).toLocaleString('pt-BR') : '—');
  set('o-kcalw', t.kcalTotal != null ? Math.round(t.kcalTotal / p.aero.plano.length).toLocaleString('pt-BR') : '—');
  $$('[data-zbpm]').forEach((el) => {
    const [wi, di] = el.dataset.zbpm.split('-').map(Number);
    const d = p.aero.plano[wi].dias[di];
    el.textContent = aeroBpm(c, d.zona);
    const kc = aeroKcal(c, d.zona, d.min);
    const k = $(`[data-zkcal="${wi}-${di}"]`);
    if (k) k.textContent = kc != null ? `≈ ${kc} kcal` : '';
    const s = el.parentElement.querySelector('select');
    if (s) s.className = AERO_ZONES[d.zona] ? AERO_ZONES[d.zona].cls : '';
  });
}
actions['new-aero'] = () => {
  const body = openModal('Novo programa aeróbico', `
    <div class="stack">
      <p class="muted small" style="margin:0">Prescrição individualizada: você preenche a avaliação e o app calcula as zonas (FC de reserva e VO2 de reserva) e monta a periodização de 5 fases.</p>
      <label class="field"><span>Objetivo</span><select id="na-obj">${Object.entries(AERO_OBJ).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="field"><span>Aluno</span><select id="na-st">${optList(S.students, '', 'Escolha depois')}</select></label>
      <div class="row"><span class="spacer"></span><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" id="na-go">Criar programa</button></div>
    </div>`);
  $('#na-go', body).onclick = async () => {
    const p = newAeroProgram($('#na-obj', body).value, $('#na-st', body).value);
    await saveEntity('programs', p);
    closeModal();
    location.hash = `#/programa/${p.id}/aval`;
  };
};
actions['aero-reset-plan'] = async () => {
  if (!confirm('Restaurar as durações e zonas padrão das 5 fases? Suas alterações na periodização serão perdidas.')) return;
  E.p.aero.plano = aeroPlan(E.p.aero.obj);
  saveSoon();
  await saveSoon.flush();
  renderEditor();
};
document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'aero-student' && E.p) { E.p.studentId = e.target.value; saveSoon(); renderEditor(); }
});

/* ---- Área do aluno ---- */
function aeroSessions(p) {
  const out = [];
  (p.aero.plano || []).forEach((w, wi) => w.dias.forEach((d, di) => { if (d.t !== 'R') out.push({ ...d, wi, di, fase: w.fase, micro: w.micro, ref: `aero-${wi + 1}-${di + 1}` }); }));
  return out;
}
function aeroDone(ref) { return (ST.data.logs || []).find((l) => l.workout_ref === ref); }
function aeroSessionName(s) {
  return s.t === 'aero' ? `Aeróbico ${s.min} min · ${(AERO_ZONES[s.zona] || {}).label || ''}` : (AERO_MUSC[s.t] || 'Musculação');
}
function renderStudentAero(p) {
  const box = $('#st-body');
  const c = aeroCalc(p, ST.data.student);
  const ss = aeroSessions(p);
  const next = ss.find((s) => !aeroDone(s.ref));
  const doneN = ss.filter((s) => aeroDone(s.ref)).length;
  const modal = (p.aero.exerc || {}).modalidade;
  const card = (s) => {
    if (!s) return '<div class="card"><h3>Programa concluído! 🎉</h3><p class="muted">Você completou todas as sessões. Fale com seu personal para a próxima etapa.</p></div>';
    const z = AERO_ZONES[s.zona];
    return `<div class="card aero-today">
      <div class="small muted">Fase ${s.fase} · Semana ${s.wi + 1} · Dia ${s.di + 1} · ${esc(s.micro)}</div>
      ${s.t === 'aero' ? `<h2 style="margin:6px 0">${esc(s.min)} minutos</h2>
        <div class="row" style="gap:8px"><span class="zchip ${z.cls}">Zona ${z.label}</span>${modal ? `<span class="chip">${esc(modal)}</span>` : ''}</div>
        <div class="aero-bpm">${c.zones[s.zona].bpmLo != null ? `${c.zones[s.zona].bpmLo}–${c.zones[s.zona].bpmHi}` : '—'}<small> bpm</small></div>
        <p class="small muted" style="margin:0">Mantenha a frequência cardíaca nessa faixa durante o treino.${aeroKcal(c, s.zona, s.min) != null ? ` Gasto estimado: ≈ ${aeroKcal(c, s.zona, s.min)} kcal.` : ''}</p>`
      : `<h2 style="margin:6px 0">${esc(AERO_MUSC[s.t] || 'Musculação')}</h2><p class="muted" style="margin:0">Hoje é dia de musculação. Faça a série indicada pelo seu personal na aba <b>Força</b>.</p>`}
      <label class="field" style="margin-top:12px"><span>Como foi? (opcional)</span><input type="text" id="aero-note" placeholder="Ex.: FC média 128, me senti bem"></label>
      <button class="btn primary lg" style="width:100%;margin-top:12px" data-action="st-aero-done" data-ref="${s.ref}">Concluir este treino ✓</button>
    </div>`;
  };
  box.innerHTML = `<div class="stack" style="margin-top:14px">
    <div class="small muted">${doneN} de ${ss.length} sessões concluídas</div>
    ${card(next)}
    <div class="card"><h3>Suas zonas de treino</h3><table class="tpl-table">${Object.entries(AERO_ZONES).map(([k, z]) => `<tr><td><span class="zchip ${z.cls}">${z.label}</span></td><td><b>${c.zones[k].bpmLo != null ? `${c.zones[k].bpmLo}–${c.zones[k].bpmHi} bpm` : '—'}</b></td></tr>`).join('')}</table></div>
  </div>`;
}
function renderStudentAeroPlan(p) {
  const box = $('#st-body');
  const c = aeroCalc(p, ST.data.student);
  box.innerHTML = `<div class="stack" style="margin-top:14px">${(p.aero.plano || []).map((w, wi) => `
    <div class="card"><div class="row"><strong>Semana ${wi + 1}</strong><span class="small muted">Fase ${w.fase} · ${esc(w.micro)}</span></div>
      <table class="tpl-table" style="margin-top:8px">${w.dias.map((d, di) => {
        const ref = `aero-${wi + 1}-${di + 1}`;
        const ok = d.t !== 'R' && aeroDone(ref);
        return `<tr><td>${ok ? '✅' : d.t === 'R' ? '😴' : '⬜'} Dia ${di + 1}</td><td>${d.t === 'R' ? 'Descanso' : d.t === 'aero' ? `${esc(d.min)} min · <span class="zchip ${AERO_ZONES[d.zona].cls}">${AERO_ZONES[d.zona].label}</span> ${esc(aeroBpm(c, d.zona))}` : esc(AERO_MUSC[d.t] || d.t)}</td></tr>`;
      }).join('')}</table></div>`).join('')}</div>`;
}
actions['st-aero-done'] = async (el) => {
  const p = ST.data.program;
  const s = aeroSessions(p).find((x) => x.ref === el.dataset.ref);
  if (!s) return;
  const note = ($('#aero-note') || {}).value || '';
  const log = { workout_ref: s.ref, workout_name: `Sem. ${s.wi + 1} · Dia ${s.di + 1} · ${aeroSessionName(s)}`, exercises: [], notes: note };
  const res = await withBusy('Salvando…', async () => {
    const { data, error } = await sb.rpc('student_save_log', { _code: ST.code, _log: log });
    if (error) throw error;
    if (data && data.error) throw new Error(STUDENT_ERRORS[data.error] || data.error);
    return data;
  });
  if (!res) return;
  ST.data.logs = [{ ...log, id: res.id, log_date: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) }, ...(ST.data.logs || [])];
  toast('Treino concluído! 💪');
  renderStudent('aero');
  window.scrollTo(0, 0);
};

/* =========================================================
 * Biblioteca de PDFs na nuvem (compartilhada com todos os assinantes)
 * ======================================================= */
const CLOUD_LIB = { rows: null, loading: false, error: '' };
async function loadCloudLib(force = false) {
  if (!sb || !CLOUD.user) return [];
  if (CLOUD_LIB.rows && !force) return CLOUD_LIB.rows;
  CLOUD_LIB.loading = true;
  const { data, error } = await sb.from('library_pdfs').select('*').order('title');
  CLOUD_LIB.loading = false;
  CLOUD_LIB.error = error ? error.message : '';
  CLOUD_LIB.rows = error ? [] : data || [];
  return CLOUD_LIB.rows;
}
function cloudItemsHTML(rows) {
  const q = normTxt(S.ui.cq || '');
  const list = rows.filter((r) => !q || normTxt(`${r.title} ${r.code || ''}`).includes(q));
  return list.map((r) => `<div class="cl-item">
      <div style="flex:1;min-width:0"><strong>${esc(r.title)}</strong><div class="small muted">${r.code ? esc(r.code) + ' · ' : ''}${r.pages ? r.pages + ' páginas · ' : ''}${r.size ? fmtSize(r.size) : ''}</div>
        ${hasTags(r.tags) ? `<div class="meta" style="margin-top:4px">${tagChips(r.tags)}</div>` : ''}</div>
      <div class="row" style="gap:6px"><button class="btn sm" data-action="cl-open" data-path="${esc(r.file_path)}">Abrir</button>
        <button class="btn sm" data-action="cl-dl" data-path="${esc(r.file_path)}" data-name="${esc(r.title)}">Baixar</button>
        <button class="btn sm ghost" data-action="cl-import" data-path="${esc(r.file_path)}" data-name="${esc(r.title)}" title="Trazer para Meus PDFs deste aparelho (para importar slides e editar)">Usar no app</button></div>
    </div>`).join('') || '<div class="empty">Nada encontrado.</div>';
}
function cloudLibHTML(rows) {
  if (!rows.length) return '';
  return `<div class="card stack" style="margin-bottom:22px">
    <div class="row"><div style="flex:1;min-width:220px"><h2 style="margin:0">Biblioteca de Treinos Lucrativos</h2>
      <div class="small muted">${rows.length} PDFs originais na nuvem · disponíveis em qualquer aparelho</div></div>
      <input type="search" id="cl-q" placeholder="Buscar programa ou código…" value="${esc(S.ui.cq || '')}" style="max-width:260px"></div>
    <div class="cl-list" id="cl-items">${cloudItemsHTML(rows)}</div></div>`;
}
async function renderCloudLib() {
  const box = $('#cloudlib');
  if (!box) return;
  if (!sb || !CLOUD.user || !LIC.active) { box.innerHTML = ''; return; }
  if (!CLOUD_LIB.rows) box.innerHTML = '<div class="small muted" style="margin-bottom:14px">Carregando a Biblioteca da nuvem…</div>';
  const rows = await loadCloudLib();
  const b2 = $('#cloudlib');
  if (!b2) return;
  b2.innerHTML = cloudLibHTML(rows);
  const qi = $('#cl-q');
  if (qi) qi.addEventListener('input', (e) => { S.ui.cq = e.target.value; $('#cl-items').innerHTML = cloudItemsHTML(rows); });
}
async function cloudSignedUrl(path, download) {
  const { data, error } = await sb.storage.from('biblioteca').createSignedUrl(path, 3600, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}
actions['cl-open'] = async (el) => {
  const w = window.open('', '_blank');
  try { const url = await cloudSignedUrl(el.dataset.path); if (w) w.location = url; else location.href = url; } catch (e) { if (w) w.close(); toast('Não foi possível abrir o PDF'); }
};
actions['cl-dl'] = async (el) => {
  try { const url = await cloudSignedUrl(el.dataset.path, slug(el.dataset.name) + '.pdf'); const a = document.createElement('a'); a.href = url; a.click(); } catch (e) { toast('Não foi possível baixar o PDF'); }
};
actions['cl-import'] = async (el) => {
  const meta = await withBusy('Trazendo o PDF para este aparelho…', async () => {
    const { data, error } = await sb.storage.from('biblioteca').download(el.dataset.path);
    if (error) throw error;
    return addPdfFile(new File([data], el.dataset.name + '.pdf', { type: 'application/pdf' }));
  });
  if (meta) { toast('PDF disponível em Meus PDFs deste aparelho'); renderPdfList(); }
};

/* ---- Admin: publicar os PDFs deste aparelho na nuvem ---- */
function cloudPublishHTML() {
  if (!LIC.admin || !CLOUD.user) return '';
  const n = libraryPdfs().length;
  return `<div class="card stack" id="cl-admin">
    <h2>PDFs da Biblioteca na nuvem <span class="small muted" style="font-weight:400">· só você vê esta área</span></h2>
    <p class="muted" style="margin:0">Envia os PDFs originais que estão em "Meus PDFs" deste aparelho para a nuvem. Todos os assinantes passam a ver e baixar em "Meus PDFs". PDFs gerados pelo app não são enviados. Quem já está na nuvem é pulado.</p>
    <div class="row"><button class="btn primary" data-action="cl-publish" ${n ? '' : 'disabled'}>Publicar ${n} PDF(s) para os assinantes</button><span class="small muted" id="cl-msg"></span></div>
  </div>`;
}
actions['cl-publish'] = async () => {
  const list = libraryPdfs();
  if (!list.length) return;
  if (!confirm(`Enviar ${list.length} PDF(s) para a nuvem? Pode levar alguns minutos. Deixe esta aba aberta até terminar.`)) return;
  const msg = (t) => { const m = $('#cl-msg'); if (m) m.textContent = t; };
  const existing = new Set((await loadCloudLib(true)).map((r) => r.file_path));
  let ok = 0, skip = 0, fail = 0;
  const used = new Set();
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    let path = slug(m.code || m.title || m.name) + '.pdf';
    if (used.has(path)) path = slug((m.code || m.name) + '-' + m.id.slice(-4)) + '.pdf';
    used.add(path);
    msg(`Enviando ${i + 1} de ${list.length}: ${pdfTitle(m)}…`);
    if (existing.has(path)) { skip++; continue; }
    try {
      const rec = await DB.get('pdfblobs', m.id);
      if (!rec || !rec.blob) throw new Error('arquivo não encontrado neste aparelho');
      const up = await sb.storage.from('biblioteca').upload(path, rec.blob, { upsert: true, contentType: 'application/pdf' });
      if (up.error) throw up.error;
      const ins = await sb.from('library_pdfs').upsert({ code: m.code || null, title: pdfTitle(m), file_path: path, pages: m.pages || null, size: rec.blob.size, tags: m.tags || {} }, { onConflict: 'file_path' });
      if (ins.error) throw ins.error;
      ok++;
    } catch (e) { console.warn(e); fail++; }
  }
  msg(`Pronto: ${ok} enviado(s), ${skip} já estavam na nuvem${fail ? `, ${fail} com erro (tente de novo)` : ''}.`);
  toast('Publicação concluída');
  await loadCloudLib(true);
};

/* =========================================================
 * Exemplo inicial
 * ======================================================= */
async function seed() {
  // Os 60 programas vêm embutidos no App (library-data.js); não há mais dados de exemplo.
  if (S.settings.seeded) return;
  S.settings.seeded = true;
  await saveSettings();
}

/* =========================================================
 * Início
 * ======================================================= */
(async function init() {
  await DB.open();
  await loadAll();
  await seed();
  await cloudInit();
  route();
  tagPendingPdfs();
})();

// Exposto para testes automatizados
window.__app = { S, buildSlides, exportProgramPdf };
})();
