import { expect, type Page } from '@playwright/test'

export class AppLayoutPage {
  constructor(private readonly page: Page) {}

  header = () => this.page.getByRole('banner')
  footer = () => this.page.getByRole('contentinfo')
  navLink = (name: string) => this.page.getByRole('link', { name })
  userMenuButton = () => this.page.locator('header button[aria-haspopup="menu"]')

  async openUserMenu() {
    await this.userMenuButton().click()
  }

  async signOut() {
    await this.openUserMenu()
    await this.page.getByRole('menuitem', { name: 'Sign out' }).click()
  }

  async expectUserName(name: string) {
    await expect(this.header()).toContainText(name, { timeout: 20_000 })
  }
}
