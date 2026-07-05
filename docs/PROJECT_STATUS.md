# Project status — AI Sales Assistant CRM

Last updated: **July 2026**

Live app: **https://ai-sales-assistant-crm.vercel.app**  
API: **https://ai-sales-assistant-crm-api.vercel.app**  
Database: **Neon PostgreSQL** ([console](https://console.neon.tech/app/projects/delicate-truth-29425014))

---

## Completed

### Product (MVP scope)

| Area | Status | Notes |
|------|--------|-------|
| Multi-tenant workspaces | Done | Register, org slug, RBAC |
| Accounts, contacts, leads | Done | CRUD, pagination, CSV import |
| Pipeline Kanban | Done | Drag-and-drop, per-stage load more |
| Deals & activities | Done | Timeline on lead/contact/deal |
| Lead scoring | Done | Auto + manual recalc (managers) |
| Global search | Done | Leads, contacts, accounts, deals |
| Dashboard & analytics | Done | Forecast, funnel, trends |
| Auth & sessions | Done | JWT + refresh cookies, rotation |
| Password reset | Done | Forgot / reset flow |
| Team invites | Done | Magic-link invites, roles |
| AI email drafts | Done | OpenRouter or mock mode |
| Meeting summaries | Done | OpenRouter or mock mode |
| Lead capture form | Done | Public embed + token |
| Stale-deal alerts | Done | Settings + manual run + daily cron |
| Integrations UI | Done | Google, HubSpot, Salesforce cards |
| OAuth + sync + webhooks | Done | Code complete; needs your OAuth apps |
| Help & legal pages | Done | Help, Terms, Privacy |
| Mobile-friendly UI | Done | Bottom nav, responsive layout |
| Demo workspace script | Done | `npm run seed:demo` (local + prod) |

### Engineering

| Area | Status | Notes |
|------|--------|-------|
| Unit tests (API) | Done | Vitest |
| Unit tests (web) | Done | Vitest |
| E2E smoke tests | Done | Playwright (17 specs) |
| CI on GitHub | Done | `master` branch |
| SQLite dev / PostgreSQL prod | Done | Dual Prisma schemas |
| Production security checks | Done | Startup validation in prod |
| Encrypted workspace secrets | Done | Google OAuth secrets at rest |
| Deploy docs | Done | `DEPLOY.md` (Vercel + Neon) |

### Production (configured)

| Item | Status |
|------|--------|
| Frontend on Vercel | Live |
| API on Vercel (serverless) | Live |
| Neon PostgreSQL | Live, migrations applied |
| OpenRouter (AI) | Configured |
| Resend (email) | Configured |
| Vercel Cron (background jobs) | Configured |
| Owner admin account | `yatharthsharma1309@gmail.com` |
| Demo workspace (visitors) | `demo@example.com` / `DemoPass123!` |
| Portfolio link | On [yatharthsharma.vercel.app](https://yatharthsharma.vercel.app) |

---

## Not completed (by design)

These were never in scope for this portfolio MVP:

| Item | Reason |
|------|--------|
| Native mobile app | Web-only SPA |
| SSO / SAML | Enterprise auth not built |
| Billing / subscriptions | No Stripe or plans |
| Heavy marketing automation | Only stale-deal alerts + lead capture |
| Multi-region / self-host docs | Managed platforms only |

---

## Requires your external setup (optional)

The app ships integration **UI and backend**; you connect real providers when needed:

| Integration | What you do | Where in app |
|-------------|-------------|--------------|
| **Google Calendar / Gmail** | Create OAuth client in Google Cloud; add redirect URIs for production API | Integrations → Google |
| **HubSpot** | Create public app; set redirect + webhook URL | Integrations → HubSpot |
| **Salesforce** | Connected app + webhook secret | Integrations → Salesforce |
| **Resend (custom domain)** | Verify domain for branded `FROM` address | Vercel env `RESEND_FROM_EMAIL` |
| **Inbound email logging** | Configure BCC domain + webhook | `EMAIL_LOG_DOMAIN`, Resend inbound |

Production OAuth redirect URIs (replace if API URL changes):

```
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/google/callback
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/gmail/callback
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/hubspot/callback
https://ai-sales-assistant-crm-api.vercel.app/api/integrations/salesforce/callback
```

HubSpot webhook target: `https://ai-sales-assistant-crm-api.vercel.app/api/integrations/hubspot/webhook`

---

## Production vs local differences

| Feature | Local (`npm run dev:all`) | Production (Vercel) |
|---------|---------------------------|---------------------|
| Database | SQLite `dev.db` | Neon PostgreSQL |
| Background interval jobs | Optional via env | **Disabled** (serverless) |
| Calendar / Gmail / stale-deal cron | Manual or `CRON_SECRET` curl | **Vercel Cron** (daily / every 3–6h) |
| Email | Mock without Resend | Resend when keys set |
| Rate limiting | Off with `RATE_LIMIT_DISABLED=1` | On |

---

## Login accounts (production)

| Account | Email | Password | Use |
|---------|-------|----------|-----|
| **Owner (you)** | `yatharthsharma1309@gmail.com` | Change in **Settings → Profile** after login | Your real workspace |
| **Demo (visitors)** | `demo@example.com` | `DemoPass123!` | Portfolio visitors — sample data only |

---

## Remaining nice-to-haves (optional polish)

- [ ] Custom domain (e.g. `crm.yourdomain.com`) on Vercel
- [ ] Promote CRM to **featured** card on portfolio (currently under “Additional projects”)
- [ ] Verified Resend sender domain (instead of `onboarding@resend.dev`)
- [ ] HubSpot / Google OAuth apps wired for live integration demos
- [ ] GitHub deploy hook so Vercel auto-deploys on every `master` push (if not already linked)

---

## Quick health check

```bash
curl https://ai-sales-assistant-crm-api.vercel.app/api/health
# → {"status":"ok","database":"connected",...}
```
