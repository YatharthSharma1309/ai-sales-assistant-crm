import { expect, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async fill(email: string, password: string) {
    await this.page.locator('input[type="email"]').fill(email)
    await this.page.locator('input[type="password"]').fill(password)
  }

  async submit() {
    await this.page.getByRole('button', { name: /sign in/i }).click()
  }

  async login(email: string, password: string) {
    await this.goto()
    await this.fill(email, password)
    await this.submit()
    await this.page.waitForURL((url) => new URL(url).pathname === '/')
  }

  heading = () => this.page.getByRole('heading', { name: 'Welcome back' })
}
