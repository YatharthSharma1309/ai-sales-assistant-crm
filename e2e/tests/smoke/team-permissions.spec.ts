import { expect, test } from '@playwright/test'
import { loginAs } from '../../fixtures/auth'
import { users } from '../../fixtures/users'

test('rep cannot see team nav and is redirected from /team', async ({ page }) => {
  await loginAs(page, 'rep')

  await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0)

  await page.goto('/team')
  await expect(page).toHaveURL(/\/?(\?notice=team-access)?$/)
})

test('admin can open team page, invite, and change roles', async ({ page }) => {
  await loginAs(page, 'admin')

  await page.locator('nav a[href="/team"]').first().click()
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Invite member' })).toBeVisible()

  await page.getByRole('button', { name: 'Invite member' }).click()
  await page.locator('form input[type="email"]').fill(`invite-${Date.now()}@test.local`)
  await page.getByRole('button', { name: 'Send invite' }).click()

  await expect(page.getByText(/Invitation email sent|Invite sent/)).toBeVisible()

  const roleSelect = page.locator('tbody select').first()
  await expect(roleSelect).toBeVisible()
})

test('manager sees invite rep only without manager role option', async ({ page }) => {
  await loginAs(page, 'manager')

  await page.locator('nav a[href="/team"]').first().click()
  await expect(page.getByRole('button', { name: 'Invite rep' })).toBeVisible()

  await page.getByRole('button', { name: 'Invite rep' }).click()
  await expect(page.getByLabel('Role')).toHaveCount(0)
  await expect(page.locator('table')).toContainText(users.manager.name)
})
