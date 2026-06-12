import { expect, test } from '@playwright/test'
import { waitForAppReady } from '../../fixtures/app'
import { storageState } from '../../fixtures/auth'
import { users } from '../../fixtures/users'
import { AppLayoutPage } from '../../pages/AppLayoutPage'
import { TeamPage } from '../../pages/TeamPage'

test.use({ storageState: storageState.rep })

test('rep cannot see team nav and is redirected from /team', async ({ page }) => {
  const layout = new AppLayoutPage(page)
  await page.goto('/')
  await waitForAppReady(page)

  await expect(layout.navLink('Team')).toHaveCount(0)

  await page.goto('/team')
  await expect(page).toHaveURL(/\/?(\?notice=team-access)?$/)
})

test.describe('admin team permissions', () => {
  test.use({ storageState: storageState.admin })

  test('admin can open team page, invite, and change roles', async ({ page }) => {
    const team = new TeamPage(page)
    await page.goto('/')
    await waitForAppReady(page)
    await team.goto()

    await expect(team.heading()).toBeVisible()
    await expect(team.inviteButton(true)).toBeVisible()

    await team.openInviteForm(true)
    await team.fillInviteEmail(`invite-${Date.now()}@test.local`)
    await team.sendInvite()

    await expect(page.getByText(/Invitation email sent|Invite sent/)).toBeVisible()
    await expect(team.firstRoleSelect()).toBeVisible()
  })
})

test.describe('manager team permissions', () => {
  test.use({ storageState: storageState.manager })

  test('manager sees invite rep only without manager role option', async ({ page }) => {
    const team = new TeamPage(page)
    await page.goto('/')
    await waitForAppReady(page)
    await team.goto()

    await expect(team.inviteButton(false)).toBeVisible()
    await team.openInviteForm(false)
    await expect(team.roleLabel()).toHaveCount(0)
    await expect(team.table()).toContainText(users.manager.name)
  })
})
