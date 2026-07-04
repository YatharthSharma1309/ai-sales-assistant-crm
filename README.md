# AI Sales Assistant CRM

CRM for B2B SaaS sales teams with lead management, pipeline tracking, AI-powered follow-up emails, and live integrations with HubSpot, Salesforce, Google Calendar, and Gmail.

## Features

### Auth & security
- **Dual-token sessions** — 15-minute access JWT + httpOnly refresh cookie with rotation, reuse detection, and sliding/absolute TTL (`AuthSession` table)
- **Magic-link team invites** — Email invite links; no temporary passwords
- **Verified email change** — Re-auth + confirmation link to new address
- **Session control** — Per-device logout, sign out everywhere, revoke on password/email change

### Core CRM
- **Multi-tenant workspaces** — Register, login, switch organizations
- **Accounts & contacts** — B2B company and people management with detail pages
- **Lead management** — Search, filter, CSV import, scoring (0–100), detail pages
- **Pipeline** — Drag-and-drop Kanban with per-stage pagination, deal detail pages, weighted forecast
- **Activity timeline** — Notes, calls, emails, meetings, tasks on leads/contacts/deals
- **Team & RBAC** — ADMIN / MANAGER / REP roles, magic-link invites, manager dashboard
- **Assignment** — Reps see only their assigned leads and deals
- **Onboarding** — Guided setup wizard for new workspaces
- **Paginated lists** — Accounts, contacts, leads, deals, and activities use `{ data, pagination }`

### AI & communications
- **AI emails** — Context-aware drafts from leads/deals (OpenRouter or mock mode)
- **Meeting summaries** — AI summaries from pasted notes; action items as tasks
- **Email send** — Resend integration from AI drafts (optional)
- **BCC email logging** — Outbound emails auto-BCC a workspace address; inbound webhook logs to timeline

### Analytics
- **Dashboard metrics** — Lead/deal counts, pipeline ARR, weighted forecast
- **Pipeline forecast** — Stage breakdown, win rate, pipeline health score
- **Lead scoring** — Auto-calculated from status, source, job title, recent engagement

### Integrations

| Integration | Capabilities |
|-------------|--------------|
| **Google Calendar** | OAuth, manual + auto-sync meetings to timeline |
| **Gmail** | OAuth, sync recent inbox emails to timeline |
| **HubSpot** | OAuth or private app token, live sync, inbound webhooks, outbound push |
| **Salesforce** | Token + instance URL sync, inbound webhooks (Flow/Apex), outbound push |
| **CSV import** | HubSpot contacts/deals; Salesforce contacts/leads/opportunities |

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Redux Toolkit, Tailwind, Vite, React Router |
| Backend | Node.js, Express 5, Prisma 6 |
| Shared | `@crm/shared` — pipeline stages and constants |
| Database | SQLite (local dev), PostgreSQL (production) |

## Project structure

```
ai-sales-assistant-crm/
├── apps/
│   └── web/                    # React 19 + Vite SPA (see apps/web/README.md)
│       └── src/features/       # auth, team, pipeline, leads, settings, …
├── packages/
│   ├── api/                    # Express 5 API + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma           # SQLite (dev)
│   │   │   ├── schema.postgresql.prisma
│   │   │   └── migrations/             # incl. auth_invites_sessions
│   │   └── src/
│   │       ├── routes/                 # auth, team, leads, deals, …
│   │       ├── lib/                    # authSession, inviteToken, emailChange
│   │       └── __tests__/              # Vitest unit tests
│   └── shared/                 # @crm/shared pipeline constants
├── e2e/                        # Playwright smoke tests
│   ├── playwright.config.ts    # API :3011, web :5174 (isolated from dev)
│   ├── global-setup.ts         # Fresh e2e.db per run
│   ├── fixtures/               # users, auth helpers
│   └── tests/smoke/            # login, session, RBAC, layout
├── scripts/
│   ├── live-test.ps1           # Quick API smoke (port 3001)
│   └── live-test-extended.ps1  # Full API regression incl. invites + refresh
├── .github/workflows/ci.yml    # unit → e2e on Node 22
├── railway.toml / render.yaml  # API deploy configs
├── README.md
└── DEPLOY.md
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `packages/api/.env.example` to `packages/api/.env` and set at minimum:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
REFRESH_TOKEN_TTL_DAYS=30
INVITE_EXPIRY_HOURS=168
FRONTEND_URL="http://localhost:5173"
```

Access tokens expire in **15 minutes**. Refresh tokens live in an **httpOnly cookie** with a **30-day sliding** window (`REFRESH_TOKEN_TTL_DAYS`) capped at **90 days** absolute (`REFRESH_TOKEN_ABSOLUTE_TTL_DAYS`). Team invite links default to **7 days** (`INVITE_EXPIRY_HOURS=168`).

### 3. Initialize database

```bash
npm run db:push
```

### 4. Run the app

**Both services:**

```bash
npm run dev:all
```

**Or separately:**

```bash
npm run dev:api    # API on http://localhost:3001
npm run dev        # Frontend on http://localhost:5173
```

### 5. Open the app

Visit [http://localhost:5173](http://localhost:5173), create a workspace, and explore.

## Environment variables

See `packages/api/.env.example` for the full list. Key groups:

| Group | Variables |
|-------|-----------|
| **Core** | `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_TTL_DAYS`, `REFRESH_TOKEN_ABSOLUTE_TTL_DAYS`, `INVITE_EXPIRY_HOURS`, `PORT`, `FRONTEND_URL`, `CORS_ORIGINS`, `TRUST_PROXY`, `REFRESH_COOKIE_SAME_SITE` |
| **AI & email** | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **BCC logging** | `EMAIL_LOG_DOMAIN`, `INBOUND_EMAIL_WEBHOOK_SECRET` |
| **Google** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Gmail** | `GMAIL_REDIRECT_URI`, `GMAIL_SYNC_ENABLED`, `GMAIL_SYNC_INTERVAL_MS` |
| **HubSpot** | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI` |
| **Webhooks** | `API_PUBLIC_URL` (required for HubSpot signature verification in prod) |
| **Calendar sync** | `CALENDAR_SYNC_ENABLED`, `CALENDAR_SYNC_INTERVAL_MS`, `CRON_SECRET` |

Without OpenRouter, AI endpoints use mock mode. Without Resend, use **Copy** on email drafts.

## API routes

### Auth & profile

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create user + organization (returns access + refresh tokens) |
| POST | `/api/auth/login` | Sign in (multi-org selection supported) |
| POST | `/api/auth/refresh` | Rotate refresh token for new access token |
| POST | `/api/auth/logout` | Revoke current session (`{ refreshToken }`) |
| POST | `/api/auth/logout-all` | Revoke all sessions except current |
| GET | `/api/auth/sessions` | List active sessions (device, IP, last active) |
| DELETE | `/api/auth/sessions/:id` | Revoke a single session |
| GET | `/api/auth/me` | Current user + organizations |
| PATCH | `/api/auth/me` | Update profile name |
| PATCH | `/api/auth/me/email` | Request verified email change |
| DELETE | `/api/auth/me/email` | Cancel pending email change |
| POST | `/api/auth/verify-email-change` | Confirm new email via magic link |
| POST | `/api/auth/change-password` | Change password (revokes other sessions) |
| POST | `/api/auth/switch-org` | Switch workspace |
| GET | `/api/auth/invite/:token` | Preview team invite (public) |
| POST | `/api/auth/accept-invite` | Accept team invite (public) |

### CRM records

List endpoints accept `?page=1&pageSize=25` (max 100). Responses: `{ data, pagination }`.

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/accounts` | List / create accounts |
| GET/PATCH/DELETE | `/api/accounts/:id` | Account detail |
| GET/POST | `/api/contacts` | List / create contacts |
| GET/PATCH/DELETE | `/api/contacts/:id` | Contact detail |
| GET/POST | `/api/leads` | List / create leads |
| GET/PATCH/DELETE | `/api/leads/:id` | Lead detail |
| POST | `/api/leads/import` | Bulk import (manager) |
| POST | `/api/leads/recalculate-scores` | Recalculate all lead scores (manager) |
| GET/POST/PATCH/DELETE | `/api/deals` | List / create / update / delete deals |
| GET | `/api/deals/kanban` | Per-stage Kanban columns (`?perStage=15&page_DISCOVERY=2`) |
| GET/POST/PATCH/DELETE | `/api/activities` | Timeline (`?leadId=` / `contactId` / `dealId`) |

### AI, meetings & communications

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ai/context` | Preview CRM context for lead/deal |
| POST | `/api/ai/generate-email` | AI follow-up draft |
| POST | `/api/ai/summarize-meeting` | AI meeting summary + optional tasks |
| GET | `/api/meetings` | Recent saved meeting summaries |
| POST | `/api/communications/send` | Send email via Resend (auto-BCC log address) |
| POST | `/api/communications/inbound` | Inbound email webhook (BCC logging) |

### Dashboard & team

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/stats` | Dashboard metrics |
| GET | `/api/dashboard/forecast` | Pipeline forecast + health |
| GET | `/api/dashboard/manager` | Manager pipeline + rep leaderboard |
| GET | `/api/dashboard/onboarding` | Onboarding step status |
| GET | `/api/team` | Team members (manager) |
| GET | `/api/team/invites` | Pending magic-link invites (manager) |
| POST | `/api/team/invite` | Send magic-link invite (admin/manager) |
| POST | `/api/team/invites/:id/resend` | Resend invite email |
| DELETE | `/api/team/invites/:id` | Revoke pending invite (admin) |
| DELETE | `/api/team/:membershipId` | Remove teammate (admin) |
| GET/PATCH | `/api/organization` | Workspace settings |
| GET | `/api/organization/email-log` | BCC email logging address |

### Integrations

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/integrations/status` | Connection status for all integrations |
| GET | `/api/integrations/google/auth-url` | Google Calendar OAuth URL |
| GET | `/api/integrations/google/callback` | Google Calendar OAuth callback |
| POST | `/api/integrations/google/sync` | Manual calendar sync |
| DELETE | `/api/integrations/google` | Disconnect calendar |
| GET | `/api/integrations/gmail/auth-url` | Gmail OAuth URL |
| GET | `/api/integrations/gmail/callback` | Gmail OAuth callback |
| POST | `/api/integrations/gmail/sync` | Sync inbox emails to timeline |
| DELETE | `/api/integrations/gmail` | Disconnect Gmail |
| GET | `/api/integrations/hubspot/auth-url` | HubSpot OAuth URL |
| GET | `/api/integrations/hubspot/callback` | HubSpot OAuth callback |
| POST | `/api/integrations/hubspot/connect` | Connect HubSpot private app token |
| POST | `/api/integrations/hubspot/sync` | Sync contacts/deals from HubSpot |
| DELETE | `/api/integrations/hubspot` | Disconnect HubSpot |
| POST | `/api/integrations/hubspot/import-csv` | HubSpot CSV import |
| POST | `/api/integrations/hubspot/webhook` | HubSpot inbound webhook (v3 signature) |
| POST | `/api/integrations/salesforce/connect` | Connect Salesforce (token + instance URL) |
| POST | `/api/integrations/salesforce/sync` | Sync from Salesforce |
| DELETE | `/api/integrations/salesforce` | Disconnect Salesforce |
| POST | `/api/integrations/salesforce/import-csv` | Salesforce CSV import |
| POST | `/api/integrations/salesforce/webhook` | Salesforce inbound webhook |
| POST | `/api/integrations/cron/calendar-sync` | Cron-triggered calendar sync (`x-cron-secret`) |

## CSV import format (leads)

```csv
title,source,status,notes
Acme Corp — VP Eng,Inbound,NEW,Met at SaaStr
Beta Inc — CTO,Referral,CONTACTED,Intro from investor
```

HubSpot and Salesforce CSV column requirements are shown on the **Integrations** page in the app.

## Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access, invite team, change roles, workspace settings |
| **MANAGER** | Team dashboard, analytics, integrations, view all team records |
| **REP** | Assigned leads/deals, pipeline, AI tools, own integrations |

## Production

Deploy without Docker — see **[DEPLOY.md](./DEPLOY.md)** for the full guide.

| Layer | Platform |
|-------|----------|
| Frontend | Vercel (`apps/web`) |
| API + DB | Railway (`railway.toml`) or Render (`render.yaml`) |

```bash
npm run build:api
npm run start:api   # prisma migrate deploy + node (requires DATABASE_URL=postgresql://...)
```

Production uses `packages/api/prisma/schema.postgresql.prisma` and migrations in `packages/api/prisma/migrations/`.

Set `VITE_API_URL` on Vercel to your production API URL (no trailing slash).

## Background jobs

**Calendar auto-sync** (`packages/api/.env`):

```env
CALENDAR_SYNC_ENABLED=true
CALENDAR_SYNC_INTERVAL_MS=3600000
```

**Gmail auto-sync:**

```env
GMAIL_SYNC_ENABLED=true
GMAIL_SYNC_INTERVAL_MS=1800000
```

Or use external cron:

```http
POST https://YOUR_API_URL/api/integrations/cron/calendar-sync
x-cron-secret: YOUR_CRON_SECRET
```

## Webhook setup (production)

**HubSpot** — In your HubSpot app settings, set the target URL to `https://YOUR_API_URL/api/integrations/hubspot/webhook`. Subscribe to `contact.creation`, `contact.propertyChange`, `deal.creation`, `deal.propertyChange`. Set `API_PUBLIC_URL` and `HUBSPOT_CLIENT_SECRET` on the API.

**Salesforce** — Use a Flow or Apex HTTP callout to `POST https://YOUR_API_URL/api/integrations/salesforce/webhook` with header `x-salesforce-webhook-secret` (shown after connecting in Integrations).

**BCC email** — Forward your email provider's inbound webhook to `POST /api/communications/inbound` with header `x-webhook-secret`.

## Data deletion

Managers can delete accounts and contacts. Managers and assigned reps can delete leads and deals. Activity authors (or managers) can delete timeline entries. See Prisma `onDelete` rules in `packages/api/prisma/schema.prisma`.

## Tests

```bash
npm run test:api    # API unit tests (Vitest, 37+ tests)
npm run test:web    # Frontend unit tests (Vitest)
npm run test:e2e    # Playwright smoke tests — self-starts API + web
```

**E2E** uses isolated ports **3011** (API) and **5174** (web) so it does not conflict with `dev:all` on 3001/5173. First run:

```bash
npx playwright install chromium
npm run test:e2e
```

**Live API regression** (API must be running on `:3001`):

```powershell
.\scripts\live-test-extended.ps1
```

### CI (GitHub Actions)

`.github/workflows/ci.yml` runs on push/PR:

1. **unit** — `npm run test:api` + `npm run test:web` (Node 22)
2. **e2e** — `npm run test:e2e` with Playwright Chromium

## NPM scripts

| Script | Description |
|--------|-------------|
| `npm run dev:all` | API + frontend concurrently |
| `npm run dev:api` | API only (watch mode, port 3001) |
| `npm run dev` | Frontend only (port 5173) |
| `npm run build` | Build web app |
| `npm run build:shared` | Build `@crm/shared` |
| `npm run build:api` | Build API for production |
| `npm run start:api` | Migrate DB + start API |
| `npm run db:push` | Push SQLite schema (dev) |
| `npm run db:push:pg` | Push PostgreSQL schema (local PG test) |
| `npm run db:studio` | Prisma Studio |
| `npm run test:api` | API unit tests |
| `npm run test:web` | Web unit tests |
| `npm run test:e2e` | Playwright E2E smoke suite |

## Security hardening

Post-MVP auth, session, and test infrastructure improvements.

### High priority — Auth security

| Item | Implementation |
|------|----------------|
| **httpOnly refresh cookies** | `crm_refresh` cookie via `packages/api/src/lib/refreshCookie.ts`; frontend uses `credentials: 'include'`; refresh token removed from `localStorage`; silent restore via `tryRestoreSession()` on protected routes |
| **Refresh reuse detection** | Insert-per-rotate in `authSession.ts`: spent token replay revokes the whole `familyId` and returns `REFRESH_REUSE` |
| **Rate limiting** | `express-rate-limit` in `packages/api/src/middleware/rateLimit.ts` on login, register, refresh, logout, invites, email change, password change, team invite/resend |

### Medium priority — E2E

| Item | Implementation |
|------|----------------|
| **Playwright `storageState`** | `e2e/.auth/{admin,manager,rep}.json` saved in `auth.setup.ts`; `layout` + `team-permissions` use pre-authenticated projects |
| **Page Object Model** | `e2e/pages/LoginPage.ts`, `AppLayoutPage.ts`, `TeamPage.ts` |

### Low priority — Sessions & TTL

| Item | Implementation |
|------|----------------|
| **Per-session UI in Settings** | `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`; device list with revoke + sign out everywhere |
| **Absolute + sliding TTL** | `REFRESH_TOKEN_TTL_DAYS` (30d sliding) capped by `REFRESH_TOKEN_ABSOLUTE_TTL_DAYS` (90d max) |

### CI & testing

| Item | Implementation |
|------|----------------|
| **Vitest on Linux** | `apps/web/vitest.config.ts` (`environment: 'node'`); optional `@rolldown/binding-linux-x64-gnu`; CI installs Linux binding after `npm ci` |
| **Regression scripts** | `scripts/live-test-extended.ps1` uses cookie jar (`WebSession`) for refresh rotation |

Run the full suite:

```bash
npm run test:api    # API unit tests
npm run test:web    # Frontend unit tests
npm run test:e2e    # Playwright smoke (14 specs)
```

### Auth environment variables

```env
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_TOKEN_ABSOLUTE_TTL_DAYS=90
TRUST_PROXY=0                    # set to 1 behind Railway/Render
REFRESH_COOKIE_SAME_SITE=lax     # use "none" for cross-origin API in production (requires HTTPS)
COOKIE_DOMAIN=                   # optional; e.g. .yourdomain.com
RATE_LIMIT_DISABLED=0            # set to 1 only for local E2E (Playwright sets this automatically)
```
