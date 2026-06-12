import type { DealStage } from '@prisma/client'
import { columnIndex, parseCsvRows } from './csvParse.js'
import {
  importCrmData,
  type CrmContactRow,
  type CrmDealRow,
  type CrmImportResult,
} from './crmImport.js'

export type { CrmImportResult }

export type HubSpotContactRow = CrmContactRow
export type HubSpotDealRow = CrmDealRow

const HUBSPOT_STAGE_MAP: Record<string, DealStage> = {
  appointmentscheduled: 'DEMO_SCHEDULED',
  qualifiedtobuy: 'DISCOVERY',
  presentationscheduled: 'DEMO_SCHEDULED',
  decisionmakerboughtin: 'PROPOSAL',
  contractsent: 'NEGOTIATION',
  closedwon: 'CLOSED_WON',
  closedlost: 'CLOSED_LOST',
}

export function mapHubSpotStage(stage?: string): DealStage {
  if (!stage) return 'DISCOVERY'
  const key = stage.toLowerCase().replace(/[\s_-]/g, '')
  return HUBSPOT_STAGE_MAP[key] ?? 'DISCOVERY'
}

export function parseHubSpotContactsCsv(text: string): HubSpotContactRow[] {
  const { headers, rows } = parseCsvRows(text)
  if (headers.length === 0) return []

  const firstIdx = columnIndex(headers, ['first name', 'firstname', 'first'])
  const lastIdx = columnIndex(headers, ['last name', 'lastname', 'last'])
  const emailIdx = columnIndex(headers, ['email', 'email address'])
  const companyIdx = columnIndex(headers, ['company name', 'company', 'associated company'])
  const titleIdx = columnIndex(headers, ['job title', 'jobtitle', 'title'])
  const phoneIdx = columnIndex(headers, ['phone number', 'phone', 'mobile phone'])

  if (firstIdx < 0 && lastIdx < 0 && emailIdx < 0) {
    throw new Error('CSV must include First Name, Last Name, or Email columns')
  }

  return rows.map((cols) => {
    const firstName = firstIdx >= 0 ? cols[firstIdx] : ''
    const lastName = lastIdx >= 0 ? cols[lastIdx] : ''
    const row: HubSpotContactRow = {
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

export function parseHubSpotDealsCsv(text: string): HubSpotDealRow[] {
  const { headers, rows } = parseCsvRows(text)
  if (headers.length === 0) return []

  const titleIdx = columnIndex(headers, ['deal name', 'dealname', 'title'])
  if (titleIdx < 0) throw new Error('CSV must include Deal Name column')

  const stageIdx = columnIndex(headers, ['deal stage', 'stage', 'pipeline stage'])
  const amountIdx = columnIndex(headers, ['amount', 'deal amount', 'arr'])
  const closeIdx = columnIndex(headers, ['close date', 'closedate', 'expected close date'])
  const emailIdx = columnIndex(headers, ['associated contact email', 'contact email', 'email'])
  const companyIdx = columnIndex(headers, ['company name', 'company', 'associated company'])

  return rows.map((cols) => {
    const row: HubSpotDealRow = { title: cols[titleIdx] }
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

export async function importHubSpotData(
  organizationId: string,
  userId: string,
  data: { contacts?: HubSpotContactRow[]; deals?: HubSpotDealRow[] },
): Promise<CrmImportResult> {
  return importCrmData(organizationId, userId, data, {
    leadSource: 'HubSpot Import',
    mapDealStage: mapHubSpotStage,
  })
}
