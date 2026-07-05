# AI Sales Assistant CRM — Frontend

React 19 + TypeScript + Vite SPA. See the [root README](../../README.md) and **[Beginner simulation](../../docs/BEGINNER_SIMULATION.md)** for full setup.

## Quick start

```bash
# From repo root
npm install
npm run db:push
npm run seed:demo          # demo@example.com / DemoPass123!
npm run dev:all            # API :3001 + web :5173
```

Open [http://localhost:5173/login](http://localhost:5173/login). In-app guide: **Help** (`/help`).

## Dev proxy

Vite proxies `/api` → `http://localhost:3001` when `VITE_API_URL` is unset.

Set `FRONTEND_URL` in `packages/api/.env` to match your Vite origin (default `http://localhost:5173`).

## Structure

```
src/
  features/
    auth/           Login, register, forgot/reset password, invites
    layout/         App shell, sidebar, mobile bottom nav, header search
    dashboard/      Metrics, onboarding checklist
    accounts/       B2B companies
    contacts/       People at accounts
    leads/          Prospects, scoring, CSV import
    pipeline/       Kanban board + deal detail
    meetings/       AI meeting summaries
    communications/ AI follow-up emails
    analytics/      Funnel, trends, team stats
    integrations/   Google, HubSpot, Salesforce, lead capture
    marketing/      Public lead capture page (/capture/:slug)
    help/           In-app walkthrough
    settings/       Profile, sessions, automation
    team/           Invites and roles
  shared/
    components/     AppLogo, GlobalSearch, Charts, Toast, Modal, …
    api/client.ts   Fetch + refresh cookie auth
  store/            Redux Toolkit slices
```

## Auth (frontend)

| Storage | Purpose |
|---------|---------|
| In-memory access JWT | `Authorization: Bearer` (15 min, not in localStorage) |
| `crm_refresh` cookie | httpOnly refresh for silent session restore |

Public routes: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/invite/accept`, `/verify-email-change`, `/capture/:slug`.

## Production

```bash
npm run build --workspace=apps/web
```

On Vercel: set **`VITE_API_URL`** to your API URL (no trailing slash). See [DEPLOY.md](../../DEPLOY.md).

## Tests

```bash
npm run test:web     # Vitest
npm run test:e2e     # Playwright (from repo root; ports 3011/5174)
```
