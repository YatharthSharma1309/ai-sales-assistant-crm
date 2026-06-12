import { expect, test } from '@playwright/test'
import { loginAs } from '../../fixtures/auth'

test('header and footer are visible when authenticated', async ({ page }) => {
  await loginAs(page, 'admin')

  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('AI Sales Assistant CRM')
})
