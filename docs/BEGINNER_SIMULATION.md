# Beginner simulation — how this CRM works

This guide walks you through a **realistic B2B sales day** using pre-loaded demo data. No integrations or API keys required.

## 1. Load the demo workspace

From the project root:

```bash
npm install
npm run db:push
npm run seed:demo
npm run dev:all
```

Open [http://localhost:5173/login](http://localhost:5173/login) (or port **5174** if 5173 is busy).

| Field | Value |
|-------|--------|
| Email | `demo@example.com` |
| Password | `DemoPass123!` |
| Workspace | **Acme SaaS Demo** |

Re-run `npm run seed:demo` anytime to reset sample data.

---

## 2. Mental model (read this first)

| Term | Meaning | Demo example |
|------|---------|----------------|
| **Account** | A company you sell to | Acme Analytics |
| **Contact** | A person at that company | Jane Rivera, VP Engineering |
| **Lead** | Early interest, not yet a deal | "Beta Logistics — Head of Procurement" |
| **Deal** | A specific opportunity with $ value | "Acme Analytics — Annual Platform" ($48k ARR) |
| **Pipeline** | Board of open deals by stage | Discovery → Trial → Proposal → Won/Lost |
| **Activity** | Anything you did (call, email, note) | "Intro call with Jane" |

Typical flow: **Lead → qualify → Contact + Account → Deal on Pipeline → log activities → close won**.

---

## 3. Simulation: your first 30 minutes

Follow these steps in order. Each section tells you **where to click** and **what you should see**.

### Step A — Dashboard (home)

1. After login you land on **Dashboard**.
2. Notice: lead count, open deals, pipeline ARR, weighted forecast.
3. Complete the **onboarding checklist** if shown (most steps are already done in demo data).
4. Check **pipeline health** — stale deals affect the score.

**You learned:** Dashboard = pulse of your pipeline, not where you edit records.

---

### Step B — Accounts & contacts

1. Sidebar → **Accounts**.
2. Open **Acme Analytics** — see industry, website, linked contacts and deals.
3. Sidebar → **Contacts**.
4. Open **Jane Rivera** — job title, email, linked account.

**You learned:** Accounts are companies; contacts are people. Deals and leads can link to both.

---

### Step C — Leads (top of funnel)

1. Sidebar → **Leads**.
2. You should see three leads with different statuses:
   - **NEW** — Beta Logistics (web form)
   - **CONTACTED** — Acme VP Engineering (referral)
   - **QUALIFIED** — Acme IT Director
3. Click a lead title → **detail page** with score breakdown and **activity timeline**.
4. Try **Add lead** or **Import CSV** (optional).

**You learned:** Leads are pre-deal prospects. Scores help prioritize who to call first.

---

### Step D — Pipeline (where money lives)

1. Sidebar → **Pipeline**.
2. If deals exist, you see **Kanban columns**: Discovery, Demo Scheduled, Trial, Proposal, etc.
3. **Drag a deal** between columns — stage updates in the database.
4. Open **Acme Analytics — Annual Platform** — ARR, probability, contact, timeline.
5. Find **Beta Logistics — Expansion (stale)** — old `updatedAt` (for automation testing).

**You learned:** Pipeline = active opportunities. Stage + probability drive forecast on Dashboard/Analytics.

---

### Step E — Log work (activities)

1. From any lead or deal detail page, add a **Note**, **Call**, or **Email** on the timeline.
2. Dashboard and lead scores update based on recent engagement.

**You learned:** Everything customer-facing should be logged — it feeds AI context and lead scoring.

---

### Step F — AI emails (mock mode works without keys)

1. Sidebar → **AI Emails** (Communications).
2. **Source** → Lead → pick **Acme Analytics — VP Engineering**.
3. Click **Generate email** — draft uses CRM context (works in mock mode without OpenRouter).
4. Without Resend, use **Copy** instead of Send.

**Optional:** Set `OPENROUTER_API_KEY` in `packages/api/.env` for real AI drafts.

---

### Step G — Meetings

1. Sidebar → **Meetings**.
2. Paste fake meeting notes → **Summarize** → get summary + action items (mock AI if no key).

---

### Step H — Analytics

1. Sidebar → **Analytics**.
2. Review **lead funnel**, **deal outcomes**, **4-week trend**, **deals by stage**.
3. Managers see **team performance** (demo user is ADMIN).

---

### Step I — Integrations & inbound leads

1. Sidebar → **Integrations**.
2. **Web lead capture** — copy the public form URL; open in incognito to submit a test lead.
3. Google / HubSpot / Salesforce — optional; CSV import works without OAuth.

---

### Step J — Team, settings, automation

1. **Team** — invite a coworker (magic link; email may be mock in dev).
2. **Settings** — profile, password, sessions, **workflow automation** (stale-deal alerts).
3. **Help** — in-app section map (`/help`).

---

### Step K — Global search & mobile

1. Header **Search** — type `Acme` or `Beta` → jump to records.
2. Resize browser or use phone — **bottom nav** on small screens.

---

## 4. Optional configuration

| Feature | Environment variable | Without it |
|---------|---------------------|------------|
| Real AI drafts | `OPENROUTER_API_KEY` | Mock text still works |
| Send email from app | `RESEND_API_KEY` | Copy draft manually |
| Google Calendar/Gmail | Google OAuth in Integrations | Manual entry only |
| HubSpot / Salesforce | OAuth or tokens | CSV import still works |

In dev, if Resend is set but not verified, emails **fail softly** — invites and reset links still appear in the UI.

---

## 5. Reset & troubleshoot

```bash
# Reset demo data only
npm run seed:demo

# Full DB reset (SQLite dev)
rm packages/api/prisma/dev.db
npm run db:push
npm run seed:demo

# Run automated checks
npm run test:api
npm run test:e2e
```

| Problem | Fix |
|---------|-----|
| Login "Too many requests" | Set `RATE_LIMIT_DISABLED=1` in `packages/api/.env` |
| Blank page on 5173 | Try http://localhost:5174 or clear Vite cache |
| API not reachable | Ensure `npm run dev:api` is running on :3001 |
| Password reset link wrong host | Set `FRONTEND_URL` to match your Vite port |

---

## 6. What this app is (and isn't)

**It is:** A full B2B sales CRM — leads, pipeline, AI assist, integrations, team roles, analytics.

**It isn't (yet):** Native mobile app, SSO, billing/subscriptions, or enterprise marketing automation. Those are intentional gaps for a personal/dev-focused build.

---

## 7. Next steps

- Use your own workspace via **Register** instead of the demo account.
- Read the [root README](../README.md) for API routes and deployment.
- See [DEPLOY.md](../DEPLOY.md) for production on Vercel + Railway/Render.
