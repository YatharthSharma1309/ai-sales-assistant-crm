import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  accountFindFirst: vi.fn(),
  accountCreate: vi.fn(),
  contactFindFirst: vi.fn(),
  contactCreate: vi.fn(),
  leadFindFirst: vi.fn(),
  leadCreate: vi.fn(),
  dealFindFirst: vi.fn(),
  dealCreate: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    account: {
      findFirst: mocks.accountFindFirst,
      create: mocks.accountCreate,
    },
    contact: {
      findFirst: mocks.contactFindFirst,
      create: mocks.contactCreate,
    },
    lead: {
      findFirst: mocks.leadFindFirst,
      create: mocks.leadCreate,
    },
    deal: {
      findFirst: mocks.dealFindFirst,
      create: mocks.dealCreate,
    },
  },
}))

import { importCrmData } from '../lib/crmImport.js'

const defaultOptions = {
  leadSource: 'hubspot',
  mapDealStage: (stage?: string) => {
    if (stage?.toLowerCase() === 'negotiation') return 'NEGOTIATION' as const
    return 'DISCOVERY' as const
  },
}

describe('crmImport', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset())
    mocks.accountFindFirst.mockResolvedValue(null)
    mocks.accountCreate.mockImplementation(async (args) => ({
      id: 'acc-1',
      ...args.data,
    }))
    mocks.contactFindFirst.mockResolvedValue(null)
    mocks.contactCreate.mockImplementation(async (args) => ({
      id: 'con-1',
      ...args.data,
    }))
    mocks.leadFindFirst.mockResolvedValue(null)
    mocks.leadCreate.mockResolvedValue({ id: 'lead-1' })
    mocks.dealFindFirst.mockResolvedValue(null)
    mocks.dealCreate.mockResolvedValue({ id: 'deal-1' })
  })

  it('skips duplicate leads', async () => {
    mocks.leadFindFirst.mockResolvedValue({ id: 'existing-lead' })

    const result = await importCrmData(
      'org-1',
      'user-1',
      {
        contacts: [
          { firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com' },
        ],
      },
      defaultOptions,
    )

    expect(result.leadsSkipped).toBe(1)
    expect(result.leadsCreated).toBe(0)
    expect(mocks.leadCreate).not.toHaveBeenCalled()
  })

  it('skips duplicate deals by title', async () => {
    mocks.dealFindFirst.mockResolvedValue({ id: 'existing-deal' })

    const result = await importCrmData(
      'org-1',
      'user-1',
      {
        deals: [{ title: 'Enterprise Plan', stage: 'Negotiation' }],
      },
      defaultOptions,
    )

    expect(result.dealsSkipped).toBe(1)
    expect(result.dealsCreated).toBe(0)
    expect(mocks.dealCreate).not.toHaveBeenCalled()
  })

  it('warns on unmapped deal stages', async () => {
    const result = await importCrmData(
      'org-1',
      'user-1',
      {
        deals: [{ title: 'Big Deal', stage: 'Custom Stage' }],
      },
      defaultOptions,
    )

    expect(result.warnings).toContain(
      'Unmapped deal stage "Custom Stage" for "Big Deal"',
    )
    expect(result.dealsCreated).toBe(1)
  })
})
