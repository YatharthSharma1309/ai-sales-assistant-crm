import type { Page } from '@playwright/test'
import { users } from './users'

export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
}

export async function loginAs(
  page: Page,
  role: keyof typeof users,
): Promise<void> {
  const user = users[role]
  await page.goto('/login')
  await fillLoginForm(page, user.email, user.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/')
}

export async function clearAuthStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('crm_access_token')
    localStorage.removeItem('crm_refresh_token')
    localStorage.removeItem('crm_token')
  })
}

export async function openUserMenu(page: Page): Promise<void> {
  await page.locator('header button[aria-haspopup="menu"]').click()
}
