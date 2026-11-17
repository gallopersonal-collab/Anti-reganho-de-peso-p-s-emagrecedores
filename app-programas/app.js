/* Programas de Treino — Instituto Gallo Personal
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
    if (this.mem) return [...this.mem[store].values()].map(clone);
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
  settings: { id: 'app', brand: 'Instituto Gallo Personal', theme: 'navy', seeded: false },
  ui: { q: '', student: '' },
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
}
async function removeEntity(store, id) {
  await DB.del(store, id);
  S[store] = S[store].filter((x) => x.id !== id);
}
async function saveSettings() { await DB.put('settings', S.settings); }

/* =========================================================
 * Modelos
 * ======================================================= */
const THEMES = { navy: 'Azul-marinho e dourado', black: 'Preto e dourado', light: 'Claro (impressão)' };
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
  await saveEntity('pdfs', meta);
  return meta;
}
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
  const navKey = { programa: 'programas', alunos: 'alunos', personais: 'personais', pdfs: 'pdfs', pdf: 'pdfs', config: 'config' }[r] || 'programas';
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));
  window.scrollTo(0, 0);
  if (!r) return viewPrograms();
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
    </div>
    <div id="plist"></div>`;
  $('#q').addEventListener('input', (e) => { S.ui.q = e.target.value; renderProgramList(); });
  $('#fstudent').addEventListener('change', (e) => { S.ui.student = e.target.value; renderProgramList(); });
  renderProgramList();
}
function renderProgramList() {
  const q = S.ui.q.trim().toLowerCase();
  const list = S.programs
    .filter((p) => !S.ui.student || p.studentId === S.ui.student)
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
  if (!list.length) { box.innerHTML = `<div class="empty">Nenhum programa encontrado com esse filtro.</div>`; return; }
  box.innerHTML = `<div class="grid cards">${list.map((p) => {
    const st = byId(S.students, p.studentId);
    const tr = byId(S.trainers, p.trainerId);
    return `<div class="card pcard" data-action="open-program" data-id="${esc(p.id)}">
      <div class="who">${avatarHTML(st && st.photo, st ? st.name : '?')}
        <div><div class="small muted">${st ? esc(st.name) : 'Sem aluno definido'}</div><div class="small muted">${tr ? 'por ' + esc(tr.name) : ''}</div></div></div>
      <h3>${esc(p.title || 'Sem título')}</h3>
      <div class="meta"><span class="chip gold">${p.workouts.length} treino(s)</span><span class="chip">${totalExercises(p)} exercícios</span><span class="chip">${esc(p.weeks || '?')} semanas</span></div>
      <div class="small muted">Atualizado em ${fmtDate(p.updatedAt)}</div>
      <div class="actions">
        <button class="btn sm" data-action="open-program" data-id="${esc(p.id)}">Editar</button>
        <button class="btn sm" data-action="open-program" data-id="${esc(p.id)}" data-tab="gerar">Gerar PDF</button>
        <button class="btn sm" data-action="dup-program" data-id="${esc(p.id)}" title="Duplicar para outro aluno">Duplicar</button>
        <span class="spacer"></span>
        <button class="btn sm danger" data-action="del-program" data-id="${esc(p.id)}" title="Excluir">✕</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}
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
  const p = clone(src);
  p.id = uid();
  p.title = src.title + ' (cópia)';
  p.studentId = '';
  p.createdAt = 0;
  p.workouts.forEach((w) => { w.id = uid(); w.exercises.forEach((x) => { x.id = uid(); }); });
  await saveEntity('programs', p);
  toast('Programa duplicado. Escolha o aluno.');
  location.hash = `#/programa/${p.id}`;
};
actions['del-program'] = async (el, ev) => {
  ev.stopPropagation();
  const p = byId(S.programs, el.dataset.id);
  if (!confirm(`Excluir o programa "${p.title}"? Isso não pode ser desfeito.`)) return;
  await removeEntity('programs', p.id);
  toast('Programa excluído');
  renderProgramList();
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
  const p = newProgram({ title: meta.name.replace(/[_-]+/g, ' ').trim(), sourcePdfId: pdfId });
  await saveEntity('programs', p);
  location.hash = `#/programa/${p.id}/treinos`;
  setTimeout(() => toast('PDF salvo. Agora puxe as páginas dos exercícios.'), 300);
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
  E.p = p;
  E.tab = ['dados', 'treinos', 'gerar'].includes(tab) ? tab : 'dados';
  leaveHook = () => saveSoon.flush();
  renderEditor();
}
function renderEditor() {
  const p = E.p;
  app.innerHTML = `
    <div class="editor-head">
      <div class="row">
        <a class="btn ghost sm" href="#/">← Programas</a>
        <span class="spacer"></span>
        <span id="save-state" class="save-state ok">Salvo ✓</span>
      </div>
      <h1 id="ed-title" style="margin-top:6px">${esc(p.title || 'Sem título')}</h1>
      <div class="tabs">
        <button data-action="tab" data-tab="dados" class="${E.tab === 'dados' ? 'active' : ''}">1. Dados e capa</button>
        <button data-action="tab" data-tab="treinos" class="${E.tab === 'treinos' ? 'active' : ''}">2. Treinos e exercícios</button>
        <button data-action="tab" data-tab="gerar" class="${E.tab === 'gerar' ? 'active' : ''}">3. Visualizar e gerar PDF</button>
      </div>
    </div>
    <div id="ed-body">${E.tab === 'dados' ? tabDados() : E.tab === 'treinos' ? tabTreinos() : tabGerar()}</div>`;
  bindInputs(app);
  if (E.tab === 'gerar') renderPreview();
}
actions.tab = async (el) => {
  await saveSoon.flush();
  E.tab = el.dataset.tab;
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
  return `
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

  <div class="section card stack">
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
  return `
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
  return `<div class="card workout">
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
        <button class="btn sm" data-action="add-ex" data-wi="${wi}">+ Exercício</button>
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
      ${x.image ? `<img class="ex-thumb" src="${esc(x.image)}" alt="">` : '<span class="ex-thumb">sem foto</span>'}
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
        ${x.image ? `<img class="preview" src="${esc(x.image)}" alt="">` : '<div class="preview">Sem imagem.<br>Envie uma foto ou puxe do PDF.</div>'}
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
  $('#ed-body').innerHTML = tabTreinos();
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
  const st = byId(S.students, p.studentId);
  const warn = [];
  if (!st) warn.push('Nenhum aluno selecionado (aba 1).');
  if (!byId(S.trainers, p.trainerId)) warn.push('Nenhum personal selecionado (aba 1).');
  if (!totalExercises(p)) warn.push('Nenhum exercício cadastrado (aba 2).');
  return `
  <div class="section card row">
    <label class="field" style="min-width:220px"><span>Visual do PDF</span>
      <select id="theme-quick">${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${p.theme === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <span class="spacer"></span>
    <button class="btn primary" data-action="export-pdf">Gerar PDF</button>
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
  box.innerHTML = slides.map((s, i) => `<div class="slide-frame">${s.html}</div><div class="slide-label">${i + 1}. ${esc(s.label)}</div>`).join('');
  const scaleAll = () => $$('.slide-frame', box).forEach((f) => f.style.setProperty('--k', f.clientWidth / 1334));
  scaleAll();
  if (previewRO) previewRO.disconnect();
  previewRO = new ResizeObserver(scaleAll);
  previewRO.observe(box);
  await document.fonts.ready;
  $$('.slide', box).forEach(fitSlide);
}
actions['export-pdf'] = async () => {
  await saveSoon.flush();
  await exportProgramPdf(E.p);
};

/* =========================================================
 * Slides do PDF (1334 x 750, mesmo formato dos PDFs atuais)
 * ======================================================= */
function bgImg(src, ph) {
  return src ? `<div class="bg" style="background-image:url('${esc(src)}')"></div>` : `<div class="ph">${esc(ph)}</div>`;
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
  const st = byId(S.students, p.studentId) || { name: 'Nome do aluno', photo: '' };
  const tr = byId(S.trainers, p.trainerId);
  const brand = S.settings.brand || '';
  const inc = p.include || {};
  const out = [];
  const add = (cls, label, html) => out.push({ cls, label, html });

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
    add('s-text', 'Aquecimento', `
      <div class="content" data-fitbox>
        <div class="kicker">Antes de começar</div><div class="rule"></div>
        <div class="heading bebas">Aquecimento padrão</div>
        <div class="steps">${wu.map((l, i) => {
          const k = l.indexOf(':');
          const h = k > 0 ? l.slice(0, k) : l;
          const d = k > 0 ? l.slice(k + 1).trim() : '';
          return `<div class="step"><div class="n">${i + 1}</div><div><h4>${esc(h)}</h4>${d ? `<p data-shrink="15">${esc(d)}</p>` : ''}</div></div>`;
        }).join('')}</div>
      </div>`);
  }

  // Escala PSE
  if (inc.pse) {
    const rows = [['1–2', 'Muito leve (aquecimento)'], ['3–4', 'Leve · esforço confortável'], ['5–6', 'Moderado · 4-5 reps em reserva'], ['7', 'Desafiador · 3 reps em reserva'], ['8', 'Forte · 2 reps em reserva'], ['9', 'Muito forte · 1 rep em reserva'], ['10', 'Máximo · falha total']];
    const note = (p.pseNote || '').split('\n');
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
    return { label: s.label, html: `<div class="slide t-${esc(p.theme || 'navy')} ${s.cls}">${s.html}${foot}</div>` };
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
  const slides = buildSlides(p);
  const st = byId(S.students, p.studentId);
  const fileName = `${slug(p.title)}${st ? '-' + slug(st.name) : ''}.pdf`;
  const result = await withBusy('Gerando PDF…', async (prog) => {
    await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [1334, 750], compress: true });
    const stage = $('#render-stage');
    let thumb = '';
    for (let i = 0; i < slides.length; i++) {
      prog(i / slides.length, `Página ${i + 1} de ${slides.length}`);
      stage.innerHTML = slides[i].html;
      const el = stage.firstElementChild;
      fitSlide(el);
      await sleep(30);
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#000000', logging: false, width: 1334, height: 750, windowWidth: 1334, windowHeight: 750, scrollX: 0, scrollY: 0 });
      if (i > 0) pdf.addPage([1334, 750], 'landscape');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.86), 'JPEG', 0, 0, 1334, 750, undefined, 'FAST');
      if (i === 0) {
        const t = document.createElement('canvas');
        t.width = 480; t.height = 270;
        t.getContext('2d').drawImage(canvas, 0, 0, 480, 270);
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
    await saveEntity('pdfs', { id, name: fileName.replace(/\.pdf$/, ''), size: blob.size, pages: slides.length, thumb, generated: true, programId: p.id, createdAt: Date.now() });
    return blob;
  });
  if (!result) return;
  const file = new File([result], fileName, { type: 'application/pdf' });
  const canShare = navigator.canShare && navigator.canShare({ files: [file] });
  openModal(`PDF pronto`, `
    <p>O PDF <b>${esc(fileName)}</b> (${slides.length} páginas, ${fmtSize(result.size)}) foi gerado e salvo na biblioteca de PDFs.</p>
    <div class="row" style="margin-top:16px">
      <button class="btn primary" id="dl-pdf">Baixar PDF</button>
      ${canShare ? '<button class="btn" id="share-pdf">Enviar (WhatsApp, e-mail…)</button>' : ''}
      <a class="btn ghost" href="#/pdfs">Ver biblioteca</a>
    </div>`);
  $('#dl-pdf').onclick = () => downloadBlob(result, fileName);
  if (canShare) $('#share-pdf').onclick = () => navigator.share({ files: [file], title: p.title }).catch(() => {});
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
function openPagePicker({ pdfId, multi = false, title, onPick, onPickMany }) {
  if (!S.pdfs.length) {
    openModal(title, `<p>Nenhum PDF na biblioteca ainda.</p><div class="row"><button class="btn primary" id="pp-up">Enviar um PDF</button></div>`);
    $('#pp-up').onclick = async () => {
      const [f] = await pickFile('application/pdf');
      if (!f) return;
      const meta = await withBusy('Lendo o PDF…', () => addPdfFile(f));
      if (meta) openPagePicker({ pdfId: meta.id, multi, title, onPick, onPickMany });
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
        <span>Selecione as páginas dos exercícios (uma página = um exercício).</span><span class="spacer"></span>
        <label class="row">Recorte da foto: <select id="pp-preset" style="width:auto">${['left', 'right', 'full'].map((k) => `<option value="${k}">${PRESET_LABELS[k]}</option>`).join('')}</select></label>
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
    if (meta) openPagePicker({ pdfId: meta.id, multi, title, onPick, onPickMany });
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
  students: { title: 'Alunos', one: 'aluno', fields: [['notes', 'Observações (lesões, objetivos…)', 'area']] },
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
            ${kind === 'students' ? `<button class="btn sm" data-action="filter-student" data-id="${esc(x.id)}">Programas</button>` : ''}
            <button class="btn sm danger" data-action="del-person" data-kind="${kind}" data-id="${esc(x.id)}">✕</button>
          </div></div></div>`).join('')}</div>`
    : `<div class="empty"><h2>Nenhum ${K.one} cadastrado</h2><p>Cadastre nome e foto para aparecerem na capa do PDF.</p><button class="btn primary" data-action="new-person" data-kind="${kind}">+ Novo ${K.one}</button></div>`}`;
}
actions['filter-student'] = (el) => { S.ui.student = el.dataset.id; location.hash = '#/'; };
actions['new-person'] = (el) => personForm(el.dataset.kind, null, !!el.dataset.assign);
actions['edit-person'] = (el) => personForm(el.dataset.kind, byId(S[el.dataset.kind], el.dataset.id), !!el.dataset.assign);
actions['del-person'] = async (el) => {
  const kind = el.dataset.kind;
  const x = byId(S[kind], el.dataset.id);
  if (!confirm(`Excluir ${x.name}? Os programas continuam salvos, mas ficam sem ${KIND[kind].one}.`)) return;
  await removeEntity(kind, x.id);
  viewPeople(kind);
};
function personForm(kind, rec, assign) {
  const K = KIND[kind];
  const x = rec ? clone(rec) : { id: uid(), name: '', photo: '' };
  const body = openModal(rec ? `Editar ${K.one}` : `Novo ${K.one}`, `
    <div class="stack">
      <div class="photo-pick"><span id="pf-av">${avatarHTML(x.photo, x.name, 'xl')}</span>
        <div class="stack" style="gap:8px"><button class="btn sm" id="pf-photo">Escolher foto</button><button class="btn sm ghost" id="pf-nophoto">Remover foto</button></div></div>
      <label class="field"><span>Nome completo</span><input type="text" id="pf-name" value="${esc(x.name)}" placeholder="Nome"></label>
      ${K.fields.map(([k, l, t]) => `<label class="field"><span>${l}</span>${t === 'area' ? `<textarea id="pf-${k}" rows="2">${esc(x[k] || '')}</textarea>` : `<input type="text" id="pf-${k}" value="${esc(x[k] || '')}">`}</label>`).join('')}
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
    closeModal();
    toast('Salvo');
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
  const list = S.pdfs.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const prog = (x) => byId(S.programs, x.programId) || S.programs.find((p) => p.sourcePdfId === x.id);
  app.innerHTML = `
    <div class="page-head"><div><h1>Biblioteca de PDFs</h1><p class="muted">PDFs enviados e PDFs gerados pelo app</p></div>
      <button class="btn primary" data-action="upload-pdfs">+ Enviar PDFs</button></div>
    ${list.length ? `<div class="stack">${list.map((x) => {
      const p = prog(x);
      return `<div class="card pdf-item">
        ${x.thumb ? `<img class="pdf-thumb" src="${esc(x.thumb)}" alt="">` : '<span class="pdf-thumb"></span>'}
        <div style="flex:1;min-width:0">
          <h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.name)}</h3>
          <div class="small muted">${x.pages} páginas · ${fmtSize(x.size)} · ${fmtDate(x.updatedAt)}</div>
          <div class="row" style="margin-top:6px">${x.generated ? '<span class="chip gold">Gerado pelo app</span>' : '<span class="chip">Original enviado</span>'}
            ${p ? `<a class="chip" href="#/programa/${esc(p.id)}">Programa: ${esc(p.title)}</a>` : ''}</div>
        </div>
        <div class="row" style="gap:6px;justify-content:flex-end">
          <a class="btn sm" href="#/pdf/${esc(x.id)}">Abrir</a>
          <button class="btn sm" data-action="dl-pdf" data-id="${esc(x.id)}">Baixar</button>
          <button class="btn sm danger" data-action="del-pdf" data-id="${esc(x.id)}">✕</button>
        </div></div>`;
    }).join('')}</div>`
    : `<div class="empty"><h2>Nenhum PDF ainda</h2><p>Envie os PDFs dos programas que você já tem. Eles ficam guardados aqui e servem de fonte para as fotos dos exercícios.</p><button class="btn primary" data-action="upload-pdfs">+ Enviar PDFs</button></div>`}`;
}
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
    <div class="page-head"><div><a class="btn ghost sm" href="#/pdfs">← PDFs</a><h1 style="margin-top:6px">${esc(meta.name)}</h1><p class="muted">${meta.pages} páginas · ${fmtSize(meta.size)}</p></div>
      <div class="row">
        ${meta.generated ? '' : `<button class="btn primary" data-action="pdf-to-program" data-id="${esc(id)}">Criar programa a partir deste PDF</button>`}
        <button class="btn" data-action="dl-pdf" data-id="${esc(id)}">Baixar</button>
        <button class="btn danger" data-action="del-pdf" data-id="${esc(id)}">Excluir</button>
      </div></div>
    <div class="pages-grid" id="pv-grid">${Array.from({ length: meta.pages }, (_, i) => `<div class="page-tile" data-page="${i + 1}"><img alt=""><span class="pn">${i + 1}</span></div>`).join('')}</div>`;
  const grid = $('#pv-grid');
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.page-tile');
    if (t) openPageView(id, +t.dataset.page);
  });
  const h = location.hash;
  for (let n = 1; n <= meta.pages; n++) {
    if (location.hash !== h) return;
    try { const url = await renderPage(id, n, 360); const img = $(`[data-page="${n}"] img`, grid); if (img) img.src = url; } catch (e) { console.warn(e); }
  }
}
actions['pdf-to-program'] = (el) => createProgramFromPdf(el.dataset.id);
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
    <div class="page-head"><div><h1>Ajustes</h1><p class="muted">Marca, padrões e cópia de segurança</p></div></div>
    <div class="stack">
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
    const out = { app: 'gallo-programas', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, programs: S.programs, students: S.students, trainers: S.trainers, pdfs: [] };
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
 * Exemplo inicial
 * ======================================================= */
async function seed() {
  if (S.settings.seeded) return;
  const tr = {
    id: uid(), name: 'Prof. José Carlos Gallo', photo: '', cref: '',
    formacao: 'Graduado em Educação Física, Fisioterapia e Nutrição, com pós em Fisiologia do Exercício e Treinamento Resistido.',
    experiencia: 'Mais de 36 anos prescrevendo treinos para iniciantes e atletas em academia.',
    especializacoes: 'Hipertrofia, emagrecimento, reabilitação funcional e periodização. Fisiologia Clínica e do Exercício.',
    metodologia: 'Técnica impecável, progressão de cargas registrada e resultados sustentáveis sem atalhos.',
  };
  const st = { id: uid(), name: 'Aluno Exemplo', photo: '', notes: '' };
  const X = (name, muscles, sets, reps, pse, rest, cadence, execution, cautions, notes, extra = {}) =>
    newExercise({ name, muscles, sets, reps, pse, rest, cadence, execution, cautions, notes, ...extra });
  const p = newProgram({
    title: 'Projeto Fundação Muscular',
    subtitle: 'Homens 30-39 anos · Iniciante · Academia',
    studentId: st.id, trainerId: tr.id, theme: 'navy',
    overview: 'Mesociclo introdutório em full body (A/B/C) 3x por semana, centrado nos padrões fundamentais: agachar, empurrar horizontal e vertical, puxar e estender o quadril. Para o iniciante de 30-39 anos, treinar cada grupo 3x na semana é o estímulo mais eficiente, e a janela de ganhos de novato responde fortemente à progressão de cargas bem registrada.',
    objectives: 'Construir massa muscular desde a primeira semana com técnica correta.\nDominar os padrões fundamentais de movimento.\nAproveitar ao máximo a janela de ganhos de novato.',
    recommendations: 'Treine em dias alternados (ex.: seg/qua/sex).\nRegistre cargas, repetições e sensações em todas as sessões.\nCarga só sobe com técnica estável e amplitude completa.\nSono de 7-9h e alimentação suficiente fazem parte do programa.',
    warmup: 'Cárdio leve: 5-8 minutos de esteira ou bicicleta para elevar a temperatura corporal.\nMobilidade: 2 minutos de mobilidade de ombros, quadril e tornozelos.\nSéries de aproximação: no 1º exercício da sessão, 1×12 com cerca de 50% da carga de trabalho.',
    workouts: [newWorkout('Treino A', {
      focus: 'Full body — base de empurrar',
      exercises: [
        X('Agachamento no Smith ou livre', 'Quadríceps / Glúteos', '3', '8-12', '6-7', '120s', '3-0-1', 'Barra sobre o trapézio, pés na largura dos ombros. Desça em 3s até próximo do paralelo e suba empurrando pelos calcanhares. Inspire na descida, expire na subida.', 'Joelhos alinhados aos pés; ajuste os apoios de segurança do rack.', 'No Smith, pés levemente à frente da linha da barra. Iniciantes podem começar no Smith.'),
        X('Supino reto com barra', 'Peitoral', '3', '8-12', '6-7', '90s', '2-0-1', 'Deitado, pés firmes, pegada um pouco mais larga que os ombros, escápulas retraídas. Desça a barra até a linha do peitoral e empurre sem travar os cotovelos. Inspire na descida, expire na subida.', 'Presilhas sempre; spotter nas séries pesadas; sem rebote no peito.', 'Composto principal de peito — priorize técnica e progressão registrada.'),
        X('Puxada frontal na polia', 'Dorsal', '3', '8-12', '6-7', '90s', '2-0-1', 'Coxas travadas, pegada mais larga que os ombros. Puxe a barra até a parte alta do peito aproximando as escápulas e retorne controlando. Expire ao puxar.', 'Sem inclinar o tronco para trás para ajudar.', 'Base do desenvolvimento das costas. Foque em puxar com os cotovelos.'),
        X('Desenvolvimento na máquina', 'Ombros', '3', '10-12', '6-7', '75s', '2-0-1', 'Costas apoiadas, manoplas na altura dos ombros. Empurre até quase estender e desça até a linha das orelhas. Expire ao empurrar.', 'Sem arquear a lombar; mantenha o core firme.', 'A máquina guia o movimento — ideal para o iniciante aprender o padrão.'),
        X('Cadeira flexora', 'Posteriores', '3', '10-15', '6', '60s', '2-0-2', 'Joelho alinhado ao eixo, rolete acima dos calcanhares. Flexione e retorne controlando em 2s. Expire ao flexionar.', 'Quadril colado no banco; sem impulso.', 'Isolador de posteriores; controle a fase excêntrica.'),
        X('Tríceps na polia (corda)', 'Tríceps', '3', '10-15', '6-7', '60s', '2-0-1', 'Cotovelos colados ao tronco. Estenda separando as pontas da corda no final e retorne controlando. Expire ao estender.', 'Cotovelos imóveis durante todo o movimento.', 'Finalize o treino com boa conexão no tríceps.'),
        X('Prancha abdominal', 'Abdômen / Core', '3', '30-45s', '6', '45s', 'Isometria', 'Antebraços e pontas dos pés no chão, corpo alinhado, abdômen e glúteos contraídos. Respire normalmente.', 'Quadril nem cai nem sobe — mantenha a linha reta.', 'Aumente o tempo conforme evoluir. Base de estabilidade do core.', { repsLabel: 'Tempo' }),
      ],
    })],
  });
  await saveEntity('trainers', tr);
  await saveEntity('students', st);
  await saveEntity('programs', p);
  S.settings.seeded = true;
  S.settings.defaultTrainerId = tr.id;
  await saveSettings();
}

/* =========================================================
 * Início
 * ======================================================= */
(async function init() {
  await DB.open();
  await loadAll();
  await seed();
  route();
})();

// Exposto para testes automatizados
window.__app = { S, buildSlides, exportProgramPdf };
})();
