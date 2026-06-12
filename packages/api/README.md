# @crm/api

Express 5 API for AI Sales Assistant CRM.

## Dev

```bash
# From repo root
npm run dev:api
```

Runs on `http://localhost:3001` with SQLite (`packages/api/prisma/dev.db`).

## Auth libs

| Module | Purpose |
|--------|---------|
| `src/lib/auth.ts` | JWT sign/verify (15m access tokens, `sid` claim) |
| `src/lib/authSession.ts` | Refresh token rotation, session CRUD |
| `src/lib/inviteToken.ts` | Team invite token hash + URL builder |
| `src/lib/emailChange.ts` | Verified email change tokens + emails |
| `src/lib/sendTeamInviteEmail.ts` | Resend invite emails |

## Database

- **Dev:** `prisma/schema.prisma` (SQLite) — `npm run db:push`
- **Prod:** `prisma/schema.postgresql.prisma` — migrations in `prisma/migrations/`

## Tests

```bash
npm run test
```
