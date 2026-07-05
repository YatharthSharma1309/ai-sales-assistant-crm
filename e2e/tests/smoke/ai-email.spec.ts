import { test, expect } from '@playwright/test'

test.describe('AI email smoke', () => {
  test('communications page renders record selector', async ({ page }) => {
    await page.goto('/communications')
    await expect(
      page.getByRole('heading', { name: 'AI Follow-up Emails' }),
    ).toBeVisible()
    await expect(page.getByText('Select record')).toBeVisible()
    await expect(
      page.getByText('Select a lead or deal above to generate a contextual follow-up email.'),
    ).toBeVisible()
  })
})
