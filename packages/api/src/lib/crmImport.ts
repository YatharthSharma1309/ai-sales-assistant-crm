import type { DealStage, LeadStatus } from '@prisma/client'
import { prisma } from './prisma.js'

export type CrmContactRow = {
  firstName: string
  lastName: string
  email?: string
  company?: string
  jobTitle?: string
  phone?: string
}

export type CrmDealRow = {
  title: string
  stage?: string
  amount?: number
  closeDate?: string
  contactEmail?: string
  company?: string
}

export type CrmLeadRow = {
  title: string
  source?: string
  status?: LeadStatus
  notes?: string
  firstName?: string
  lastName?: string
  email?: string
  company?: string
}

export type CrmImportOptions = {
  leadSource: string
  mapDealStage: (stage?: string) => DealStage
  mapLeadStatus?: (status?: string) => LeadStatus
}

export type CrmImportResult = {
  accountsCreated: number
  contactsCreated: number
  leadsCreated: number
  dealsCreated: number
  leadsSkipped: number
  dealsSkipped: number
  warnings: string[]
}

function parseCloseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function importCrmData(
  organizationId: string,
  userId: string,
  data: {
    contacts?: CrmContactRow[]
    deals?: CrmDealRow[]
    leads?: CrmLeadRow[]
  },
  options: CrmImportOptions,
): Promise<CrmImportResult> {
  const accountCache = new Map<string, string>()
  const contactCache = new Map<string, string>()
  const warnings: string[] = []

  let accountsCreated = 0
  let contactsCreated = 0
  let leadsCreated = 0
  let dealsCreated = 0
  let leadsSkipped = 0
  let dealsSkipped = 0

  async function getOrCreateAccount(name: string) {
    const key = name.toLowerCase()
    if (accountCache.has(key)) return accountCache.get(key)!

    const existing = await prisma.account.findFirst({
      where: { organizationId, name: { equals: name } },
    })
    if (existing) {
      accountCache.set(key, existing.id)
      return existing.id
    }

    const account = await prisma.account.create({
      data: { organizationId, name },
    })
    accountCache.set(key, account.id)
    accountsCreated++
    return account.id
  }

  async function getOrCreateContact(row: CrmContactRow) {
    const key = (row.email ?? `${row.firstName}-${row.lastName}`).toLowerCase()
    if (contactCache.has(key)) return contactCache.get(key)!

    if (row.email) {
      const existing = await prisma.contact.findFirst({
        where: { organizationId, email: row.email },
      })
      if (existing) {
        contactCache.set(key, existing.id)
        return existing.id
      }
    }

    let accountId: string | undefined
    if (row.company) accountId = await getOrCreateAccount(row.company)

    const contact = await prisma.contact.create({
      data: {
        organizationId,
        accountId,
        firstName: row.firstName,
        lastName: row.lastName || '—',
        email: row.email,
        jobTitle: row.jobTitle,
        phone: row.phone,
      },
    })
    contactCache.set(key, contact.id)
    contactsCreated++
    return contact.id
  }

  async function createLeadIfNew(
    contactId: string | undefined,
    title: string,
    source: string,
    status: LeadStatus = 'NEW',
    notes?: string,
  ) {
    const existing = await prisma.lead.findFirst({
      where: {
        organizationId,
        contactId: contactId ?? null,
        title,
        source,
      },
    })
    if (existing) {
      leadsSkipped++
      return
    }

    await prisma.lead.create({
      data: {
        organizationId,
        contactId,
        assignedToId: userId,
        title,
        status,
        source,
        notes,
      },
    })
    leadsCreated++
  }

  const mapLeadStatus =
    options.mapLeadStatus ?? (() => 'NEW' as LeadStatus)

  if (data.contacts) {
    for (const row of data.contacts) {
      const contactId = await getOrCreateContact(row)
      const title = row.company
        ? `${row.company} — ${row.firstName} ${row.lastName}`.trim()
        : `${row.firstName} ${row.lastName}`.trim()
      await createLeadIfNew(contactId, title, options.leadSource)
    }
  }

  if (data.leads) {
    for (const row of data.leads) {
      let contactId: string | undefined

      if (row.firstName || row.lastName || row.email) {
        contactId = await getOrCreateContact({
          firstName: row.firstName ?? 'Unknown',
          lastName: row.lastName ?? '',
          email: row.email,
          company: row.company,
        })
      } else if (row.company) {
        await getOrCreateAccount(row.company)
      }

      await createLeadIfNew(
        contactId,
        row.title,
        row.source ?? options.leadSource,
        mapLeadStatus(row.status),
        row.notes,
      )
    }
  }

  if (data.deals) {
    for (const row of data.deals) {
      const stage = options.mapDealStage(row.stage)
      if (row.stage && stage === 'DISCOVERY') {
        const normalized = row.stage.toLowerCase().replace(/[\s_-]/g, '')
        if (!['discovery', 'prospecting', 'qualification'].includes(normalized)) {
          warnings.push(`Unmapped deal stage "${row.stage}" for "${row.title}"`)
        }
      }

      const existingDeal = await prisma.deal.findFirst({
        where: { organizationId, title: row.title },
      })

      if (existingDeal) {
        dealsSkipped++
        continue
      }

      let contactId: string | undefined
      let accountId: string | undefined

      if (row.contactEmail) {
        const contact = await prisma.contact.findFirst({
          where: { organizationId, email: row.contactEmail },
        })
        contactId = contact?.id
      }

      if (row.company) {
        accountId = await getOrCreateAccount(row.company)
      }

      await prisma.deal.create({
        data: {
          organizationId,
          contactId,
          accountId,
          assignedToId: userId,
          title: row.title,
          stage,
          arr: row.amount,
          closeDate: parseCloseDate(row.closeDate),
        },
      })
      dealsCreated++
    }
  }

  return {
    accountsCreated,
    contactsCreated,
    leadsCreated,
    dealsCreated,
    leadsSkipped,
    dealsSkipped,
    warnings,
  }
}
