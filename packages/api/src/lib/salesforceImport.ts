import type { DealStage, LeadStatus } from '@prisma/client'
import { columnIndex, parseCsvRows } from './csvParse.js'
import {
  importCrmData,
  type CrmContactRow,
  type CrmDealRow,
  type CrmLeadRow,
  type CrmImportResult,
} from './crmImport.js'

const SALESFORCE_STAGE_MAP: Record<string, DealStage> = {
  prospecting: 'DISCOVERY',
  qualification: 'DISCOVERY',
  needsanalysis: 'DISCOVERY',
  valueproposition: 'DEMO_SCHEDULED',
  iddecisionmakers: 'PROPOSAL',
  perceptionanalysis: 'PROPOSAL',
  proposalpricequote: 'PROPOSAL',
  negotiationreview: 'NEGOTIATION',
  closedwon: 'CLOSED_WON',
  closedlost: 'CLOSED_LOST',
}

const SALESFORCE_LEAD_STATUS_MAP: Record<string, LeadStatus> = {
  opennotcontacted: 'NEW',
  workingcontacted: 'CONTACTED',
  closedconverted: 'QUALIFIED',
  closednotconverted: 'UNQUALIFIED',
}

function normalizeKey(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[\s_\-/().]/g, '')
}

export function mapSalesforceStage(stage?: string): DealStage {
  if (!stage) return 'DISCOVERY'
  return SALESFORCE_STAGE_MAP[normalizeKey(stage)] ?? 'DISCOVERY'
}

function mapSalesforceLeadStatus(status?: string): LeadStatus {
  if (!status) return 'NEW'
  return SALESFORCE_LEAD_STATUS_MAP[normalizeKey(status)] ?? 'NEW'
}

export function parseSalesforceContactsCsv(text: string): CrmContactRow[] {
  const { headers, rows } = parseCsvRows(text)
  if (headers.length === 0) return []

  const firstIdx = columnIndex(headers, [
    'first name',
    'firstname',
    'first',
  ])
  const lastIdx = columnIndex(headers, ['last name', 'lastname', 'last'])
  const emailIdx = columnIndex(headers, ['email', 'email address'])
  const companyIdx = columnIndex(headers, [
    'account name',
    'company',
    'company name',
    'account',
  ])
  const titleIdx = columnIndex(headers, ['title', 'job title', 'jobtitle'])
  const phoneIdx = columnIndex(headers, ['phone', 'mobile phone', 'phone number'])

  if (firstIdx < 0 && lastIdx < 0 && emailIdx < 0) {
    throw new Error('CSV must include First Name, Last Name, or Email columns')
  }

  return rows.map((cols) => {
    const firstName = firstIdx >= 0 ? cols[firstIdx] : ''
    const lastName = lastIdx >= 0 ? cols[lastIdx] : ''
    const row: CrmContactRow = {
      firstName: firstName || 'Unknown',
      lastName: lastName || '',
    }
    if (emailIdx >= 0 && cols[emailIdx]) row.email = cols[emailIdx]
    if (companyIdx >= 0 && cols[companyIdx]) row.company = cols[companyIdx]
    if (titleIdx >= 0 && cols[titleIdx]) row.jobTitle = cols[titleIdx]
    if (phoneIdx >= 0 && cols[phoneIdx]) row.phone = cols[phoneIdx]
    return row
  })
}

export function parseSalesforceLeadsCsv(text: string): CrmLeadRow[] {
  const { headers, rows } = parseCsvRows(text)
  if (headers.length === 0) return []

  const titleIdx = columnIndex(headers, [
    'lead name',
    'name',
    'company',
    'company name',
  ])
  if (titleIdx < 0) {
    throw new Error('CSV must include Lead Name or Company column')
  }

  const firstIdx = columnIndex(headers, ['first name', 'firstname'])
  const lastIdx = columnIndex(headers, ['last name', 'lastname'])
  const emailIdx = columnIndex(headers, ['email', 'email address'])
  const companyIdx = columnIndex(headers, ['company', 'company name', 'account name'])
  const sourceIdx = columnIndex(headers, ['lead source', 'leadsource', 'source'])
  const statusIdx = columnIndex(headers, ['lead status', 'status'])
  const notesIdx = columnIndex(headers, ['description', 'notes'])

  return rows.map((cols) => {
    const firstName = firstIdx >= 0 ? cols[firstIdx] : undefined
    const lastName = lastIdx >= 0 ? cols[lastIdx] : undefined
    const company = companyIdx >= 0 ? cols[companyIdx] : undefined

    let title = cols[titleIdx]
    if (!title && company) {
      title = company
      if (firstName || lastName) {
        title = `${company} — ${firstName ?? ''} ${lastName ?? ''}`.trim()
      }
    }

    const row: CrmLeadRow = { title: title || 'Imported Lead' }
    if (firstName) row.firstName = firstName
    if (lastName) row.lastName = lastName
    if (emailIdx >= 0 && cols[emailIdx]) row.email = cols[emailIdx]
    if (company) row.company = company
    if (sourceIdx >= 0 && cols[sourceIdx]) row.source = cols[sourceIdx]
    if (statusIdx >= 0 && cols[statusIdx]) {
      row.status = mapSalesforceLeadStatus(cols[statusIdx])
    }
    if (notesIdx >= 0 && cols[notesIdx]) row.notes = cols[notesIdx]
    return row
  })
}

export function parseSalesforceOpportunitiesCsv(text: string): CrmDealRow[] {
  const { headers, rows } = parseCsvRows(text)
  if (headers.length === 0) return []

  const titleIdx = columnIndex(headers, [
    'opportunity name',
    'opportunityname',
    'deal name',
    'name',
  ])
  if (titleIdx < 0) {
    throw new Error('CSV must include Opportunity Name column')
  }

  const stageIdx = columnIndex(headers, ['stage', 'opportunity stage', 'deal stage'])
  const amountIdx = columnIndex(headers, ['amount', 'arr', 'deal amount'])
  const closeIdx = columnIndex(headers, [
    'close date',
    'closedate',
    'expected close date',
  ])
  const emailIdx = columnIndex(headers, [
    'contact email',
    'primary contact email',
    'email',
  ])
  const companyIdx = columnIndex(headers, [
    'account name',
    'account',
    'company',
  ])

  return rows.map((cols) => {
    const row: CrmDealRow = { title: cols[titleIdx] }
    if (stageIdx >= 0 && cols[stageIdx]) row.stage = cols[stageIdx]
    if (amountIdx >= 0 && cols[amountIdx]) {
      row.amount = Number(cols[amountIdx].replace(/[^0-9.]/g, '')) || undefined
    }
    if (closeIdx >= 0 && cols[closeIdx]) row.closeDate = cols[closeIdx]
    if (emailIdx >= 0 && cols[emailIdx]) row.contactEmail = cols[emailIdx]
    if (companyIdx >= 0 && cols[companyIdx]) row.company = cols[companyIdx]
    return row
  })
}

export async function importSalesforceData(
  organizationId: string,
  userId: string,
  data: {
    contacts?: CrmContactRow[]
    leads?: CrmLeadRow[]
    deals?: CrmDealRow[]
  },
): Promise<CrmImportResult> {
  return importCrmData(organizationId, userId, data, {
    leadSource: 'Salesforce Import',
    mapDealStage: mapSalesforceStage,
    mapLeadStatus: mapSalesforceLeadStatus,
  })
}
