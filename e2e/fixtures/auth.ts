import path from 'node:path'
import type { Page } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { waitForAppReady } from './app'
import { users } from './users'

export const authDir = path.join(__dirname, '..', '.auth')
export const storageState = {
  admin: path.join(authDir, 'admin.json'),
  manager: path.join(authDir, 'manager.json'),
  rep: path.join(authDir, 'rep.json'),
} as const

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
  const login = new LoginPage(page)
  await login.login(user.email, user.password)
  await waitForAppReady(page)
}

export async function clearAuthStorage(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.removeItem('crm_access_token')
    localStorage.removeItem('crm_refresh_token')
    localStorage.removeItem('crm_token')
  })
}

export async function openUserMenu(page: Page): Promise<void> {
  await page.locator('header button[aria-haspopup="menu"]').click()
}
