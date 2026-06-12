import { expect, test } from '@playwright/test'
import { waitForAppReady } from '../../fixtures/app'
import { AppLayoutPage } from '../../pages/AppLayoutPage'

test('header and footer are visible when authenticated', async ({ page }) => {
  const layout = new AppLayoutPage(page)
  await page.goto('/')
  await waitForAppReady(page)

  await expect(layout.header()).toBeVisible()
  await expect(layout.footer()).toBeVisible()
  await expect(layout.footer()).toContainText('AI Sales Assistant CRM')
})
