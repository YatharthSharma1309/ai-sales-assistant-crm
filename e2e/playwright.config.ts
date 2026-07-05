import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const root = path.resolve(__dirname, '..')
const apiDir = path.join(root, 'packages', 'api')
const dbFile = path.join(apiDir, 'prisma', 'e2e.db')
const apiPort = '3011'
const webPort = '5174'
const webOrigin = `http://localhost:${webPort}`
const authDir = path.join(__dirname, '.auth')

export default defineConfig({
  testDir: path.join(__dirname, 'tests', 'smoke'),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  use: {
    baseURL: webOrigin,
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
      testMatch: /(login|auth-session)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-authed',
      dependencies: ['setup'],
      testMatch: /(layout|team-permissions|pipeline|ai-email)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'admin.json'),
      },
    },
    {
      name: 'chromium-manager',
      dependencies: ['setup'],
      testMatch: /leads\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(authDir, 'manager.json'),
      },
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
        RATE_LIMIT_DISABLED: '1',
      },
    },
    {
      command: process.env.CI
        ? `npm run build --workspace=apps/web && npm run preview --workspace=apps/web -- --port ${webPort} --host`
        : `npm run dev --workspace=apps/web -- --port ${webPort} --strictPort`,
      cwd: root,
      port: Number(webPort),
      reuseExistingServer: false,
      env: {
        VITE_API_URL: '',
        VITE_DEV_API_URL: `http://localhost:${apiPort}`,
      },
    },
  ],
})
