import { expect, test } from '@playwright/test'
import { clearAuthStorage, loginAs, openUserMenu } from '../../fixtures/auth'
import { AppLayoutPage } from '../../pages/AppLayoutPage'
import { users } from '../../fixtures/users'

test('session restores after reload with valid tokens', async ({ page }) => {
  await loginAs(page, 'admin')
  const layout = new AppLayoutPage(page)
  await layout.expectUserName(users.admin.name)

  await page.reload()
  await expect(page).toHaveURL('/', { timeout: 20_000 })
  await layout.expectUserName(users.admin.name)
})

test('garbage token redirects to login', async ({ page }) => {
  await page.goto('/login')
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.setItem('crm_access_token', 'not-a-valid-jwt')
  })

  await page.goto('/leads')
  await expect(page).toHaveURL(/\/login/)
})

test('sign out clears stored tokens and cookies', async ({ page }) => {
  await loginAs(page, 'admin')
  const layout = new AppLayoutPage(page)
  await layout.signOut()

  await expect(page).toHaveURL(/\/login/)

  const access = await page.evaluate(() => localStorage.getItem('crm_access_token'))
  expect(access).toBeNull()

  const cookies = await page.context().cookies()
  expect(cookies.some((c) => c.name === 'crm_refresh')).toBe(false)

  await clearAuthStorage(page)
})
