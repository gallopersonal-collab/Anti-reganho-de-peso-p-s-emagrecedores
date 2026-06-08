---
name: add-feature
description: >-
  End-to-end workflow for adding a feature to this app across the FastAPI
  backend and the React (CRACO) frontend, following the repo's existing
  conventions: model -> API route -> frontend wiring/UI -> tests ->
  test_result.md update. Use this whenever the user asks to "add a feature",
  "create an endpoint", "wire up the backend", "add a section/component",
  or otherwise implement functionality that spans backend and/or frontend.
---

# Add a feature (backend + frontend)

A repeatable, convention-matching workflow for shipping a feature in this
repo. Work through the steps in order; skip a layer only if the feature
genuinely doesn't touch it (and say so).

## 0. Orient first

- Confirm scope: backend-only, frontend-only, or full stack?
- Read the files you'll touch before editing:
  - Backend lives entirely in `backend/server.py`.
  - Frontend entry is `frontend/src/App.js`; feature UI lives in
    `frontend/src/components/landing/`; reusable primitives are the
    shadcn-style components in `frontend/src/components/ui/`.
  - Placeholder/content data lives in `frontend/src/data/mock.js`.
- Match the surrounding style. Do not introduce new libraries when an
  existing dependency already covers the need (Radix UI, axios, react-hook-form,
  zod, date-fns, lucide-react, sonner are all already available).

## 1. Backend: model

In `backend/server.py`, add Pydantic v2 models next to the existing ones.
Follow the established pattern exactly:

```python
class Thing(BaseModel):
    model_config = ConfigDict(extra="ignore")  # ignore MongoDB's _id field

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ThingCreate(BaseModel):
    name: str
```

Conventions to keep:
- IDs are **UUID4 strings**, never Mongo `ObjectId`.
- Datetimes are **timezone-aware UTC** (`datetime.now(timezone.utc)`).
- Always pair a full model with a separate `...Create` input model.

## 2. Backend: route

Register routes on `api_router` (prefix `/api`), never directly on `app`.
The router is included via `app.include_router(api_router)` at the bottom.

```python
@api_router.post("/things", response_model=Thing)
async def create_thing(input: ThingCreate):
    obj = Thing(**input.model_dump())
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()  # serialize datetime for Mongo
    await db.things.insert_one(doc)
    return obj

@api_router.get("/things", response_model=List[Thing])
async def get_things():
    docs = await db.things.find({}, {"_id": 0}).to_list(1000)  # exclude _id
    for d in docs:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return docs
```

Conventions to keep:
- Serialize datetimes to **ISO strings** before `insert_one`, parse back on read.
- Query with the `{"_id": 0}` projection so the `_id` field never leaks.
- Use `motor` async calls (`await db.<collection>...`); `db` is already defined.

## 3. Frontend: wire the API (only if the feature calls the backend)

The app is currently a mostly-static landing page driven by mock data, so
many features are frontend-only. If you DO need the backend:

- Base the call on `process.env.REACT_APP_BACKEND_URL` and the `/api` prefix,
  e.g. `` const API = `${process.env.REACT_APP_BACKEND_URL}/api`; ``.
- Use `axios` (already a dependency). Never hardcode hostnames.

## 4. Frontend: UI

- New page sections go in `frontend/src/components/landing/` as named exports
  (e.g. `export const FooSection = ({ data }) => { ... }`), matching siblings.
- Components receive their content via a `data` prop. Put the content/copy in
  `frontend/src/data/mock.js` and pass it down from `App.js`, mirroring how
  the existing sections are composed.
- Build UI from the existing `components/ui/` primitives and Tailwind classes;
  don't add a new component library.
- Register the section in `frontend/src/App.js` in the correct visual order.

## 5. Tests

- Backend: add/extend pytest tests under `tests/`.
- Frontend: `cd frontend && yarn test` (CRACO test runner) when applicable.
- Run what you changed; report real output. If you couldn't run something
  (e.g. no Mongo / no env), say so explicitly rather than implying it passed.

## 6. Update `test_result.md`

This file is the testing-protocol communication log. **Do not edit or remove
the protected block at the top.** Append/update a YAML task entry under the
`backend:` or `frontend:` section using the documented structure (task,
implemented, working, file, stuck_count, priority, needs_retesting,
status_history with agent: "main").

## 7. Wrap up

- Summarize what changed per layer and how it was (or wasn't) verified.
- Commit on the active feature branch with a clear message; push and open a
  draft PR per repo workflow. Do not push to a different branch.
