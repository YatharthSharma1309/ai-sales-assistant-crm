import type { Page } from '@playwright/test'

export class TeamPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.locator('nav a[href="/team"]').first().click()
  }

  heading = () => this.page.getByRole('heading', { name: 'Team' })
  inviteButton = (isAdmin: boolean) =>
    this.page.getByRole('button', {
      name: isAdmin ? 'Invite member' : 'Invite rep',
    })

  async openInviteForm(isAdmin: boolean) {
    await this.inviteButton(isAdmin).click()
  }

  async fillInviteEmail(email: string) {
    await this.page.locator('form input[type="email"]').fill(email)
  }

  async sendInvite() {
    await this.page.getByRole('button', { name: 'Send invite' }).click()
  }

  firstRoleSelect = () => this.page.locator('tbody select').first()
  table = () => this.page.locator('table')
  roleLabel = () => this.page.getByLabel('Role')
}
