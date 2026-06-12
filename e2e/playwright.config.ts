import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const root = path.resolve(__dirname, '..')
const apiDir = path.join(root, 'packages', 'api')
const dbFile = path.join(apiDir, 'prisma', 'e2e.db')
const apiPort = '3011'
const webPort = '5174'

export default defineConfig({
  testDir: path.join(__dirname, 'tests', 'smoke'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev --workspace=packages/api',
      cwd: root,
      port: Number(apiPort),
      reuseExistingServer: false,
      env: {
        DATABASE_URL: `file:${dbFile}`,
        JWT_SECRET: 'e2e-test-secret',
        FRONTEND_URL: `http://localhost:${webPort}`,
        PORT: apiPort,
      },
    },
    {
      command: 'npm run dev --workspace=apps/web',
      cwd: root,
      port: Number(webPort),
      reuseExistingServer: false,
      env: {
        VITE_API_URL: `http://localhost:${apiPort}`,
      },
    },
  ],
})
