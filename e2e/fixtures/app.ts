import { expect, type Page } from '@playwright/test'

export async function waitForAppReady(page: Page) {
  await expect(page.getByText('Loading workspace...')).toHaveCount(0, {
    timeout: 30_000,
  })
  await expect(
    page.getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible({ timeout: 15_000 })
}
