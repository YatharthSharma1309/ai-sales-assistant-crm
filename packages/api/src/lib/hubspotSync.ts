import type { HubSpotContactRow, HubSpotDealRow } from './hubspotImport.js'
import { importHubSpotData } from './hubspotImport.js'
import type { CrmImportResult } from './crmImport.js'

type HubSpotListResponse<T> = {
  results: T[]
  paging?: { next?: { after: string } }
}

type HubSpotContact = {
  id: string
  properties: Record<string, string | null | undefined>
}

type HubSpotDeal = {
  id: string
  properties: Record<string, string | null | undefined>
}

const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'company',
  'jobtitle',
  'phone',
].join(',')

const DEAL_PROPERTIES = [
  'dealname',
  'dealstage',
  'amount',
  'closedate',
].join(',')

async function hubSpotFetch<T>(
  token: string,
  path: string,
): Promise<T> {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`HubSpot API error ${response.status}: ${body}`)
  }
  return response.json() as Promise<T>
}

async function fetchAllContacts(token: string): Promise<HubSpotContactRow[]> {
  const rows: HubSpotContactRow[] = []
  let after: string | undefined

  do {
    const query = new URLSearchParams({
      limit: '100',
      properties: CONTACT_PROPERTIES,
    })
    if (after) query.set('after', after)

    const page = await hubSpotFetch<HubSpotListResponse<HubSpotContact>>(
      token,
      `/crm/v3/objects/contacts?${query}`,
    )

    for (const item of page.results) {
      const p = item.properties
      rows.push({
        firstName: p.firstname || 'Unknown',
        lastName: p.lastname || '',
        email: p.email || undefined,
        company: p.company || undefined,
        jobTitle: p.jobtitle || undefined,
        phone: p.phone || undefined,
      })
    }

    after = page.paging?.next?.after
  } while (after)

  return rows
}

async function fetchAllDeals(token: string): Promise<HubSpotDealRow[]> {
  const rows: HubSpotDealRow[] = []
  let after: string | undefined

  do {
    const query = new URLSearchParams({
      limit: '100',
      properties: DEAL_PROPERTIES,
    })
    if (after) query.set('after', after)

    const page = await hubSpotFetch<HubSpotListResponse<HubSpotDeal>>(
      token,
      `/crm/v3/objects/deals?${query}`,
    )

    for (const item of page.results) {
      const p = item.properties
      if (!p.dealname) continue
      rows.push({
        title: p.dealname,
        stage: p.dealstage || undefined,
        amount: p.amount ? Number(p.amount) : undefined,
        closeDate: p.closedate || undefined,
      })
    }

    after = page.paging?.next?.after
  } while (after)

  return rows
}

export async function syncHubSpotIntegration(
  organizationId: string,
  userId: string,
  accessToken: string,
): Promise<CrmImportResult & { contactsFetched: number; dealsFetched: number }> {
  const [contacts, deals] = await Promise.all([
    fetchAllContacts(accessToken),
    fetchAllDeals(accessToken),
  ])

  const result = await importHubSpotData(organizationId, userId, {
    contacts,
    deals,
  })

  return {
    ...result,
    contactsFetched: contacts.length,
    dealsFetched: deals.length,
  }
}

export async function validateHubSpotToken(accessToken: string): Promise<boolean> {
  try {
    await hubSpotFetch<{ hub_id: number }>(
      accessToken,
      '/account-info/v3/details',
    )
    return true
  } catch {
    return false
  }
}
