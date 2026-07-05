import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    createdAt: true,
    memberships: {
      select: {
        role: true,
        organization: { select: { name: true, slug: true } },
      },
    },
  },
})

const orgs = await prisma.organization.findMany({
  select: {
    id: true,
    name: true,
    slug: true,
    _count: { select: { memberships: true, leads: true, deals: true, accounts: true } },
  },
})

console.log('=== USERS ===')
console.log(JSON.stringify(users, null, 2))
console.log('=== ORGANIZATIONS ===')
console.log(JSON.stringify(orgs, null, 2))

await prisma.$disconnect()
