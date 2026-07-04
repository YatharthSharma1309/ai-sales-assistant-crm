# Production Deployment Guide

Deploy without Docker using managed platforms:

| Layer | Platform | Why |
|-------|----------|-----|
| **Frontend** | [Vercel](https://vercel.com) | Free tier, Vite-native, global CDN |
| **API** | [Railway](https://railway.app) or [Render](https://render.com) | Native Node deploy (Nixpacks / buildpacks), PostgreSQL add-on |
| **Database** | Railway PostgreSQL or Render Postgres | Production-grade; SQLite is dev-only |

## Architecture

```
Browser → Vercel (React SPA) → VITE_API_URL → Railway/Render (Express API) → PostgreSQL
```

Local dev: `npm run dev:all` with SQLite (`packages/api/prisma/schema.prisma`).

---

## First deploy walkthrough (Railway + Vercel)

Repo: [github.com/YatharthSharma1309/ai-sales-assistant-crm](https://github.com/YatharthSharma1309/ai-sales-assistant-crm)

### Step 0 — Push latest code

Commit and push your branch so Railway/Vercel build the current app (including production checks and encrypted Google OAuth).

```bash
git add -A
git commit -m "Production deploy: security hardening, OpenRouter, workspace Google OAuth"
git push origin master
```

### Step 1 — Generate secrets (local only)

```bash
npm run generate:deploy-secrets
```

Save the output in a password manager. You will paste these into Railway — double-check you do **not** commit them.

Also have ready (from your local `packages/api/.env`, server-only):

- `OPENROUTER_API_KEY` — copy to Railway only; rotate if it was ever exposed

### Step 2 — Railway: API + PostgreSQL

1. Open [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `ai-sales-assistant-crm`.
2. **+ New** → **Database** → **PostgreSQL**. Open the DB service → **Connect** → copy `DATABASE_URL` (or use **Variable Reference** from the API service).
3. Click the **API service** (not the DB) → **Settings**:
   - **Root directory:** leave as repo root (`.`)
   - Build/start come from `railway.toml` (`npm ci && npm run build:api` → `npm run start:api`)
4. **Variables** → add (replace placeholders after you have URLs):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Reference from PostgreSQL plugin, or paste connection string |
| `JWT_SECRET` | From `npm run generate:deploy-secrets` |
| `SECRETS_ENCRYPTION_KEY` | From generator |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | From generator |
| `TRUST_PROXY` | `1` |
| `REFRESH_COOKIE_SAME_SITE` | `none` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (update after Step 3) |
| `API_PUBLIC_URL` | `https://YOUR-API.up.railway.app` (after Step 2f) |
| `OPENROUTER_API_KEY` | Your OpenRouter key |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.3-70b-instruct:free` |
| `CORS_ORIGINS` | Optional: `https://YOUR-APP.vercel.app,https://YOUR-APP-*.vercel.app` |

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` **empty** — configure Google on **Integrations** in the app.

5. **Settings** → **Networking** → **Generate domain** → copy URL (e.g. `https://ai-sales-assistant-crm-production.up.railway.app`).
6. Set `API_PUBLIC_URL` to that exact URL (no trailing slash).
7. **Deploy** → wait for build → open `https://YOUR-API.up.railway.app/api/health` → expect `{"status":"ok",...}`.

If the service crashes on start, open **Deploy logs**. Common fixes:

- `Production environment misconfigured` → add every variable from the Security table below
- `migrate deploy` failed → check `DATABASE_URL` points at PostgreSQL

### Step 3 — Vercel: frontend

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import `ai-sales-assistant-crm`.
2. **Root Directory:** `apps/web`
3. **Framework Preset:** Vite
4. **Build & Development Settings** (override for monorepo):

| Setting | Value |
|---------|--------|
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npm run build --workspace=apps/web` |
| Output Directory | `dist` |

5. **Environment Variables:**

| Name | Value |
|------|--------|
| `VITE_API_URL` | Your Railway API URL (no trailing slash) |

6. **Deploy**. Copy the production URL (e.g. `https://ai-sales-assistant-crm.vercel.app`).
7. Back on **Railway** → update `FRONTEND_URL` to that Vercel URL → redeploy API.

### Step 4 — Smoke test

1. Open your Vercel URL → **Register** a new workspace.
2. Sign in → create a lead and deal.
3. **Integrations** → (optional) paste Google OAuth Client ID + Secret → connect Calendar/Gmail.
4. Try **AI email draft** (uses OpenRouter if key is set).

### Step 5 — Google OAuth redirect URIs (when ready)

In [Google Cloud Console](https://console.cloud.google.com/) → your OAuth client → **Authorized redirect URIs**, add:

```
https://YOUR-API.up.railway.app/api/integrations/google/callback
https://YOUR-API.up.railway.app/api/integrations/gmail/callback
```

Use the redirect URIs shown on **Integrations** in the app (they match `API_PUBLIC_URL`).

---

## Option A — Railway + Vercel (reference)

### 1. Database & migrations

- **Dev:** SQLite via `npm run db:push`
- **Prod:** PostgreSQL via `packages/api/prisma/schema.postgresql.prisma`

On deploy, the API runs:

```bash
prisma migrate deploy --schema prisma/schema.postgresql.prisma
node dist/index.js
```

This is wired in `npm run start:api` (see `railway.toml`).

To test migrations against local Postgres:

```bash
# packages/api/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/crm"

npm run db:push:pg          # or migrate deploy after first baseline
npm run build:api
npm run start:api
```

Migrations live in `packages/api/prisma/migrations/`.

### 2. Deploy API on Railway

1. Push this repo to GitHub.
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → select the repo.
3. **Add PostgreSQL** (Plugins → PostgreSQL). Link it to the API service so `DATABASE_URL` is injected.
4. Service settings:
   - **Root directory:** repository root
   - Railway reads `railway.toml` — build/start commands are preconfigured
   - No Dockerfile required (Nixpacks builds Node natively)
5. Set environment variables (see [Environment checklist](#environment-checklist) below).
6. **Networking** → generate a public domain for the API service.
7. Verify: `GET https://YOUR_RAILWAY_URL/api/health` → `{ "status": "ok" }`.

**What Railway runs (from `railway.toml`):**

```bash
# Build
npm ci && npm run build:api

# Start
npm run start:api   # prisma migrate deploy (PG) + node dist/index.js
```

### 3. Deploy frontend on Vercel

1. Import the repo at [vercel.com](https://vercel.com).
2. **Root directory:** `apps/web`
3. **Framework:** Vite

**Monorepo settings (Vercel project → Settings → General):**

| Setting | Value |
|---------|--------|
| Install command | `cd ../.. && npm install` |
| Build command | `cd ../.. && npm run build --workspace=apps/web` |
| Output directory | `dist` |

4. Set **`VITE_API_URL`** to your Railway API URL (e.g. `https://your-api.railway.app`, no trailing slash).
5. Deploy. Open your Vercel URL and register a workspace.

`vercel.json` is SPA-only; the frontend calls the API directly via `VITE_API_URL`.

### 4. OAuth redirect URIs

Set these in each provider's console and match them in Railway env vars.

| Provider | Redirect URI |
|----------|--------------|
| Google Calendar | `https://YOUR_API_URL/api/integrations/google/callback` |
| Gmail | `https://YOUR_API_URL/api/integrations/gmail/callback` |
| HubSpot | `https://YOUR_API_URL/api/integrations/hubspot/callback` |

**Google Cloud Console:**
1. Enable **Google Calendar API** and **Gmail API**.
2. OAuth consent screen → add your Vercel domain.
3. Credentials → OAuth client → add all redirect URIs above.

**HubSpot Developer:**
1. Create a public app with scopes: `oauth`, `crm.objects.contacts.read/write`, `crm.objects.deals.read/write`.
2. Set redirect URI to the HubSpot callback above.
3. Configure webhook target URL: `https://YOUR_API_URL/api/integrations/hubspot/webhook`
4. Subscribe to: `contact.creation`, `contact.propertyChange`, `deal.creation`, `deal.propertyChange`.

### 5. Background sync jobs

**Built-in calendar sync:**

```env
CALENDAR_SYNC_ENABLED=true
CALENDAR_SYNC_INTERVAL_MS=3600000
```

**Built-in Gmail sync:**

```env
GMAIL_SYNC_ENABLED=true
GMAIL_SYNC_INTERVAL_MS=1800000
```

**External cron (calendar only):**

```http
POST https://YOUR_API_URL/api/integrations/cron/calendar-sync
x-cron-secret: YOUR_CRON_SECRET
```

---

## Option B — Render + Vercel

Same frontend on Vercel. API on [Render](https://render.com) using `render.yaml`:

1. Render Dashboard → **New** → **Blueprint** → connect GitHub repo.
2. Render creates a **Web Service** (`crm-api`) and **PostgreSQL** (`crm-db`).
3. Set all env vars from the checklist below in the Render dashboard.
4. Set `VITE_API_URL` on Vercel to your Render API URL.

```bash
npm ci && npm run build:api
npm run start:api
```

---

## Local production-like test

```bash
# packages/api/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/crm"
API_PUBLIC_URL="http://localhost:3001"

npm run db:push:pg
npm run build:api
npm run start:api
```

```bash
# apps/web/.env.production.local
VITE_API_URL=http://localhost:3001

npm run build --workspace=apps/web
npm run preview --workspace=apps/web
```

---

## Environment checklist

### Security (production)

The API validates required settings on startup when `NODE_ENV=production`. If anything is missing, the process exits with a clear error instead of running in an insecure state.

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` on Railway/Render |
| `SECRETS_ENCRYPTION_KEY` | 32-byte key (64 hex chars). Encrypts workspace Google OAuth secrets in the database. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Random string for `POST /api/communications/inbound` (required even if you do not use email logging yet) |

**Never commit or expose:**

- `packages/api/.env` (gitignored) — local secrets only
- Server keys: `JWT_SECRET`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, HubSpot/Google env fallbacks, `SECRETS_ENCRYPTION_KEY`
- On Vercel, only set **`VITE_*`** variables. They are embedded in the browser bundle — use **`VITE_API_URL`** only (no API keys in the frontend)

**Workspace Google OAuth:** Managers configure Client ID + Secret on **Integrations** in the app. Secrets are encrypted at rest when `SECRETS_ENCRYPTION_KEY` is set. You do **not** need `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in Railway unless you want a global env fallback.

**Rotate keys** if they were ever pasted into chat, logs, or a screenshot.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | At least 32 random characters (not `change-me` or `dev-secret`) |
| `REFRESH_TOKEN_TTL_DAYS` | Sliding inactivity window for refresh sessions (default `30`) |
| `REFRESH_TOKEN_ABSOLUTE_TTL_DAYS` | Maximum session lifetime from first sign-in (default `90`) |
| `INVITE_EXPIRY_HOURS` | Team invite link lifetime (default `168` = 7 days) |
| `FRONTEND_URL` | Vercel production URL (CORS + magic-link URLs) |
| `CORS_ORIGINS` | Vercel URL + preview URLs (comma-separated) |
| `API_PUBLIC_URL` | Public API URL (webhook signature verification) |
| `TRUST_PROXY` | Set `1` when API runs behind Railway/Render/nginx |
| `REFRESH_COOKIE_SAME_SITE` | `none` for cross-origin Vercel → API (requires HTTPS) |
| `COOKIE_DOMAIN` | Optional shared cookie domain (e.g. `.yourdomain.com`) |

### AI & email

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Optional — mock mode without it; get a key at [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_MODEL` | Optional — defaults to `meta-llama/llama-3.3-70b-instruct:free`; browse models at openrouter.ai/models |
| `RESEND_API_KEY` | Optional — email send |
| `RESEND_FROM_EMAIL` | Verified sender in Resend |
| `EMAIL_LOG_DOMAIN` | Domain for BCC addresses (e.g. `inbound.yourdomain.com`) |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Secret for `POST /api/communications/inbound` |

### Google (Calendar + Gmail)

**Recommended:** Leave server env empty and let each workspace admin set OAuth credentials on **Integrations → Google Calendar & Gmail** (encrypted at rest with `SECRETS_ENCRYPTION_KEY`).

Optional global fallback env vars:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client (optional fallback) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth secret (optional fallback) |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_API_URL/api/integrations/google/callback` |
| `GMAIL_REDIRECT_URI` | `https://YOUR_API_URL/api/integrations/gmail/callback` |
| `GMAIL_SYNC_ENABLED` | `true` for auto inbox sync |
| `GMAIL_SYNC_INTERVAL_MS` | Default `1800000` (30 min) |

### HubSpot

| Variable | Description |
|----------|-------------|
| `HUBSPOT_CLIENT_ID` | HubSpot app client ID |
| `HUBSPOT_CLIENT_SECRET` | HubSpot app secret (also used for webhook v3 signatures) |
| `HUBSPOT_REDIRECT_URI` | `https://YOUR_API_URL/api/integrations/hubspot/callback` |

### Calendar sync

| Variable | Description |
|----------|-------------|
| `CALENDAR_SYNC_ENABLED` | `true` for built-in auto-sync |
| `CALENDAR_SYNC_INTERVAL_MS` | Default `3600000` (1 hour) |
| `CALENDAR_SYNC_DAYS` | Days ahead to fetch (default `14`) |
| `CRON_SECRET` | For external cron hitting calendar-sync endpoint |

---

## Post-deploy smoke test

1. Register a new organization on the production URL.
2. Create a lead and deal; verify Kanban drag-and-drop and per-stage **Load more**.
3. **Settings** → update profile name and password.
4. **Dashboard** → confirm forecast and pipeline health load.
5. **Integrations** → import a small HubSpot or Salesforce CSV.
6. Connect Google Calendar → Sync → check timeline for meetings.
7. (Optional) Connect HubSpot OAuth → Sync → verify contacts/deals import.
8. (Optional) Connect Gmail → Sync inbox → check email activities.
9. Generate an AI email draft (works in mock mode without OpenRouter).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `FRONTEND_URL` to exact Vercel URL; add preview URLs to `CORS_ORIGINS` |
| API unreachable from browser | Set `VITE_API_URL` on Vercel; rebuild frontend |
| OAuth redirect mismatch | Redirect URI in provider console must exactly match env var |
| HubSpot webhook 401 | Set `API_PUBLIC_URL` to your public API URL; verify `HUBSPOT_CLIENT_SECRET` |
| Salesforce webhook 401 | Use `x-salesforce-webhook-secret` from Integrations page after connect |
| DB schema out of date | Check deploy logs for `migrate deploy` errors; run migrations manually if needed |
| DB resets on Railway/Render | Use PostgreSQL plugin, not SQLite |
| Build fails | Ensure `package-lock.json` exists; run `npm run build:api` locally first |
| Calendar/Gmail sync silent | Check logs for `[calendar-sync]` / `[gmail-sync]`; enable `*_SYNC_ENABLED=true` |
| Pagination empty page 2 | List endpoints use `?page=&pageSize=`; Kanban uses `/api/deals/kanban` |

---

## Why not Docker?

This project uses **native Node deploys** (Railway Nixpacks / Render buildpacks):

- No Dockerfile or compose networking to maintain
- Free tiers on Railway, Render, and Vercel
- Automatic HTTPS on managed platforms
- Monorepo builds via `npm run build:api` and `npm run start:api`

For a single VPS, use **PM2** or **systemd** with the same build/start commands behind **Caddy** or **nginx** as a reverse proxy.
