import { expect, test } from '@playwright/test'
import { clearAuthStorage, loginAs, openUserMenu } from '../../fixtures/auth'
import { users } from '../../fixtures/users'

test('session restores after reload with valid tokens', async ({ page }) => {
  await loginAs(page, 'admin')
  await expect(page.locator('header')).toContainText(users.admin.name)

  await page.reload()
  await expect(page).toHaveURL('/')
  await expect(page.locator('header')).toContainText(users.admin.name)
})

test('garbage token redirects to login', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('crm_access_token', 'not-a-valid-jwt')
    localStorage.setItem('crm_refresh_token', 'not-a-valid-refresh')
  })

  await page.goto('/leads')
  await expect(page).toHaveURL(/\/login/)
})

test('sign out clears stored tokens', async ({ page }) => {
  await loginAs(page, 'admin')
  await openUserMenu(page)
  await page.getByRole('menuitem', { name: 'Sign out' }).click()

  await expect(page).toHaveURL(/\/login/)

  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem('crm_access_token'),
    refresh: localStorage.getItem('crm_refresh_token'),
  }))

  expect(tokens.access).toBeNull()
  expect(tokens.refresh).toBeNull()

  await clearAuthStorage(page)
})
