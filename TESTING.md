# 🧪 ChartSense AI — testing guide

A complete guide: how to run the app and how to verify **every** feature. Go in order —
it takes ~15 minutes and covers the whole functionality.

---

## 1. Run

You need: **Node 20+** and **pnpm** (`npm i -g pnpm`).

```bash
pnpm install
pnpm dev
```

- Frontend: **http://localhost:5173**
- API: **http://localhost:4000** (check: http://localhost:4000/api/health)

The app works **out of the box with no configuration** — in demo mode:
- no OpenRouter key → the AI returns a realistic **mock response**;
- no MongoDB → data is kept **in memory** (lives until you restart `pnpm dev`).

### 1.1. Recommended `.env` for full testing

To test limits, tokens and the admin panel, create `apps/api/.env`:

```env
JWT_SECRET=test-secret-123
ADMIN_EMAIL=admin@test.com        # this email becomes the administrator
SUPPORT_CONTACT=Telegram: @your_handle
FREE_DAILY_LIMIT=3                 # small limit to quickly hit "limit reached"
PAID_ANALYSIS_COST=1
# OPENROUTER_API_KEY=             # empty = demo (mock). Add a key → "live" AI
# MONGODB_URI=                    # empty = in-memory data (reset on restart)
```

Restart `pnpm dev` after editing `.env`.

> ⚠️ Without `MONGODB_URI` everything works, but on server restart accounts, history and
> tokens are **reset**. That’s fine for local testing. For a “production-like” run, start
> MongoDB and set the connection string.

### 1.2. Modes (badge in the header)

- **DEMO · mock mode** (amber) — no OpenRouter key, responses are generated.
  In demo the forecast direction is **random** — on purpose (part of the project’s thesis).
- **LIVE · <model>** (green) — `OPENROUTER_API_KEY` is set, a real vision model is used.

---

## 2. Features and test scenarios

### A. Screenshot analysis (home `/`)
What it does: sends a chart image to the AI and shows a forecast card.

1. Upload a chart screenshot **three ways** (test each):
   - click the upload area → pick a file;
   - drag & drop a file;
   - **Ctrl+V** (paste from clipboard — handy after the Snipping Tool).
2. (Optional) enter a pair (e.g. `GBP/USD`) and choose an expiry.
3. Click **Analyze**.

✅ Expected: a card appears with **Forecast time / Currency pair / Direction (UP/DOWN/NEUTRAL) /
Expiry / Model / Model confidence (% bar) / Description** + signal tags. At the top of the page —
the amber disclaimer “AI does not predict the market”.

### B. Sign up and sign in
1. Click **Sign up** (in the header) → enter email + password (6+ chars) → “Sign up”.
2. ✅ You’re redirected home; the header shows: token balance, **History**, **Analytics**,
   email, **Sign out**.
3. Click **Sign out**, then **Sign in** — log in with the same email/password.
4. Check errors: wrong password → “Invalid email or password”; sign up with an existing email →
   “This email is already registered”.
5. Refresh the page (F5) — the session persists (token in localStorage).

### C. Analysis history (`/history`)
1. Sign in and run 2–3 analyses on the home page.
2. Open **History** in the header.
3. ✅ Analyses are listed. Summary on top: **Total analyses / Entries / Win rate / Σ payout**.
4. Mark an outcome on a card:
   - **Entered → Yes**, then **Win** or **Loss**, enter a **Payout** (e.g. `1.85`), click away.
   - ✅ The win-rate summary recalculates.
   - Click **Entered → No** — the result and payout fields disappear/reset.
5. Delete a row with the trash icon 🗑 → it disappears from the list.
6. Visiting `/history` while logged out → redirect to `/login`.

### D. Free-tier limit
(With `FREE_DAILY_LIMIT=3` this is quick. The limit is counted **per signed-in user**.)

1. While signed in, run analyses until you hit the limit (the 4th with a limit of 3).
2. ✅ A message appears: “**Daily free-analysis limit reached…**” with a
   **“Switch to a paid model”** button.

### E. Tokens and the paid model (`/billing`)
1. Click **“Switch to a paid model”** (from step D) OR just toggle to **Paid**.
2. With 0 tokens → ✅ error “**Not enough tokens**” + a **“Top up balance”** button.
3. Open **/billing** (click the balance in the header or the button):
   - you see **token packages** (50 / 200 / 1000), balance, support contact;
   - click **Order** on any package → ✅ message “Request created… contact support” and the
     request appears under **My requests** with status **pending**.

> There is no real payment (this is an educational project): an admin approves the request
> manually (step F).

### F. Admin panel (`/admin`)
Available only to the account with `ADMIN_EMAIL`.

1. Sign in as `admin@test.com` (as in `.env`). On sign-in it automatically gets the **admin**
   role and an **Admin** link appears in the header.
2. Open **/admin**:
   - **Top-up requests**: find the request from step E → **Credit** → ✅ tokens are credited to
     the user, status → **fulfilled**.
   - **Users**: type a number and click **Credit** (negative works too — debit); the
     **→ admin / → user** button switches the role.
3. Switch back to the regular user (the one you credited) and run a **paid** analysis →
   ✅ it goes through and the **balance in the header decreases** by 1.
4. A non-admin opening `/admin` → redirect home.

### G. Trade analytics (`/analytics`)
1. Open **Analytics** (needs a few analyses with marked outcomes — step C).
2. ✅ You see the win-rate summary and a **breakdown by instrument** (pair, entries, W/L, win-rate bar).
3. Click **“Get review”** → ✅ an AI insight text appears + **recommended tickers**
   (from the built-in list) + a disclaimer about the insignificance of differences.

### G2. Models: free fallback and paid choice
1. On the home page, below the fields, there’s a **Free / Paid** toggle.
2. **Free**: the server iterates free models in order until one responds (effect visible only
   with `OPENROUTER_API_KEY`; in demo — a single mock response).
3. **Paid**: a dropdown of paid models appears (with token price). The choice is **remembered**
   (profile + localStorage) — refresh the page and it stays selected.
4. If a paid model errors (LIVE only) — buttons for **other paid models** appear under the
   message; clicking one retries the analysis on the chosen alternative.
5. **Admin → AI models**: add a model (modelId / name / tier / price), enable/disable, change
   `order` and price, delete. Changes show up immediately in the home-page selector.

> Models are stored in the DB (or in memory without `MONGODB_URI`); the env arrays
> `OPENROUTER_FREE_MODELS` / `OPENROUTER_PAID_MODELS` only seed the DB on first run.

### H. Project thesis (what to highlight at the defense)
- The amber disclaimer on the home page and in analytics.
- In demo the forecast direction is random → the win rate on marked outcomes tends toward ~50%.
- Analytics explicitly states that differences between instruments on a small sample are noise.
  That is the conclusion: **AI provides no stable predictive edge**.

---

## 3. Testing the API directly (for the technical part of the defense)

Useful to show this is a full REST API. Examples (`curl`):

```bash
# health
curl -s localhost:4000/api/health

# sign up → returns {token, user}
curl -s -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"u@test.com","password":"secret123"}'

# analyze (1x1 demo image). Put the TOKEN from above to attach the analysis to the user
IMG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
curl -s -X POST localhost:4000/api/analyze \
  -H 'Content-Type: application/json' -H "Authorization: Bearer <TOKEN>" \
  -d "{\"imageDataUrl\":\"$IMG\",\"pairHint\":\"EUR/USD\"}"

# history, analytics, pricing
curl -s localhost:4000/api/analyses        -H "Authorization: Bearer <TOKEN>"
curl -s -X POST localhost:4000/api/analytics/insight -H "Authorization: Bearer <TOKEN>"
curl -s localhost:4000/api/billing/info
```

Full endpoint list: `auth` (register/login/me), `analyze`, `analyses`
(GET/PATCH/DELETE), `models`, `analytics/insight`, `billing` (info/topup/topup/mine),
`admin` (users/credit/role/topups/fulfill, models CRUD).

---

## 4. “Production-like” check (single service)

Build everything and serve frontend + API from one process:

```bash
pnpm build
SERVE_WEB=true PORT=4000 pnpm start
# open http://localhost:4000 — this is both the frontend and the API
```

✅ `/` and any route (`/history`, `/billing` …) serve the app (SPA),
`/api/*` is the API. This is how it works on Railway too (see README → “Deploy”).

---

## 5. Quick checklist

- [ ] `pnpm dev`, opened :5173, header shows DEMO
- [ ] Uploaded a screenshot 3 ways → got a forecast card
- [ ] Signed up / out / in; checked errors
- [ ] History: marked Yes→Win/Loss→Payout, “No” reset it, deleted a row
- [ ] Hit the daily limit → offered a paid model
- [ ] /billing: placed a request, saw the support contact
- [ ] As admin: approved a request, credited tokens, changed a role
- [ ] Paid analysis spent a token (header balance decreased)
- [ ] /analytics: instrument breakdown + “AI review” with recommendations
- [ ] Model choice: Free/Paid, paid choice is remembered; admin → Models (CRUD)
- [ ] (opt.) `SERVE_WEB=true pnpm start` — one service serves everything

If something behaves differently — tell me what and at which step, and I’ll fix it.
