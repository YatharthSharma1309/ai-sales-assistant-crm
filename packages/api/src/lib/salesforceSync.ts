import { importSalesforceData } from './salesforceImport.js'
import type { CrmImportResult } from './crmImport.js'
import type { CrmContactRow, CrmDealRow, CrmLeadRow } from './crmImport.js'

type SalesforceQueryResult<T> = {
  records: T[]
  done: boolean
  nextRecordsUrl?: string
}

type SfContact = {
  Id: string
  FirstName?: string
  LastName?: string
  Email?: string
  Title?: string
  Phone?: string
  Account?: { Name?: string }
}

type SfLead = {
  Id: string
  Company?: string
  FirstName?: string
  LastName?: string
  Email?: string
  Status?: string
  LeadSource?: string
}

type SfOpportunity = {
  Id: string
  Name: string
  StageName?: string
  Amount?: number
  CloseDate?: string
}

async function sfQuery<T>(
  instanceUrl: string,
  accessToken: string,
  soql: string,
): Promise<T[]> {
  const records: T[] = []
  let path = `/services/data/v59.0/query?q=${encodeURIComponent(soql)}`

  while (path) {
    const response = await fetch(`${instanceUrl}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Salesforce API error ${response.status}: ${body}`)
    }
    const page = (await response.json()) as SalesforceQueryResult<T>
    records.push(...page.records)
    path = page.done || !page.nextRecordsUrl ? '' : page.nextRecordsUrl
  }

  return records
}

export async function syncSalesforceIntegration(
  organizationId: string,
  userId: string,
  accessToken: string,
  instanceUrl: string,
): Promise<
  CrmImportResult & {
    contactsFetched: number
    leadsFetched: number
    dealsFetched: number
  }
> {
  const baseUrl = instanceUrl.replace(/\/$/, '')

  const [sfContacts, sfLeads, sfOpps] = await Promise.all([
    sfQuery<SfContact>(
      baseUrl,
      accessToken,
      'SELECT Id, FirstName, LastName, Email, Title, Phone, Account.Name FROM Contact LIMIT 500',
    ),
    sfQuery<SfLead>(
      baseUrl,
      accessToken,
      'SELECT Id, Company, FirstName, LastName, Email, Status, LeadSource FROM Lead LIMIT 500',
    ),
    sfQuery<SfOpportunity>(
      baseUrl,
      accessToken,
      'SELECT Id, Name, StageName, Amount, CloseDate FROM Opportunity LIMIT 500',
    ),
  ])

  const contacts: CrmContactRow[] = sfContacts.map((c) => ({
    firstName: c.FirstName || 'Unknown',
    lastName: c.LastName || '',
    email: c.Email,
    jobTitle: c.Title,
    phone: c.Phone,
    company: c.Account?.Name,
  }))

  const leads: CrmLeadRow[] = sfLeads.map((l) => ({
    title: l.Company || `${l.FirstName ?? ''} ${l.LastName ?? ''}`.trim() || 'Lead',
    source: l.LeadSource,
    status: undefined,
    notes: l.Status,
    firstName: l.FirstName,
    lastName: l.LastName,
    email: l.Email,
    company: l.Company,
  }))

  const deals: CrmDealRow[] = sfOpps.map((o) => ({
    title: o.Name,
    stage: o.StageName,
    amount: o.Amount,
    closeDate: o.CloseDate,
  }))

  const result = await importSalesforceData(organizationId, userId, {
    contacts,
    leads,
    deals,
  })

  return {
    ...result,
    contactsFetched: contacts.length,
    leadsFetched: leads.length,
    dealsFetched: deals.length,
  }
}

export async function validateSalesforceCredentials(
  accessToken: string,
  instanceUrl: string,
): Promise<boolean> {
  try {
    const baseUrl = instanceUrl.replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return response.ok
  } catch {
    return false
  }
}
