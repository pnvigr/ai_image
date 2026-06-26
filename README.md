# ChartSense AI

Educational diploma project: **how AI analyzes screenshots of trading charts**.

A user uploads a chart screenshot → the backend sends it to a vision model via
[OpenRouter](https://openrouter.ai) → the model returns a structured “forecast”
(pair, direction, expiry, confidence, description) that is rendered nicely on the frontend.

> ⚠️ **Core thesis:** AI does **not** predict the market. Any “forecast” is a reading of the
> image, not a guarantee. The real win rate is determined by the market and the platform’s
> conditions, not by the “power” of the model. The disclaimer is built into the UI on purpose.

## Stack

- **Monorepo:** pnpm workspaces + TypeScript
- **`apps/api`** — Node.js + Express + MongoDB (Mongoose) + OpenRouter
- **`apps/web`** — React + Vite + Tailwind CSS
- **`packages/shared`** — shared types & Zod schemas (one response format for front and back)
- **Deploy:** Railway

## Quick start

```bash
# 1. Install dependencies (Node >= 20, pnpm >= 9)
pnpm install

# 2. (optional) configure environment variables
cp apps/api/.env.example apps/api/.env
#   without MONGODB_URI        → history disabled, everything else works
#   without OPENROUTER_API_KEY → API returns mock responses (demo works out of the box)

# 3. Run frontend + backend together
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000 · health check: http://localhost:4000/api/health

In dev, Vite proxies `/api` to the backend, so the frontend needs no configuration.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `shared` (watch), `api` and `web` in parallel |
| `pnpm dev:api` / `pnpm dev:web` | Run individually |
| `pnpm build` | Build all packages (in topological order) |
| `pnpm typecheck` | Type-check the whole monorepo |
| `pnpm start` | Production start of the API from the built `dist` |

## OpenRouter

1. Get a key at https://openrouter.ai/keys
2. Put it in `apps/api/.env`:
   ```env
   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_FREE_MODEL=meta-llama/llama-3.2-11b-vision-instruct:free
   ```
3. Free vision models change / hit rate limits — browse the current list at
   https://openrouter.ai/models?modality=text+image (filter “free”). You can pass several
   via `OPENROUTER_FREE_MODELS` (comma-separated) — the server tries them **in order until one
   succeeds**. Switching a model is just an env var; no code changes needed.

Without a key, the API returns mock responses — the UI is fully clickable for a demo.

## Models (free fallback / paid choice)

- Models live in the database and are managed in the **Admin → AI models** panel. The env
  arrays `OPENROUTER_FREE_MODELS` / `OPENROUTER_PAID_MODELS` only **seed** the DB on first run.
- **Free:** the server iterates enabled free models by `order` until one returns a valid answer.
- **Paid:** the user picks a model (the choice is remembered in their profile); if the request
  fails, the UI offers the other paid models.

## Deploy on Railway

The project is a pnpm monorepo. The easiest setup is a **single service**: the API serves both
the REST API and the built frontend (SPA) from one domain — no CORS, no separate frontend URL.

### Option 1 — single service (recommended)

1. Create a Railway project from this repository (the root `railway.json` is already configured).
2. Add a database: **New → Database → MongoDB**.
3. Set the service environment variables:
   ```
   SERVE_WEB=true
   MONGODB_URI=${{MongoDB.MONGO_URL}}     # reference to the Railway DB variable
   JWT_SECRET=<long random string>
   OPENROUTER_API_KEY=<key; empty = demo/mock>
   ADMIN_EMAIL=<your email — becomes admin on sign-in>
   SUPPORT_CONTACT=<your contact for crediting tokens>
   # optional: FREE_DAILY_LIMIT, PAID_ANALYSIS_COST,
   #           OPENROUTER_FREE_MODELS, OPENROUTER_PAID_MODELS
   ```
   Leave `VITE_API_URL` empty — the frontend talks to the same domain (`/api`).
4. Build command: `pnpm build` · Start command: `pnpm start` (already in `railway.json`).
5. Open the service’s public domain — that’s the whole app.

> `VITE_API_URL` is inlined at frontend build time. For Option 1 it’s empty, so the frontend
> uses the relative `/api` — which is exactly what we want.

### Option 2 — two services (api and web separately)

Two services from one repo (Root Directory = repo root for both):

- **API** — Build: `pnpm run build:api` · Start: `pnpm start`
  Variables: `MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `ADMIN_EMAIL`,
  `SUPPORT_CONTACT`, `CORS_ORIGIN=<public URL of the web service>`.
- **WEB** — Build: `pnpm run build:web` · Start: `pnpm run start:web`
  Variable: `VITE_API_URL=<public URL of the api service>` (needed at build time).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `MONGODB_URI` | — | MongoDB connection string (empty = no persistence) |
| `JWT_SECRET` | insecure dev default | Secret for signing JWTs (set in prod) |
| `SERVE_WEB` | `false` | Serve the built frontend from the API (single-service deploy) |
| `CORS_ORIGIN` | `*` | Allowed origins (use the web URL for the two-service deploy) |
| `OPENROUTER_API_KEY` | — | Empty = demo/mock mode |
| `OPENROUTER_FREE_MODELS` | — | Comma-separated free models (seed) |
| `OPENROUTER_PAID_MODELS` | — | Comma-separated paid models (seed) |
| `ADMIN_EMAIL` | — | This email becomes admin on sign-in |
| `SUPPORT_CONTACT` | placeholder | Shown on the billing page for token crediting |
| `FREE_DAILY_LIMIT` | `20` | Daily free analyses per user |
| `PAID_ANALYSIS_COST` | `1` | Tokens per paid analysis |

## Roadmap

- [x] **Phase 1** — monorepo skeleton + core: screenshot → OpenRouter → forecast card
- [x] **Phase 2** — authentication (JWT)
- [x] **Phase 3** — analysis history + manual outcome marking (entered / result / payout)
- [x] **Phase 4** — tokens + paid model + admin panel
- [x] **Phase 5** — trade analytics & instrument recommendations
- [x] **Phase 6** — deploy on Railway
- [x] **Phase 7** — models in DB + admin: free fallback list, paid model choice
