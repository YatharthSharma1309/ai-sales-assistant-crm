import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '..')
const apiDir = path.join(root, 'packages', 'api')
const dbFile = path.join(apiDir, 'prisma', 'e2e.db')
const databaseUrl = `file:${dbFile}`

export default async function globalSetup() {
  process.env.DATABASE_URL = databaseUrl
  process.env.JWT_SECRET = 'e2e-test-secret'
  process.env.FRONTEND_URL = 'http://localhost:5174'

  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile)
  }

  execSync('npx prisma db push --skip-generate', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })
}
