import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  await prisma.$queryRaw`SELECT 1 as ok`
  const users = await prisma.user.count()
  const orgs = await prisma.organization.count()
  const url = process.env.DATABASE_URL ?? '(not set)'

  console.log(
    JSON.stringify(
      {
        connected: true,
        databaseUrl: url,
        users,
        organizations: orgs,
      },
      null,
      2,
    ),
  )
} catch (err) {
  console.log(
    JSON.stringify(
      {
        connected: false,
        databaseUrl: process.env.DATABASE_URL ?? '(not set)',
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  )
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
