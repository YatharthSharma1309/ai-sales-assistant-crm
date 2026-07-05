# Production Deployment Guide

Deploy without Docker using managed platforms.

## Current production stack (recommended)

| Layer | Platform | Live URL |
|-------|----------|----------|
| **Frontend** | Vercel | https://ai-sales-assistant-crm.vercel.app |
| **API** | Vercel (serverless) | https://ai-sales-assistant-crm-api.vercel.app |
| **Database** | [Neon](https://neon.tech) PostgreSQL | Project: `ai-sales-assistant-crm` |

```
Browser → Vercel (React SPA) → VITE_API_URL → Vercel API → Neon PostgreSQL
```

Local dev: `npm run dev:all` with SQLite (`packages/api/prisma/schema.prisma`).

> **Status checklist:** see [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) for what is complete vs optional.

---

## First deploy walkthrough (Vercel + Neon)

Repo: [github.com/YatharthSharma1309/ai-sales-assistant-crm](https://github.com/YatharthSharma1309/ai-sales-assistant-crm)

### Step 0 — Push latest code

```bash
git push origin master
```

### Step 1 — Generate secrets (local only)

```bash
npm run generate:deploy-secrets
```

Save output in a password manager. Paste into **Vercel API project** env vars — never commit.

### Step 2 — Neon: PostgreSQL

1. [console.neon.tech](https://console.neon.tech) → **New Project** → name `ai-sales-assistant-crm`
2. Copy the **pooled** `DATABASE_URL` (with `?sslmode=require`)
3. Migrations run automatically on API deploy (`vercel.api.json` build step)

### Step 3 — Vercel: API

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import repo
2. Project name: `ai-sales-assistant-crm-api`
3. Use root config: `vercel.api.json` (deploy from repo root):

```bash
npx vercel deploy --prod --local-config vercel.api.json --project ai-sales-assistant-crm-api
```

4. **Environment variables** (API project):

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon pooled connection string |
| `JWT_SECRET` | From `npm run generate:deploy-secrets` |
| `SECRETS_ENCRYPTION_KEY` | From generator |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | From generator |
| `CRON_SECRET` | From generator (Vercel Cron sends `Authorization: Bearer …`) |
| `TRUST_PROXY` | `1` |
| `REFRESH_COOKIE_SAME_SITE` | `none` |
| `FRONTEND_URL` | `https://ai-sales-assistant-crm.vercel.app` |
| `API_PUBLIC_URL` | `https://ai-sales-assistant-crm-api.vercel.app` |
| `CORS_ORIGINS` | `https://ai-sales-assistant-crm.vercel.app` |
| `OPENROUTER_API_KEY` | Your OpenRouter key |
| `OPENROUTER_MODEL` | `meta-llama/llama-3.3-70b-instruct:free` |
| `RESEND_API_KEY` | Optional — real email send |
| `RESEND_FROM_EMAIL` | e.g. `Sales <onboarding@resend.dev>` |

5. Verify: `GET https://ai-sales-assistant-crm-api.vercel.app/api/health` → `{"status":"ok",...}`

**Vercel Cron** (Hobby: one daily job at 09:00 UTC via `/api/cron/daily`): stale-deal alerts + calendar + Gmail sync. Requires `CRON_SECRET` in env. Per-job cron URLs remain available for manual `curl` with `x-cron-secret`.

### Step 4 — Vercel: frontend

1. New project: `ai-sales-assistant-crm` (or use existing)
2. Deploy from repo root with `vercel.web.json`:

```bash
npx vercel deploy --prod --local-config vercel.web.json --project ai-sales-assistant-crm
```

3. **Environment variable:**

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://ai-sales-assistant-crm-api.vercel.app` |

4. Open https://ai-sales-assistant-crm.vercel.app → register or use owner account.

### Step 5 — Demo data (optional)

Seed a visitor-friendly demo workspace on production:

```bash
# packages/api — with DATABASE_URL pointing at Neon
npx prisma generate --schema prisma/schema.postgresql.prisma
node scripts/seed-demo.mjs
```

Login: `demo@example.com` / `DemoPass123!` (workspace: **Acme SaaS Demo**).

### Step 6 — Google OAuth redirect URIs (when ready)

In [Google Cloud Console](https://console.cloud.google.com/) → OAuth client → **Authorized redirect URIs**:

```
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/google/callback
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/gmail/callback
```

Or configure per-workspace on **Integrations** (recommended; secrets encrypted at rest).

---

## Alternative — Railway + Vercel

Same frontend on Vercel. API on [Railway](https://railway.app) using `railway.toml` (long-running Node — interval jobs work without cron):

1. Railway → **Deploy from GitHub** → add PostgreSQL plugin
2. Set env vars from checklist below
3. `VITE_API_URL` on Vercel → Railway API URL

See `railway.toml` and **Option B — Render** below for blueprint deploy.

---

## Architecture reference

```
Browser → Vercel (React SPA) → VITE_API_URL → API (Vercel or Railway) → PostgreSQL
```

### Database & migrations

- **Dev:** SQLite via `npm run db:push`
- **Prod:** PostgreSQL via `packages/api/prisma/schema.postgresql.prisma`

On Railway/long-running deploy:

```bash
npm run start:api   # prisma migrate deploy + node dist/index.js
```

On Vercel, migrations run in the build step (`vercel.api.json`).

Migrations live in `packages/api/prisma/migrations/`.

---

## Option B — Render + Vercel

Same frontend on Vercel. API on [Render](https://render.com) using `render.yaml`:

1. Render Dashboard → **New** → **Blueprint** → connect GitHub repo.
2. Render creates a **Web Service** (`crm-api`) and **PostgreSQL** (`crm-db`).
3. Set all env vars from the checklist below.
4. Set `VITE_API_URL` on Vercel to your Render API URL.

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
| `NODE_ENV` | Set to `production` |
| `SECRETS_ENCRYPTION_KEY` | 32-byte key (64 hex chars). Encrypts workspace Google OAuth secrets in the database. |
| `INBOUND_EMAIL_WEBHOOK_SECRET` | Random string for `POST /api/communications/inbound` |
| `CRON_SECRET` | For Vercel Cron / external cron (`Authorization: Bearer` or `x-cron-secret`) |

**Never commit or expose:**

- `packages/api/.env` (gitignored) — local secrets only
- Server keys: `JWT_SECRET`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`, HubSpot/Google env fallbacks, `SECRETS_ENCRYPTION_KEY`
- On Vercel frontend, only set **`VITE_*`** variables — use **`VITE_API_URL`** only (no API keys in the browser bundle)

**Workspace Google OAuth:** Managers configure Client ID + Secret on **Integrations** in the app. Secrets are encrypted at rest when `SECRETS_ENCRYPTION_KEY` is set.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | At least 32 random characters |
| `REFRESH_TOKEN_TTL_DAYS` | Default `30` |
| `REFRESH_TOKEN_ABSOLUTE_TTL_DAYS` | Default `90` |
| `INVITE_EXPIRY_HOURS` | Default `168` (7 days) |
| `FRONTEND_URL` | Vercel production URL (CORS + magic-link URLs) |
| `CORS_ORIGINS` | Vercel URL + preview URLs (comma-separated) |
| `API_PUBLIC_URL` | Public API URL (webhook signature verification) |
| `TRUST_PROXY` | Set `1` when API runs behind Vercel/Railway/Render |
| `REFRESH_COOKIE_SAME_SITE` | `none` for cross-origin Vercel → API (requires HTTPS) |

### AI & email

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Optional — mock mode without it |
| `OPENROUTER_MODEL` | Optional — defaults to free Llama model |
| `RESEND_API_KEY` | Optional — real email send |
| `RESEND_FROM_EMAIL` | Verified sender in Resend |

### Google (Calendar + Gmail)

Configure on **Integrations** in the app (recommended), or optional global env fallback:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Optional fallback |
| `GOOGLE_CLIENT_SECRET` | Optional fallback |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_API_URL/api/integrations/google/callback` |
| `GMAIL_REDIRECT_URI` | `https://YOUR_API_URL/api/integrations/gmail/callback` |

### HubSpot / Salesforce

Set redirect URIs in provider consoles to match `API_PUBLIC_URL`. See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for production URLs.

### Background sync

| Mode | Config |
|------|--------|
| **Vercel Cron** | `CRON_SECRET` + `vercel.api.json` crons (default for this project) |
| **Railway/Render intervals** | `CALENDAR_SYNC_ENABLED=true`, `GMAIL_SYNC_ENABLED=true`, `STALE_DEAL_ALERTS_ENABLED=true` |
| **External cron** | `POST /api/integrations/cron/calendar-sync` with `x-cron-secret` |

---

## Post-deploy smoke test

1. Login at production URL (owner or `demo@example.com`).
2. Create a lead and deal; verify Kanban drag-and-drop.
3. **Settings** → update profile / password.
4. **Dashboard** → confirm metrics load.
5. **Integrations** → optional CSV import or OAuth connect.
6. Generate an AI email draft (OpenRouter or mock).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `FRONTEND_URL` to exact Vercel URL; add preview URLs to `CORS_ORIGINS` |
| API unreachable from browser | Set `VITE_API_URL` on Vercel frontend; rebuild |
| OAuth redirect mismatch | Redirect URI in provider console must exactly match env / Integrations page |
| DB schema out of date | Check deploy logs for `migrate deploy` errors |
| Cron 401 | Set `CRON_SECRET` on API project; Vercel sends `Authorization: Bearer` |
| Calendar/Gmail sync silent on Vercel | Use Vercel Cron paths or manual Sync in Integrations |
| Build fails on API deploy | Deploy with `--project ai-sales-assistant-crm-api` and `vercel.api.json` from repo root |

---

## Why not Docker?

Native Node deploys (Vercel serverless, Railway Nixpacks, Render buildpacks):

- No Dockerfile maintenance
- Free tiers on Vercel, Neon, Railway, Render
- Automatic HTTPS
- Monorepo builds via `npm run build:api` and `vercel.web.json`

For a single VPS, use **PM2** or **systemd** with the same build/start commands behind **Caddy** or **nginx**.
