import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockContactFindFirst } = vi.hoisted(() => ({
  mockContactFindFirst: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    contact: { findFirst: mockContactFindFirst },
    account: { findFirst: vi.fn() },
    deal: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn() },
  },
}))

import {
  assertUniqueContactEmail,
  OrgValidationError,
} from '../lib/orgValidation.js'

describe('orgValidation', () => {
  beforeEach(() => {
    mockContactFindFirst.mockReset()
  })

  it('allows unique contact email', async () => {
    mockContactFindFirst.mockResolvedValue(null)
    await expect(
      assertUniqueContactEmail('org-1', 'jane@acme.com'),
    ).resolves.toBeUndefined()
  })

  it('rejects duplicate contact email in org', async () => {
    mockContactFindFirst.mockResolvedValue({ id: 'c-1' })
    await expect(
      assertUniqueContactEmail('org-1', 'jane@acme.com'),
    ).rejects.toBeInstanceOf(OrgValidationError)
  })

  it('skips check for empty email', async () => {
    await assertUniqueContactEmail('org-1', null)
    expect(mockContactFindFirst).not.toHaveBeenCalled()
  })

  it('excludes current contact on update', async () => {
    mockContactFindFirst.mockResolvedValue(null)
    await assertUniqueContactEmail('org-1', 'jane@acme.com', 'c-2')
    expect(mockContactFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: 'jane@acme.com',
        NOT: { id: 'c-2' },
      },
    })
  })
})
