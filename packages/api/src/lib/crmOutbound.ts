import type { Contact, Deal } from '@prisma/client'
import { prisma } from './prisma.js'
import { getValidHubSpotAccessToken } from './hubspotOAuth.js'
import { HUBSPOT_SOURCE } from './crmExternalSync.js'

const STAGE_TO_HUBSPOT: Record<string, string> = {
  DISCOVERY: 'qualifiedtobuy',
  DEMO_SCHEDULED: 'presentationscheduled',
  TRIAL: 'qualifiedtobuy',
  PROPOSAL: 'decisionmakerboughtin',
  NEGOTIATION: 'contractsent',
  CLOSED_WON: 'closedwon',
  CLOSED_LOST: 'closedlost',
}

async function hubSpotIntegrationForOrg(organizationId: string) {
  return prisma.integration.findFirst({
    where: { organizationId, provider: 'HUBSPOT' },
  })
}

async function hubSpotApi(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown,
) {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HubSpot ${method} ${path}: ${response.status} ${text}`)
  }
  if (response.status === 204) return null
  return response.json()
}

export async function pushContactToHubSpot(contact: Contact): Promise<boolean> {
  if (contact.externalSource !== HUBSPOT_SOURCE || !contact.externalId) {
    return false
  }

  const integration = await hubSpotIntegrationForOrg(contact.organizationId)
  if (!integration) return false

  const token = await getValidHubSpotAccessToken(integration.id)

  await hubSpotApi(
    token,
    'PATCH',
    `/crm/v3/objects/contacts/${contact.externalId}`,
    {
      properties: {
        firstname: contact.firstName,
        lastname: contact.lastName,
        email: contact.email ?? '',
        jobtitle: contact.jobTitle ?? '',
        phone: contact.phone ?? '',
      },
    },
  )

  return true
}

export async function pushDealToHubSpot(deal: Deal): Promise<boolean> {
  if (deal.externalSource !== HUBSPOT_SOURCE || !deal.externalId) {
    return false
  }

  const integration = await hubSpotIntegrationForOrg(deal.organizationId)
  if (!integration) return false

  const token = await getValidHubSpotAccessToken(integration.id)
  const hubspotStage = STAGE_TO_HUBSPOT[deal.stage] ?? 'qualifiedtobuy'

  await hubSpotApi(token, 'PATCH', `/crm/v3/objects/deals/${deal.externalId}`, {
    properties: {
      dealname: deal.title,
      dealstage: hubspotStage,
      amount: deal.arr != null ? String(deal.arr) : '',
      closedate: deal.closeDate
        ? deal.closeDate.toISOString().slice(0, 10)
        : '',
    },
  })

  return true
}

export async function pushDealToSalesforce(deal: Deal): Promise<boolean> {
  if (deal.externalSource !== 'SALESFORCE' || !deal.externalId) {
    return false
  }

  const integration = await prisma.integration.findFirst({
    where: { organizationId: deal.organizationId, provider: 'SALESFORCE' },
  })
  if (!integration) return false

  const metadata = integration.metadata as { instanceUrl?: string } | null
  if (!metadata?.instanceUrl) return false

  const baseUrl = metadata.instanceUrl.replace(/\/$/, '')
  const response = await fetch(
    `${baseUrl}/services/data/v59.0/sobjects/Opportunity/${deal.externalId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Name: deal.title,
        StageName: deal.stage,
        Amount: deal.arr,
        CloseDate: deal.closeDate
          ? deal.closeDate.toISOString().slice(0, 10)
          : undefined,
      }),
    },
  )

  return response.ok
}
