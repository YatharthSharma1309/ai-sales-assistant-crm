import { expect, test as setup } from '@playwright/test'
import { orgName, users } from '../../fixtures/users'

const API = process.env.E2E_API_URL ?? 'http://localhost:3011'

async function login(email: string, password: string) {
  return fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

setup('seed e2e users via API', async () => {
  const adminLogin = await login(users.admin.email, users.admin.password)
  if (adminLogin.ok) return

  const register = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: users.admin.name,
      email: users.admin.email,
      password: users.admin.password,
      organizationName: orgName,
    }),
  })
  expect(register.ok).toBeTruthy()
  const adminAuth = (await register.json()) as { accessToken: string; token?: string }
  const adminToken = adminAuth.accessToken ?? adminAuth.token
  expect(adminToken).toBeTruthy()

  for (const [role, user] of [
    ['MANAGER', users.manager],
    ['REP', users.rep],
  ] as const) {
    const memberLogin = await login(user.email, user.password)
    if (memberLogin.ok) continue

    const invite = await fetch(`${API}/api/team/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        role,
      }),
    })
    expect(invite.ok).toBeTruthy()
    const inviteBody = (await invite.json()) as { inviteUrl?: string }
    expect(inviteBody.inviteUrl).toBeTruthy()

    const tokenMatch = inviteBody.inviteUrl!.match(/token=([^&]+)/)
    expect(tokenMatch).toBeTruthy()
    const token = decodeURIComponent(tokenMatch![1])

    const accept = await fetch(`${API}/api/auth/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        name: user.name,
        password: user.password,
      }),
    })
    expect(accept.ok).toBeTruthy()
  }
})
