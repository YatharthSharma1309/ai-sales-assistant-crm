import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const email = process.argv[2]
const name = process.argv[3] ?? 'Admin User'
const orgName = process.argv[4] ?? 'My Workspace'
const password = process.argv[5] ?? 'ChangeMeNow123!'

if (!email) {
  console.error('Usage: node scripts/create-owner.mjs <email> [name] [orgName] [password]')
  process.exit(1)
}

function slugify(name) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  return base
}

const existing = await prisma.user.findUnique({
  where: { email },
  include: {
    memberships: {
      include: { organization: { select: { id: true, name: true, slug: true } } },
    },
  },
})

if (existing) {
  const adminMembership = existing.memberships.find((m) => m.role === 'ADMIN')
  if (adminMembership) {
    console.log(
      JSON.stringify(
        {
          status: 'already_exists',
          message: 'User already exists with ADMIN role',
          email: existing.email,
          name: existing.name,
          organization: adminMembership.organization,
          role: adminMembership.role,
        },
        null,
        2,
      ),
    )
    await prisma.$disconnect()
    process.exit(0)
  }

  // User exists but no admin org — promote or add membership
  const passwordHash = await bcrypt.hash(password, 10)
  let slug = slugify(orgName)
  const slugTaken = await prisma.organization.findUnique({ where: { slug } })
  if (slugTaken) slug = `${slug}-${Date.now()}`

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.id },
      data: { passwordHash, name },
    })
    const organization = await tx.organization.create({
      data: { name: orgName, slug },
    })
    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: existing.id,
        role: 'ADMIN',
      },
    })
    return { user: existing, organization }
  })

  console.log(
    JSON.stringify(
      {
        status: 'workspace_added',
        email: result.user.email,
        name,
        password,
        organization: result.organization,
        role: 'ADMIN',
      },
      null,
      2,
    ),
  )
  await prisma.$disconnect()
  process.exit(0)
}

const passwordHash = await bcrypt.hash(password, 10)
let slug = slugify(orgName)
const slugTaken = await prisma.organization.findUnique({ where: { slug } })
if (slugTaken) slug = `${slug}-${Date.now()}`

const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { name, email, passwordHash },
  })
  const organization = await tx.organization.create({
    data: { name: orgName, slug },
  })
  await tx.membership.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'ADMIN',
    },
  })
  return { user, organization }
})

console.log(
  JSON.stringify(
    {
      status: 'created',
      email: result.user.email,
      name: result.user.name,
      password,
      organization: { id: result.organization.id, name: result.organization.name, slug: result.organization.slug },
      role: 'ADMIN',
    },
    null,
    2,
  ),
)

await prisma.$disconnect()
