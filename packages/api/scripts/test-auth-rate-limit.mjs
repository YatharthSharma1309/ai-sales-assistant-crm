/**
 * Auth & rate-limit diagnostic script for local dev.
 * Usage: node scripts/test-auth-rate-limit.mjs
 */
const API = process.env.API_URL ?? 'http://127.0.0.1:3001'

const ownerEmail = process.env.TEST_OWNER_EMAIL ?? 'yatharthsharma1309@gmail.com'
const ownerPassword = process.env.TEST_OWNER_PASSWORD ?? 'OwnerPass123!'

function pickRateHeaders(headers) {
  const out = {}
  for (const [k, v] of headers.entries()) {
    if (k.startsWith('ratelimit') || k === 'retry-after') out[k] = v
  }
  return out
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return {
    path,
    status: res.status,
    rateLimit: pickRateHeaders(res.headers),
    body,
  }
}

console.log('=== Auth & rate-limit diagnostics ===\n')
console.log(`API: ${API}\n`)

const health = await request('/api/health')
console.log('1. Health check')
console.log(JSON.stringify(health, null, 2))

const badLogin = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
})
console.log('\n2. Failed login (should be 401, not 429)')
console.log(JSON.stringify(badLogin, null, 2))

const goodLogin = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
})
console.log('\n3. Owner login')
console.log(
  JSON.stringify(
    {
      ...goodLogin,
      body:
        goodLogin.status === 200
          ? {
              ...(typeof goodLogin.body === 'object' ? goodLogin.body : {}),
              accessToken: goodLogin.body?.accessToken
                ? '[present]'
                : goodLogin.body?.token
                  ? '[present]'
                  : undefined,
            }
          : goodLogin.body,
    },
    null,
    2,
  ),
)

if (goodLogin.status === 200 && goodLogin.body?.accessToken) {
  const token = goodLogin.body.accessToken ?? goodLogin.body.token
  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log('\n4. Authenticated /me')
  console.log(JSON.stringify(me, null, 2))
}

const burst = []
for (let i = 0; i < 5; i++) {
  burst.push(await request('/api/health'))
}
console.log('\n5. Burst health checks (5x) — statuses:', burst.map((r) => r.status).join(', '))

console.log('\n=== Summary ===')
if (goodLogin.status === 429) {
  console.log('FAIL: Owner login blocked by rate limit (429)')
  process.exit(1)
}
if (goodLogin.status === 401) {
  console.log('FAIL: Owner login rejected — check email/password in database')
  process.exit(1)
}
if (goodLogin.status === 200) {
  console.log('PASS: Owner can log in successfully')
  process.exit(0)
}
console.log(`WARN: Unexpected login status ${goodLogin.status}`)
process.exit(1)
