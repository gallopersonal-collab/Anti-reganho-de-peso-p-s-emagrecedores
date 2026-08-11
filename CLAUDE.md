# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this project is

A marketing/product repository for **"Método Anti-Reganho de Peso"** — a course
by Professor José Carlos Gallo that teaches fitness professionals (personal
trainers, physical educators, nutritionists) how to prevent weight regain in
clients after they stop weight-loss medications (Ozempic, Wegovy, Mounjaro).

The repo contains three largely independent parts:

1. **`frontend/`** — a React single-page **landing page** that sells the course.
   This is the primary, actively developed artifact. It is a mostly-static,
   mock-data-driven marketing page. All copy is in **Brazilian Portuguese**.
2. **`backend/`** — a **FastAPI + MongoDB** service. Currently a scaffold from
   the base image (only a `StatusCheck` demo endpoint). Present for full-stack
   features but not yet doing course-specific work.
3. **`biblioteca-de-treinos/`** — a **content library** of 60 workout programs
   as Markdown files (a course deliverable / product asset, not application code).

> The stack comes from an Emergent base image (`fastapi_react_mongo_shadcn`,
> see `.emergent/emergent.yml`): FastAPI + React + MongoDB + shadcn/ui.

## Repository layout

```
.
├── backend/
│   ├── server.py           # entire FastAPI app (single file)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js          # composes the landing page from section components
│   │   ├── index.js        # React 19 entry (uses @/ alias)
│   │   ├── components/
│   │   │   ├── landing/     # page sections (HeroSection, OfferSection, ...)
│   │   │   └── ui/          # shadcn/ui primitives (button, card, accordion, ...)
│   │   ├── data/mock.js     # ALL landing-page copy/content lives here
│   │   ├── hooks/           # use-toast, etc.
│   │   └── lib/utils.js     # cn() classname helper
│   ├── plugins/             # craco visual-edits + health-check plugins
│   ├── craco.config.js      # CRA override (webpack alias, dev plugins)
│   ├── tailwind.config.js
│   └── package.json
├── biblioteca-de-treinos/   # 60 workout programs (Markdown content)
│   ├── roteiros/            # one detailed .md per program + README index
│   ├── emagrecimento-feminino.md, hipertrofia-feminina.md  # summary catalogs
├── tests/                   # backend pytest dir (currently empty scaffold)
├── test_result.md           # testing-protocol log (see rules below)
└── .claude/skills/add-feature/  # repo skill for adding features
```

## Frontend architecture & conventions

- **Stack:** React 19, react-scripts 5 driven by **CRACO** (`@craco/craco`),
  Tailwind CSS 3, **shadcn/ui** (new-york style) primitives + Radix UI,
  lucide-react icons. Package manager is **yarn** (`yarn@1.22.22`).
- **Import alias:** `@/` maps to `frontend/src/` (configured in both
  `jsconfig.json` and `craco.config.js`). Prefer `@/components/ui/button`
  over relative paths.
- **Content vs. presentation split (important):** every landing section is a
  presentational component that receives its copy through a `data` prop. All
  actual text/content lives in **`frontend/src/data/mock.js`** as exported
  objects (`heroData`, `offerData`, `faqData`, ...). `App.js` imports these and
  passes them down. **To change wording, edit `mock.js`, not the components.**
- **Section components** live in `frontend/src/components/landing/` as **named
  exports** (`export const FooSection = ({ data }) => {...}`), one per visual
  block. `App.js` composes them in order and labels them with `BLOCO N` comments.
  Some sections also take `checkoutLink` / `cta` props.
- **Styling:** Tailwind utility classes. Brand colors are used as hardcoded hex
  literals in `landing/` components — primarily `#012578` (deep blue),
  `#1CAF35` (green), `#FFFFFF`. `ui/` primitives use the CSS-variable theme
  tokens from `tailwind.config.js` / `index.css`.
- **Icons** are referenced by string name in `mock.js` (e.g. `icon: "Dumbbell"`)
  and mapped to `lucide-react` components inside the consuming section.
- **Checkout link:** `App.js` defines `CHECKOUT_LINK = "#checkout"` as a
  placeholder — a real Kiwify/Hotmart URL replaces it (see the `TODO`).
- Do **not** add a new component/UI library — Radix, axios, react-hook-form,
  zod, date-fns, lucide-react, sonner, embla-carousel are already available.

## Backend architecture & conventions

`backend/server.py` is the **entire** backend (single file). When extending it,
follow the existing patterns exactly:

- **Router prefix:** register routes on `api_router` (prefix `/api`), never
  directly on `app`. It is included via `app.include_router(api_router)`.
- **IDs:** UUID4 **strings** (`Field(default_factory=lambda: str(uuid.uuid4()))`),
  never Mongo `ObjectId`.
- **Datetimes:** timezone-aware UTC (`datetime.now(timezone.utc)`). Serialize to
  **ISO strings** before `insert_one`, and parse back to `datetime` on read.
- **Models:** every stored model uses `model_config = ConfigDict(extra="ignore")`
  (so Mongo's `_id` is dropped), and is paired with a separate `...Create` input
  model.
- **Mongo:** async via **motor** (`AsyncIOMotorClient`); `db` is already
  configured from `MONGO_URL` / `DB_NAME` env vars. Query with the `{"_id": 0}`
  projection so `_id` never leaks into responses.
- **Config:** env vars loaded from `backend/.env` via `python-dotenv`
  (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`). The `.env` file is git-ignored and
  not present in the repo — do not commit secrets.

## The workout library (`biblioteca-de-treinos/`)

Course content, not code. 60 workout programs as Markdown. `roteiros/README.md`
is the master index; each program has a detailed `roteiros/<CODE>.md` roteiro.

**Program code convention:** `OBJETIVO-SEXO-FAIXA-NÍVEL-AMBIENTE`, e.g.
`EMA-F-20-29-INI-ACA`:

- **Objetivo:** `EMA` emagrecimento · `HIP` hipertrofia · `DEF` definição ·
  `SAU` saúde/qualidade de vida · `PER` performance
- **Sexo:** `F` feminino · `M` masculino
- **Faixa etária:** e.g. `20-29`, `40-49`, `20-60`
- **Nível:** `INI` iniciante · `INT` intermediário · `AVA` avançado · `HIT` HIIT
- **Ambiente:** `ACA` academia · `CAS` casa · `ELA` elásticos/faixas

Each roteiro follows a fixed structure (visão geral, aquecimento padrão, treinos
da semana with exercise tables, execução dos exercícios, progressão, diretrizes
de carga, observações de segurança). When adding or editing a program, **match
this structure and keep the `roteiros/README.md` index in sync** (code, program
name, frequency, link).

## Development workflows

Frontend (from `frontend/`):

```bash
yarn install
yarn start     # craco start — dev server on http://localhost:3000
yarn build     # craco build — production build to frontend/build
yarn test      # craco test  — CRA/Jest test runner
```

Backend (from `backend/`):

```bash
pip install -r requirements.txt
uvicorn server:app --reload    # needs MONGO_URL and DB_NAME in backend/.env
```

Notes:
- The CRACO config conditionally loads **visual-edits** babel/dev-server plugins
  in dev mode, and **health-check** plugins when `ENABLE_HEALTH_CHECK=true`.
  Neither is needed for normal feature work.
- No `.env` files are committed; the app expects them to be provided by the
  environment. If Mongo/env is unavailable, say so rather than implying a run
  passed.

## Testing protocol (`test_result.md`)

`test_result.md` is the shared testing-communication log used by this repo's
agent workflow. Rules:

- **Never edit or remove** the protected block at the top of the file (between
  the `START`/`END - Testing Protocol` banners).
- Log testing status **below** the protected section, using the documented YAML
  task structure (`task`, `implemented`, `working`, `file`, `stuck_count`,
  `priority`, `needs_retesting`, `status_history` with `agent`, plus `test_plan`
  and `agent_communication`).
- Update it **before** delegating to a testing agent; set `needs_retesting` and
  record what changed in `status_history` / `agent_communication`.

## Adding a feature

There is a repo skill at `.claude/skills/add-feature/SKILL.md` describing the
end-to-end flow (model → API route → frontend wiring/UI → tests →
`test_result.md`). Follow it for anything that spans backend and/or frontend.
Most landing-page changes are **frontend-only** and driven by `mock.js`.

## Git & PR workflow

- **All work goes on the designated feature branch** — do not push to `main`
  or any other branch without explicit permission.
- Commit with clear, descriptive messages (the existing history is in
  Portuguese; match that if editing course/landing content).
- Push with `git push -u origin <branch>`; after pushing, open a **draft PR**
  for the branch if no open PR exists yet.
- If the branch's PR was already merged, restart the branch from the latest
  default branch for follow-up work rather than stacking onto merged history.

## Conventions summary (quick reference)

- Landing copy → `frontend/src/data/mock.js`; components stay presentational.
- New landing sections → `components/landing/`, named export, `data` prop,
  registered in `App.js` in visual order.
- Reuse existing `components/ui/` primitives; no new UI libraries.
- Backend routes → `api_router` (`/api`), UUID string IDs, UTC datetimes,
  ISO-string serialization for Mongo, `{"_id": 0}` projections.
- Use the `@/` import alias in the frontend.
- Content language is Brazilian Portuguese.
- Keep the workout-library index (`roteiros/README.md`) in sync with roteiros.
```
