/**
 * Seed a beginner-friendly demo workspace with sample CRM data.
 *
 * Usage (from repo root):
 *   npm run seed:demo
 *
 * Login after seeding:
 *   Email:    demo@example.com
 *   Password: DemoPass123!
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO = {
  email: 'demo@example.com',
  password: 'DemoPass123!',
  name: 'Demo User',
  orgName: 'Acme SaaS Demo',
  orgSlug: 'acme-saas-demo',
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function wipeOrgData(orgId) {
  await prisma.activity.deleteMany({ where: { organizationId: orgId } })
  await prisma.deal.deleteMany({ where: { organizationId: orgId } })
  await prisma.lead.deleteMany({ where: { organizationId: orgId } })
  await prisma.contact.deleteMany({ where: { organizationId: orgId } })
  await prisma.account.deleteMany({ where: { organizationId: orgId } })
  await prisma.teamInvite.deleteMany({ where: { organizationId: orgId } })
}

async function ensureDemoUser() {
  const passwordHash = await bcrypt.hash(DEMO.password, 10)
  let user = await prisma.user.findUnique({ where: { email: DEMO.email } })

  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO.email, name: DEMO.name, passwordHash },
    })
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: DEMO.name, passwordHash },
    })
  }

  let org = await prisma.organization.findUnique({ where: { slug: DEMO.orgSlug } })

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: DEMO.orgName,
        slug: DEMO.orgSlug,
        leadCaptureToken: crypto.randomBytes(24).toString('hex'),
        emailLogToken: crypto.randomBytes(16).toString('hex'),
      },
    })
  } else {
    await wipeOrgData(org.id)
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: DEMO.orgName,
        leadCaptureToken: org.leadCaptureToken ?? crypto.randomBytes(24).toString('hex'),
        emailLogToken: org.emailLogToken ?? crypto.randomBytes(16).toString('hex'),
      },
    })
  }

  await prisma.membership.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
    create: { organizationId: org.id, userId: user.id, role: 'ADMIN' },
    update: { role: 'ADMIN' },
  })

  return { user, org }
}

async function seedCrmData(orgId, userId) {
  const acme = await prisma.account.create({
    data: {
      organizationId: orgId,
      name: 'Acme Analytics',
      industry: 'B2B SaaS',
      companySize: '51-200',
      website: 'https://acme-analytics.example',
    },
  })

  const beta = await prisma.account.create({
    data: {
      organizationId: orgId,
      name: 'Beta Logistics',
      industry: 'Supply Chain',
      companySize: '201-500',
      website: 'https://beta-logistics.example',
    },
  })

  const jane = await prisma.contact.create({
    data: {
      organizationId: orgId,
      accountId: acme.id,
      firstName: 'Jane',
      lastName: 'Rivera',
      email: 'jane.rivera@acme-analytics.example',
      jobTitle: 'VP Engineering',
      phone: '+1 555-0101',
    },
  })

  const mark = await prisma.contact.create({
    data: {
      organizationId: orgId,
      accountId: acme.id,
      firstName: 'Mark',
      lastName: 'Chen',
      email: 'mark.chen@acme-analytics.example',
      jobTitle: 'Director of IT',
    },
  })

  const priya = await prisma.contact.create({
    data: {
      organizationId: orgId,
      accountId: beta.id,
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'priya.nair@beta-logistics.example',
      jobTitle: 'Head of Procurement',
    },
  })

  const leadInbound = await prisma.lead.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      title: 'Beta Logistics — Head of Procurement',
      status: 'NEW',
      source: 'Web form',
      score: 35,
      notes: 'Submitted via website capture form. Interested in fleet analytics.',
      contactId: priya.id,
      createdAt: daysAgo(2),
    },
  })

  const leadReferral = await prisma.lead.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      title: 'Acme Analytics — VP Engineering',
      status: 'CONTACTED',
      source: 'Referral',
      score: 55,
      notes: 'Warm intro from investor. Wants demo next week.',
      contactId: jane.id,
      createdAt: daysAgo(10),
    },
  })

  const leadQualified = await prisma.lead.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      title: 'Acme Analytics — IT Director',
      status: 'QUALIFIED',
      source: 'Inbound',
      score: 72,
      contactId: mark.id,
      createdAt: daysAgo(21),
    },
  })

  const dealDiscovery = await prisma.deal.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      accountId: acme.id,
      contactId: jane.id,
      title: 'Acme Analytics — Annual Platform',
      stage: 'DISCOVERY',
      arr: 48000,
      mrr: 4000,
      probability: 20,
      closeDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(3),
    },
  })

  const dealTrial = await prisma.deal.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      accountId: beta.id,
      contactId: priya.id,
      title: 'Beta Logistics — Pilot',
      stage: 'TRIAL',
      arr: 24000,
      mrr: 2000,
      probability: 50,
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: daysAgo(28),
      updatedAt: daysAgo(1),
    },
  })

  const dealWon = await prisma.deal.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      accountId: acme.id,
      contactId: mark.id,
      title: 'Acme Analytics — Team Seats',
      stage: 'CLOSED_WON',
      arr: 12000,
      mrr: 1000,
      probability: 100,
      closeDate: daysAgo(5),
      createdAt: daysAgo(60),
      updatedAt: daysAgo(5),
    },
  })

  const dealStale = await prisma.deal.create({
    data: {
      organizationId: orgId,
      assignedToId: userId,
      accountId: beta.id,
      title: 'Beta Logistics — Expansion (stale)',
      stage: 'PROPOSAL',
      arr: 36000,
      mrr: 3000,
      probability: 60,
      riskNote: 'No activity in 10+ days — good for testing stale-deal alerts',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(12),
    },
  })

  await prisma.activity.createMany({
    data: [
      {
        organizationId: orgId,
        leadId: leadReferral.id,
        createdById: userId,
        type: 'CALL',
        title: 'Intro call with Jane',
        body: 'Discussed pain points around pipeline reporting. Booked demo.',
        createdAt: daysAgo(8),
      },
      {
        organizationId: orgId,
        dealId: dealDiscovery.id,
        contactId: jane.id,
        createdById: userId,
        type: 'MEETING',
        title: 'Discovery workshop',
        body: 'Mapped stakeholders and success criteria.',
        createdAt: daysAgo(3),
      },
      {
        organizationId: orgId,
        dealId: dealTrial.id,
        contactId: priya.id,
        createdById: userId,
        type: 'EMAIL',
        title: 'Trial kickoff follow-up',
        body: 'Sent onboarding checklist and trial success plan.',
        createdAt: daysAgo(1),
      },
      {
        organizationId: orgId,
        leadId: leadInbound.id,
        createdById: userId,
        type: 'NOTE',
        title: 'Inbound lead review',
        body: 'Qualify budget and timeline on first call.',
        createdAt: daysAgo(1),
      },
    ],
  })

  return {
    accounts: 2,
    contacts: 3,
    leads: 3,
    deals: 4,
    dealStale: dealStale.title,
    leadCaptureSlug: (await prisma.organization.findUnique({
      where: { id: orgId },
      select: { slug: true, leadCaptureToken: true },
    })),
  }
}

const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173'

try {
  const { user, org } = await ensureDemoUser()
  const stats = await seedCrmData(org.id, user.id)

  const captureUrl = stats.leadCaptureSlug?.leadCaptureToken
    ? `${frontend}/capture/${stats.leadCaptureSlug.slug}?token=${stats.leadCaptureSlug.leadCaptureToken}`
    : null

  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Demo workspace seeded successfully')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('  Sign in at:', `${frontend}/login`)
  console.log('  Email:      ', DEMO.email)
  console.log('  Password:   ', DEMO.password)
  console.log('  Workspace:  ', DEMO.orgName)
  console.log('')
  console.log('  Sample data:')
  console.log(`    ${stats.accounts} accounts, ${stats.contacts} contacts`)
  console.log(`    ${stats.leads} leads, ${stats.deals} deals (incl. 1 won, 1 stale)`)
  console.log('')
  if (captureUrl) {
    console.log('  Public lead form (Integrations also shows this):')
    console.log('   ', captureUrl)
  }
  console.log('')
  console.log('  Beginner walkthrough: docs/BEGINNER_SIMULATION.md')
  console.log('  In-app help:          /help after login')
  console.log('')
} catch (err) {
  console.error('Seed failed:', err)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
