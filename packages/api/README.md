# @crm/api

Express 5 API for AI Sales Assistant CRM. See [root README](../../README.md) and [Beginner simulation](../../docs/BEGINNER_SIMULATION.md).

## Dev

```bash
# From repo root
cp packages/api/.env.example packages/api/.env
npm run db:push
npm run seed:demo
npm run dev:api
```

Runs on **http://localhost:3001** with SQLite (`prisma/dev.db`).

## Demo seed

```bash
npm run seed:demo
```

Creates workspace **Acme SaaS Demo** with sample accounts, contacts, leads, deals, and activities.

| Email | Password |
|-------|----------|
| `demo@example.com` | `DemoPass123!` |

Re-running resets CRM data in that workspace (idempotent).

## Helper scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-demo.mjs` | Beginner demo workspace |
| `scripts/create-owner.mjs` | Create admin user + org |
| `scripts/smoke-features.mjs` | API smoke (password reset, search, capture, automation) |
| `scripts/db-status.mjs` | DB connection check |
| `scripts/check-prisma-schema-sync.mjs` | SQLite ↔ PostgreSQL schema parity |

## Key modules

| Path | Purpose |
|------|---------|
| `src/lib/authSession.ts` | Refresh token rotation |
| `src/lib/emailSend.ts` | Resend (dev soft-fail on errors) |
| `src/lib/passwordReset.ts` | Forgot / reset password |
| `src/lib/staleDealAlerts.ts` | Workflow automation emails |
| `src/lib/globalSearch.ts` | Cross-entity search |
| `src/lib/leadCaptureToken.ts` | Public lead form URLs |
| `src/routes/public.ts` | Unauthenticated lead capture |
| `src/routes/search.ts` | Authenticated global search |
| `src/routes/automation.ts` | Stale-deal cron + manual run |

## Database

- **Dev:** `prisma/schema.prisma` (SQLite) — `npm run db:push`
- **Prod:** `prisma/schema.postgresql.prisma` — `npm run db:migrate:deploy`

## Tests

```bash
npm run test              # Vitest (57 tests)
npm run check:prisma-schemas
```

## Environment highlights

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="..."
FRONTEND_URL="http://localhost:5173"
RATE_LIMIT_DISABLED=1              # local dev
OPENROUTER_API_KEY=""              # empty = AI mock mode
RESEND_API_KEY=""                  # empty = email mock mode
STALE_DEAL_ALERTS_ENABLED=false    # optional daily job
```

When `RESEND_API_KEY` is set but Resend rejects (e.g. test mode), **development** returns `{ sent: false }` instead of throwing — production still surfaces errors.
