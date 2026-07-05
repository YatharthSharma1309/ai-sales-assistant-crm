import { test, expect } from '@playwright/test'

test.describe('Leads CRUD smoke', () => {
  test('manager can create and view a lead', async ({ page }) => {
    await page.goto('/leads')
    await expect(page.getByRole('heading', { name: 'Lead Management' })).toBeVisible()

    await page.getByRole('button', { name: /add lead/i }).click()
    await page.getByPlaceholder(/vp engineering/i).fill('E2E Test Lead')
    await page.getByRole('button', { name: /save lead/i }).click()

    await expect(page.getByRole('link', { name: 'E2E Test Lead' })).toBeVisible({
      timeout: 10000,
    })
  })
})
