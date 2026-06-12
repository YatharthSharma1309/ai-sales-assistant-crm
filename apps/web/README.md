# AI Sales Assistant CRM — Frontend

React 19 + TypeScript + Vite SPA for the AI Sales Assistant CRM monorepo.

See the [root README](../../README.md) for full setup, features, API docs, and deployment.

## Quick start

From the repository root:

```bash
npm install
npm run dev        # frontend only (port 5173)
npm run dev:all    # API + frontend
```

The Vite dev server proxies `/api` to `http://localhost:3001` when `VITE_API_URL` is unset.

## Structure

```
src/
  features/
    auth/           → Login, register, accept invite, verify email change
    layout/         → App shell, header/footer, protected/manager routes
    dashboard/      → Metrics, onboarding, role-gated banners
    team/           → Magic-link invites, pending invites, RBAC UI
    settings/       → Profile, password, email change, logout-all
    accounts/       → Accounts list + detail
    contacts/       → Contacts list + detail
    leads/          → Leads list + detail + scoring
    pipeline/       → Kanban + deal detail
    meetings/       → AI meeting summaries
    communications/ → Email send + timeline
    analytics/      → Pipeline forecast
    integrations/   → HubSpot, Salesforce, Google, Gmail
  store/            → Redux Toolkit slices (auth, team, leads, …)
  shared/
    api/client.ts   → Fetch wrapper, 401 refresh, dual-token storage
    components/     → Reusable UI
    hooks/          → useRole, useSyncRole
    types/          → Shared TS types
```

## Auth & tokens (frontend)

| Storage | Purpose |
|---------|---------|
| `crm_access_token` (localStorage) | 15-minute JWT sent as `Authorization: Bearer` |
| `crm_refresh` (httpOnly cookie) | Opaque refresh token for `POST /api/auth/refresh` |
| `crm_token` (localStorage) | Legacy key — migrated once on read |

All API calls use `credentials: 'include'` so the refresh cookie is sent. Sign out calls `POST /api/auth/logout` (clears cookie) then clears local access token.

Public routes (no login required):

- `/login`, `/register`
- `/invite/accept?token=…` — accept team invite
- `/verify-email-change?token=…` — confirm new email

## Production build

```bash
# From repo root
npm run build --workspace=apps/web
```

On Vercel, set **`VITE_API_URL`** to your production API URL (no trailing slash). Optional: `VITE_APP_VERSION` for the footer version label. See [DEPLOY.md](../../DEPLOY.md).

## Tests

```bash
npm run test:web     # Vitest unit tests (authSlice, route labels, …)
npm run test:e2e     # Playwright smoke tests (repo root; uses ports 3011/5174)
```
