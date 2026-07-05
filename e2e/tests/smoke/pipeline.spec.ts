import { test, expect } from '@playwright/test'

test.describe('Pipeline smoke', () => {
  test('pipeline page loads', async ({ page }) => {
    await page.goto('/pipeline')
    await expect(
      page.getByRole('heading', { name: 'Pipeline', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /new deal/i })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Pipeline is empty' }).or(page.getByText('Discovery')),
    ).toBeVisible()
  })
})
