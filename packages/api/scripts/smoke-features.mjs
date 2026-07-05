/**
 * Smoke test for newer features (password reset, search, lead capture, automation).
 * Usage: node packages/api/scripts/smoke-features.mjs
 */
const BASE = process.env.API_URL ?? 'http://localhost:3001'

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, err) {
  const detail = err instanceof Error ? err.message : String(err)
  results.push({ name, ok: false, detail })
  console.error(`✗ ${name} — ${detail}`)
}

async function json(path, opts = {}) {
  const { headers: extraHeaders, ...rest } = opts
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body.error ?? body.message ?? res.statusText
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return body
}

const suffix = Date.now()
const email = `smoke${suffix}@example.com`
const password = 'SmokePass123!'
let token = ''

try {
  const health = await json('/api/health')
  if (health.status !== 'ok') throw new Error('health not ok')
  pass('Health check')
} catch (e) {
  fail('Health check', e)
}

try {
  const reg = await json('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Smoke Tester',
      email,
      password,
      organizationName: `Smoke Org ${suffix}`,
    }),
  })
  token = reg.token
  if (!token) throw new Error('no token')
  pass('Register workspace')
} catch (e) {
  fail('Register workspace', e)
}

const auth = { Authorization: `Bearer ${token}` }

if (token) {
  try {
    const forgot = await json('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    if (!forgot.ok) throw new Error('forgot-password failed')
    pass('Forgot password', forgot.resetUrl ? 'dev reset URL returned' : 'generic ok')
  } catch (e) {
    fail('Forgot password', e)
  }

  try {
    const search = await json('/api/search?q=Smoke', { headers: auth })
    if (!Array.isArray(search.results)) throw new Error('missing results array')
    pass('Global search', `${search.results.length} result(s)`)
  } catch (e) {
    fail('Global search', e)
  }

  try {
    const capture = await json('/api/organization/lead-capture', { headers: auth })
    if (!capture.formUrl || !capture.slug) throw new Error('missing formUrl')
    pass('Lead capture config', capture.slug)

    const form = await fetch(`${BASE}/api/public/lead-form/${capture.slug}`).then((r) =>
      r.json(),
    )
    if (!form.organizationName) throw new Error('public form unavailable')
    pass('Public lead form GET')

    const submit = await json('/api/public/leads', {
      method: 'POST',
      body: JSON.stringify({
        token: capture.token,
        name: 'Web Lead',
        email: `weblead${suffix}@example.com`,
        company: 'Inbound Co',
      }),
    })
    if (!submit.leadId) throw new Error('no leadId')
    pass('Public lead submit', submit.leadId)
  } catch (e) {
    fail('Lead capture flow', e)
  }

  try {
    const auto = await json('/api/organization/automation', { headers: auth })
    if (typeof auto.staleDealAlertsEnabled !== 'boolean') throw new Error('missing settings')
    pass('Automation settings GET')

    await json('/api/organization/automation', {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ staleDealAlertDays: 7 }),
    })
    pass('Automation settings PATCH')

    const run = await json('/api/automation/stale-deal-alerts/run', {
      method: 'POST',
      headers: auth,
    })
    pass('Stale deal alerts run', run.reason ?? `stale=${run.staleCount ?? 0}`)
  } catch (e) {
    fail('Automation', e)
  }

  try {
    const stats = await json('/api/dashboard/stats', { headers: auth })
    if (!stats.leadsByStatus) throw new Error('missing leadsByStatus')
    pass('Dashboard stats funnel', `${stats.leadsByStatus.length} status buckets`)
  } catch (e) {
    fail('Dashboard stats funnel', e)
  }

  try {
    const recalc = await json('/api/leads/recalculate-scores', {
      method: 'POST',
      headers: auth,
    })
    pass('Recalculate lead scores', `${recalc.updated} updated`)
  } catch (e) {
    fail('Recalculate lead scores', e)
  }
}

try {
  const login = await json('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'yatharthsharma1309@gmail.com', password: 'OwnerPass123!' }),
  })
  if (login.requiresOrgSelection) {
    const orgId = login.organizations?.[0]?.id
    const pick = await json('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yatharthsharma1309@gmail.com',
        password: 'OwnerPass123!',
        organizationId: orgId,
      }),
    })
    if (!pick.token) throw new Error('owner login failed after org pick')
    pass('Owner account login')
  } else if (login.token) {
    pass('Owner account login')
  } else {
    throw new Error('owner login failed')
  }
} catch (e) {
  fail('Owner account login', e)
}

console.log('\n========== FEATURE SMOKE SUMMARY ==========')
const ok = results.filter((r) => r.ok).length
const bad = results.filter((r) => !r.ok).length
console.log(`Passed: ${ok}/${results.length}  Failed: ${bad}`)
if (bad > 0) process.exit(1)
