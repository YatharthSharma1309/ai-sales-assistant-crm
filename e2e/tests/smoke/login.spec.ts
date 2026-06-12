import { expect, test } from '@playwright/test'
import { fillLoginForm } from '../../fixtures/auth'
import { users } from '../../fixtures/users'

test('admin login stores access and refresh tokens', async ({ page }) => {
  await page.goto('/login')
  await fillLoginForm(page, users.admin.email, users.admin.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL('/')

  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem('crm_access_token'),
    refresh: localStorage.getItem('crm_refresh_token'),
  }))

  expect(tokens.access).toBeTruthy()
  expect(tokens.refresh).toBeTruthy()
})

test('invalid login stays on login page', async ({ page }) => {
  await page.goto('/login')
  await fillLoginForm(page, 'nobody@test.local', 'wrongpassword')
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('unauthenticated visit to /leads redirects to login', async ({ page }) => {
  await page.goto('/leads')
  await expect(page).toHaveURL(/\/login/)
})
