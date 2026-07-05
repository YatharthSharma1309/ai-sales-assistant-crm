import { expect, test } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'
import { users } from '../../fixtures/users'

test('admin login stores refresh cookie and reaches dashboard', async ({ page }) => {
  const login = new LoginPage(page)
  await login.login(users.admin.email, users.admin.password)

  await expect(page).toHaveURL('/')

  const access = await page.evaluate(() => localStorage.getItem('crm_access_token'))
  expect(access).toBeNull()

  const cookies = await page.context().cookies()
  expect(cookies.some((c) => c.name === 'crm_refresh')).toBe(true)
})

test('invalid login stays on login page', async ({ page }) => {
  const login = new LoginPage(page)
  await login.goto()
  await login.fill('nobody@test.local', 'wrongpassword')
  await login.submit()

  await expect(page).toHaveURL(/\/login/)
  await expect(login.heading()).toBeVisible()
})

test('unauthenticated visit to /leads redirects to login', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/leads')
  await expect(page).toHaveURL(/\/login/)
  await context.close()
})
