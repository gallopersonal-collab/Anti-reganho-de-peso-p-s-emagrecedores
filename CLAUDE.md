# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this project is

A **single-page marketing landing page** for a Brazilian online course —
"Curso de Especialista no Método Anti-Reganho de Peso" (a course teaching
fitness/nutrition professionals how to prevent weight regain in clients coming
off weight-loss medications like Ozempic, Wegovy, and Mounjaro).

The repo is a full-stack scaffold (FastAPI + React + MongoDB) generated from an
Emergent base image, but in its current state it is **almost entirely a static,
mock-data-driven React landing page**. The backend exists but is only a
boilerplate "status check" CRUD example — the frontend does **not** call it yet.
All page copy is in Brazilian Portuguese.

## Repository layout

```
.
├── backend/
│   ├── server.py          # ENTIRE backend: FastAPI app, models, routes, Mongo wiring
│   ├── requirements.txt    # Python deps (fastapi, motor, pydantic v2, pytest, black…)
│   └── .env                # (gitignored) MONGO_URL, DB_NAME, CORS_ORIGINS
├── frontend/
│   ├── src/
│   │   ├── App.js          # Composition root: imports sections + mock data, lays out the page
│   │   ├── index.js        # React entry point
│   │   ├── data/mock.js    # ALL page content/copy lives here (heroData, offerData, faqData…)
│   │   ├── components/
│   │   │   ├── landing/     # The page sections (HeroSection, OfferSection, FAQSection…)
│   │   │   └── ui/          # shadcn/ui (new-york style) primitives — Radix-based, ~50 files
│   │   ├── hooks/use-toast.js
│   │   └── lib/utils.js    # `cn()` className helper (clsx + tailwind-merge)
│   ├── plugins/            # Emergent dev tooling: visual-edits + health-check (dev-only)
│   ├── craco.config.js     # CRACO override of CRA; sets `@` alias, conditional plugins
│   ├── tailwind.config.js
│   ├── components.json     # shadcn/ui config
│   ├── package.json        # uses yarn (packageManager pinned); scripts use craco
│   └── .env                # (gitignored) REACT_APP_BACKEND_URL
├── tests/                  # Python test package (currently only __init__.py — no tests yet)
├── test_result.md          # Testing-protocol log (see "Testing protocol" below)
└── .claude/skills/add-feature/SKILL.md   # Repo-specific feature workflow skill
```

## Tech stack

- **Frontend:** React 19, React Router 7, CRA tooling via **CRACO**, Tailwind CSS
  3, shadcn/ui (new-york style) on Radix UI, lucide-react icons, axios,
  react-hook-form + zod, sonner (toasts), date-fns. **JavaScript, not TypeScript**
  (`.jsx`/`.js`; `tsx: false`).
- **Backend:** FastAPI, Motor (async MongoDB), Pydantic v2, Uvicorn.
- **Database:** MongoDB.
- **Package managers:** `yarn` for frontend, `pip` for backend.

## Development commands

### Frontend (`cd frontend`)
```bash
yarn install        # install deps
yarn start          # dev server on http://localhost:3000 (craco start)
yarn build          # production build (craco build)
yarn test           # CRA/craco test runner (Jest + React Testing Library, watch mode)
```

### Backend (`cd backend`)
```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8000   # API served under the /api prefix
```
Backend tooling available via requirements: `black`, `isort`, `flake8`, `mypy`,
`pytest`.

### Environment variables
Both `.env` files are **gitignored** and not committed — create them locally.
- `backend/.env`: `MONGO_URL`, `DB_NAME`, optional `CORS_ORIGINS` (comma-separated).
- `frontend/.env`: `REACT_APP_BACKEND_URL` (base URL the frontend would use for
  API calls). Optional `ENABLE_HEALTH_CHECK=true` to turn on the health-check
  plugin.

## Key conventions

### Frontend
- **Path alias:** `@/` → `frontend/src/` (configured in `craco.config.js` and
  `jsconfig.json`). Import primitives as `@/components/ui/button`, etc.
- **Content vs. presentation split:** Page text/copy is **data**, not hardcoded
  in JSX. It lives in `src/data/mock.js` as exported objects, is imported in
  `App.js`, and passed down to each section via a `data` prop. When changing
  copy, edit `mock.js` — not the components.
- **Section components:** Each block of the page is a **named export** in
  `src/components/landing/`, e.g. `export const FooSection = ({ data }) => {…}`.
  They receive content via props (`data`, sometimes `checkoutLink`, `cta`).
- **Page assembly:** `App.js` is the single composition root. It imports every
  section and its data and renders them in visual order. The page is organized
  into commented "BLOCO" (block) sections. To add/remove/reorder a section, edit
  `App.js`.
- **UI primitives:** Build from the existing shadcn/ui components in
  `components/ui/` plus Tailwind utility classes. **Do not add a new component
  library.** Use the `cn()` helper from `@/lib/utils` for conditional classes.
- **Brand colors** (used directly as Tailwind arbitrary values): deep blue
  `#012578`, green `#1CAF35`, white `#FFFFFF`. Match these in new sections.
- **Checkout link:** `App.js` has a `CHECKOUT_LINK` constant (currently
  `"#checkout"`, a TODO placeholder for the real Kiwify/Hotmart URL) threaded
  into CTA sections.
- **Language:** All user-facing copy is Brazilian Portuguese. Keep it consistent.
- Dependencies already available (don't reach for new ones): Radix UI, axios,
  react-hook-form, zod, date-fns, lucide-react, sonner, embla-carousel.

### Backend (`backend/server.py` — the whole backend)
- **IDs are UUID4 strings**, never Mongo `ObjectId`:
  `id: str = Field(default_factory=lambda: str(uuid.uuid4()))`.
- **Datetimes are timezone-aware UTC** (`datetime.now(timezone.utc)`).
  Serialize to **ISO strings** before `insert_one`, and parse back with
  `datetime.fromisoformat` on read.
- **Pydantic v2** models with `model_config = ConfigDict(extra="ignore")` (so
  Mongo's `_id` is ignored). Always pair a full model with a `...Create` input
  model.
- **Routes register on `api_router`** (prefix `/api`), never directly on `app`.
  The router is included at the bottom via `app.include_router(api_router)`.
- **Queries use the `{"_id": 0}` projection** so Mongo's `_id` never leaks into
  responses.
- Use **Motor async** calls (`await db.<collection>...`); `db` is already defined
  from `MONGO_URL`/`DB_NAME`.
- CORS origins come from `CORS_ORIGINS` env (defaults to `*`).

## Adding a feature

There is a dedicated skill: **`.claude/skills/add-feature/SKILL.md`**. Invoke /
follow it when implementing functionality that spans the backend and/or
frontend. The summarized flow:
1. **Orient** — confirm scope (backend-only / frontend-only / full stack); read
   files before editing.
2. **Backend model** — add Pydantic v2 model + `...Create` model next to the
   existing ones in `server.py`.
3. **Backend route** — register on `api_router`; serialize datetimes; use
   `{"_id": 0}` projection.
4. **Frontend API** (only if the feature calls the backend) — use
   `` `${process.env.REACT_APP_BACKEND_URL}/api` `` + axios. Never hardcode hosts.
5. **Frontend UI** — new section as a named export in `components/landing/`,
   content in `mock.js`, registered in `App.js` in the right order, built from
   `components/ui/` primitives.
6. **Tests** — backend pytest under `tests/`; frontend `yarn test`. Run what you
   changed and report real output (say so if you couldn't run something).
7. **Update `test_result.md`** (see below).

## Testing protocol (`test_result.md`)

`test_result.md` is the communication log between the "main" and "testing"
agents, in a specific YAML format.
- **Never edit or remove the protected block at the top** of the file (it is
  fenced with `START`/`END - Testing Protocol - DO NOT EDIT OR REMOVE`).
- Append/update YAML task entries under the `backend:` / `frontend:` sections
  using the documented structure (`task`, `implemented`, `working`, `file`,
  `stuck_count`, `priority`, `needs_retesting`, `status_history`, …).
- Update this file **before** delegating testing, per the protocol guidelines.

## Git & workflow

- This is a git repository; the default branch is `main`.
- Do feature work on a dedicated branch (do **not** commit directly to `main`).
- After pushing, open a **draft PR**.
- The GitHub-scoped repo for this session is
  `gallopersonal-collab/anti-reganho-de-peso-p-s-emagrecedores`. Use the GitHub
  MCP tools (`mcp__github__*`) for PR/issue/CI operations — there is no `gh` CLI.

## Notes & gotchas

- The frontend is **not wired to the backend** today; it renders entirely from
  `mock.js`. Don't assume an existing API call when reading the UI.
- `backend/server.py` is the *entire* backend — there is no package structure,
  router directory, or service layer. Add to it directly, matching the patterns.
- `frontend/plugins/` (visual-edits, health-check) is Emergent dev tooling loaded
  conditionally in `craco.config.js`; visual-edits runs only on the dev server,
  health-check only when `ENABLE_HEALTH_CHECK=true`. Generally leave it alone.
- The root `README.md` is a stub ("Here are your Instructions"); this CLAUDE.md
  is the authoritative project guide.
</content>
</invoke>
