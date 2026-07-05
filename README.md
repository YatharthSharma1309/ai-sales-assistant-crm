# AI Sales Assistant CRM

A full-stack **B2B sales CRM** for SaaS teams: leads, pipeline Kanban, AI follow-up emails, meeting summaries, team roles, integrations (Google, HubSpot, Salesforce), and analytics.

> **New here?** Start with the **[Beginner simulation](docs/BEGINNER_SIMULATION.md)** — load demo data in one command and follow a guided 30-minute walkthrough.

## Quick start (5 minutes)

```bash
git clone https://github.com/YatharthSharma1309/ai-sales-assistant-crm.git
cd ai-sales-assistant-crm
npm install
cp packages/api/.env.example packages/api/.env   # edit JWT_SECRET if you like
npm run db:push
npm run seed:demo      # optional: sample accounts, leads, deals
npm run dev:all
```

| | |
|---|---|
| **App** | [http://localhost:5173](http://localhost:5173) |
| **API** | [http://localhost:3001](http://localhost:3001) |
| **Demo login** | `demo@example.com` / `DemoPass123!` (after `seed:demo`) |

See **[docs/BEGINNER_SIMULATION.md](docs/BEGINNER_SIMULATION.md)** for what to click on each page.

---

## Features

### Auth & security
- Dual-token sessions (15m JWT + httpOnly refresh cookie, rotation + reuse detection)
- Magic-link team invites, verified email change, **forgot / reset password**
- Per-device sessions, sign out everywhere, rate limiting

### Core CRM
- Multi-tenant workspaces, accounts, contacts, leads (scoring, CSV import)
- Drag-and-drop **pipeline Kanban**, deal detail pages, weighted forecast
- Activity timeline on leads, contacts, deals
- **Global search**, mobile bottom nav, in-app **Help** page
- Team RBAC: ADMIN / MANAGER / REP; rep-scoped records

### AI & communications
- AI email drafts and meeting summaries (OpenRouter or **mock mode**)
- Resend outbound email (optional); BCC email logging to timeline

### Automation & marketing
- **Stale-deal alerts** — email managers when deals stall (Settings → Automation)
- **Public lead capture form** — embed on your site (Integrations)
- Lead score recalculation (managers)

### Integrations
- Google Calendar & Gmail, HubSpot, Salesforce (OAuth, sync, webhooks, CSV import)

### Analytics
- Dashboard metrics, lead funnel, deal outcomes, trends, manager team view

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Redux Toolkit, Tailwind, Vite |
| Backend | Node.js, Express 5, Prisma 6 |
| Shared | `@crm/shared` — pipeline stages |
| Database | SQLite (local), PostgreSQL (production) |
| Tests | Vitest (67 unit), Playwright (17 E2E) |

---

## Project structure

```
ai-sales-assistant-crm/
├── apps/web/                 # React SPA → apps/web/README.md
├── packages/api/             # Express API → packages/api/README.md
├── packages/shared/          # Shared constants
├── docs/
│   ├── BEGINNER_SIMULATION.md  # Guided walkthrough for new users
│   └── PROJECT_STATUS.md       # Completed vs remaining checklist
├── e2e/                      # Playwright smoke tests
├── scripts/                  # live-test.ps1, deploy helpers
├── README.md                 # This file
└── DEPLOY.md                 # Production deployment
```

---

## Setup (detailed)

### 1. Environment

Copy `packages/api/.env.example` → `packages/api/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
FRONTEND_URL="http://localhost:5173"
RATE_LIMIT_DISABLED=1          # recommended for local dev
```

Access tokens expire in **15 minutes**. Refresh cookies use sliding TTL (`REFRESH_TOKEN_TTL_DAYS`, default 30).

### 2. Database

```bash
npm run db:push
npm run seed:demo    # creates demo@example.com workspace with sample CRM data
```

### 3. Run

```bash
npm run dev:all      # API :3001 + web :5173
```

### 4. Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | API + frontend |
| `npm run dev:api` | API only |
| `npm run dev` | Frontend only |
| `npm run seed:demo` | Reset demo workspace + sample data |
| `npm run test:api` | API unit tests (57) |
| `npm run test:web` | Web unit tests (10) |
| `npm run test:e2e` | Playwright E2E (17) |
| `npm run build` | Production web build |
| `npm run build:api` | Production API build |
| `npm run check:prisma-schemas` | Verify SQLite/PG schema parity |

---

## Environment variables

Full list in `packages/api/.env.example`. Summary:

| Group | Variables |
|-------|-----------|
| **Core** | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, `RATE_LIMIT_DISABLED` |
| **AI & email** | `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Automation** | `STALE_DEAL_ALERTS_ENABLED`, `CRON_SECRET` |
| **Google** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **HubSpot / Salesforce** | OAuth client IDs, `API_PUBLIC_URL` for webhooks |

**Dev email behavior:** Without `RESEND_API_KEY`, emails are mocked. With Resend in test mode, API errors return `sent: false` in development instead of crashing routes — invite/reset links still appear in the UI.

Without `OPENROUTER_API_KEY`, AI endpoints return realistic mock drafts.

---

## API overview

### Auth
`POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/me`, `/me/email`, team invites, sessions

### CRM
`/api/accounts`, `/contacts`, `/leads`, `/deals`, `/deals/kanban`, `/activities` — paginated `{ data, pagination }`

### Newer endpoints
| Route | Description |
|-------|-------------|
| `GET /api/search?q=` | Global search (leads, contacts, accounts, deals) |
| `POST /api/public/leads` | Public lead capture form submit |
| `GET /api/organization/lead-capture` | Form URL for workspace |
| `GET/PATCH /api/organization/automation` | Stale-deal alert settings |
| `POST /api/automation/stale-deal-alerts/run` | Manual alert run (manager) |

See inline route tables in older commits or explore `packages/api/src/routes/`.

---

## Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access, workspace settings, team invites |
| **MANAGER** | All team records, analytics, integrations, automation |
| **REP** | Assigned leads/deals only |

---

## Tests

```bash
npm run test:api
npm run test:web
npx playwright install chromium   # first time only
npm run test:e2e
```

E2E uses isolated ports **3011** (API) and **5174** (web). Local dev uses **3001** / **5173**.

PowerShell API smoke (API must be running):

```powershell
.\scripts\live-test.ps1
node packages/api/scripts/smoke-features.mjs
```

---

## Production

Deployed on **Vercel + Neon** — see **[DEPLOY.md](./DEPLOY.md)** and **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**.

| Layer | Platform | Live |
|-------|----------|------|
| Frontend | Vercel | https://ai-sales-assistant-crm.vercel.app |
| API | Vercel | https://ai-sales-assistant-crm-api.vercel.app |
| Database | Neon PostgreSQL | — |

Alternative: Railway or Render for long-running API (see `DEPLOY.md`).

---

## What's included vs not

| Included | Not built (by design) |
|----------|------------------------|
| Full B2B CRM core | Native mobile app |
| AI assist (mock or OpenRouter) | SSO / SAML |
| Integrations + CSV import | Billing / subscriptions |
| Password reset, team invites | Heavy marketing automation |
| Lead capture form, stale-deal alerts | |

---

## License

Private project — see repository owner for usage terms.
