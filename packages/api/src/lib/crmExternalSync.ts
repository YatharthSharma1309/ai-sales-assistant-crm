import type { DealStage, LeadStatus } from '@prisma/client'
import { prisma } from './prisma.js'
import { mapHubSpotStage } from './hubspotImport.js'

const HUBSPOT_SOURCE = 'HUBSPOT'
const SALESFORCE_SOURCE = 'SALESFORCE'

export type ExternalContactInput = {
  firstName: string
  lastName: string
  email?: string
  jobTitle?: string
  phone?: string
  company?: string
}

export type ExternalDealInput = {
  title: string
  stage?: string
  amount?: number
  closeDate?: string
}

export async function findOrgByHubSpotPortal(portalId: number) {
  const integrations = await prisma.integration.findMany({
    where: { provider: 'HUBSPOT' },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      metadata: true,
    },
  })

  return integrations.find((i) => {
    const meta = i.metadata as { hubspotPortalId?: number } | null
    return meta?.hubspotPortalId === portalId
  })
}

export async function findOrgBySalesforceWebhookSecret(secret: string) {
  const integrations = await prisma.integration.findMany({
    where: { provider: 'SALESFORCE' },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      metadata: true,
    },
  })

  return integrations.find((i) => {
    const meta = i.metadata as { webhookSecret?: string } | null
    return meta?.webhookSecret === secret
  })
}

async function getOrCreateAccount(organizationId: string, name: string) {
  const existing = await prisma.account.findFirst({
    where: { organizationId, name },
  })
  if (existing) return existing.id

  const account = await prisma.account.create({
    data: { organizationId, name },
  })
  return account.id
}

export async function upsertContactFromExternal(
  organizationId: string,
  userId: string,
  source: string,
  externalId: string,
  input: ExternalContactInput,
) {
  let accountId: string | undefined
  if (input.company) {
    accountId = await getOrCreateAccount(organizationId, input.company)
  }

  const data = {
    firstName: input.firstName || 'Unknown',
    lastName: input.lastName || '—',
    email: input.email?.toLowerCase(),
    jobTitle: input.jobTitle,
    phone: input.phone,
    accountId,
  }

  const existing = await prisma.contact.findFirst({
    where: { organizationId, externalSource: source, externalId },
  })

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.contact.create({
    data: {
      organizationId,
      externalSource: source,
      externalId,
      ...data,
    },
  })
}

export async function upsertDealFromExternal(
  organizationId: string,
  userId: string,
  source: string,
  externalId: string,
  input: ExternalDealInput,
  mapStage: (stage?: string) => DealStage = mapHubSpotStage,
) {
  const stage = mapStage(input.stage)
  const closeDate = input.closeDate ? new Date(input.closeDate) : undefined

  const data = {
    title: input.title,
    stage,
    arr: input.amount,
    closeDate: closeDate && !Number.isNaN(closeDate.getTime()) ? closeDate : undefined,
  }

  const existing = await prisma.deal.findFirst({
    where: { organizationId, externalSource: source, externalId },
  })

  if (existing) {
    return prisma.deal.update({
      where: { id: existing.id },
      data,
    })
  }

  return prisma.deal.create({
    data: {
      organizationId,
      assignedToId: userId,
      externalSource: source,
      externalId,
      ...data,
    },
  })
}

export async function upsertLeadFromSalesforce(
  organizationId: string,
  userId: string,
  externalId: string,
  input: {
    title: string
    source?: string
    status?: LeadStatus
    notes?: string
    contact?: ExternalContactInput
  },
) {
  let contactId: string | undefined
  if (input.contact) {
    const contact = await upsertContactFromExternal(
      organizationId,
      userId,
      SALESFORCE_SOURCE,
      `${externalId}-contact`,
      input.contact,
    )
    contactId = contact.id
  }

  const existing = await prisma.lead.findFirst({
    where: {
      organizationId,
      externalSource: SALESFORCE_SOURCE,
      externalId,
    },
  })

  if (existing) {
    return prisma.lead.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        source: input.source,
        status: input.status,
        notes: input.notes,
        contactId,
      },
    })
  }

  return prisma.lead.create({
    data: {
      organizationId,
      assignedToId: userId,
      externalSource: SALESFORCE_SOURCE,
      externalId,
      title: input.title,
      source: input.source,
      status: input.status ?? 'NEW',
      notes: input.notes,
      contactId,
    },
  })
}

export { HUBSPOT_SOURCE, SALESFORCE_SOURCE }
