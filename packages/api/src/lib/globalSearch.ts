import { prisma } from './prisma.js'
import { isManagerRole, type OrgRole } from './rbac.js'

export type SearchResultItem = {
  type: 'lead' | 'contact' | 'account' | 'deal'
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function globalSearch(opts: {
  organizationId: string
  userId: string
  role: OrgRole
  q: string
  limit?: number
}): Promise<SearchResultItem[]> {
  const q = opts.q.trim()
  if (q.length < 2) return []

  const limit = Math.min(opts.limit ?? 20, 50)
  const perType = Math.ceil(limit / 4)

  const leadWhere = {
    organizationId: opts.organizationId,
    ...(opts.role === 'REP' ? { assignedToId: opts.userId } : {}),
    OR: [
      { title: { contains: q } },
      { source: { contains: q } },
      { notes: { contains: q } },
    ],
  }

  const dealWhere = {
    organizationId: opts.organizationId,
    ...(opts.role === 'REP'
      ? { assignedToId: opts.userId }
      : {}),
    OR: [{ title: { contains: q } }, { riskNote: { contains: q } }],
  }

  const contactWhere = {
    organizationId: opts.organizationId,
    OR: [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
    ],
  }

  const accountWhere = {
    organizationId: opts.organizationId,
    OR: [{ name: { contains: q } }, { industry: { contains: q } }],
  }

  const [leads, contacts, accounts, deals] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: { id: true, title: true, status: true },
      take: perType,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.contact.findMany({
      where: contactWhere,
      select: { id: true, firstName: true, lastName: true, email: true },
      take: perType,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.account.findMany({
      where: accountWhere,
      select: { id: true, name: true, industry: true },
      take: perType,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.deal.findMany({
      where: dealWhere,
      select: { id: true, title: true, stage: true },
      take: perType,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const results: SearchResultItem[] = [
    ...leads.map((l) => ({
      type: 'lead' as const,
      id: l.id,
      title: l.title,
      subtitle: l.status,
      href: `/leads/${l.id}`,
    })),
    ...contacts.map((c) => ({
      type: 'contact' as const,
      id: c.id,
      title: `${c.firstName} ${c.lastName}`.trim(),
      subtitle: c.email ?? undefined,
      href: `/contacts/${c.id}`,
    })),
    ...accounts.map((a) => ({
      type: 'account' as const,
      id: a.id,
      title: a.name,
      subtitle: a.industry ?? undefined,
      href: `/accounts/${a.id}`,
    })),
    ...deals.map((d) => ({
      type: 'deal' as const,
      id: d.id,
      title: d.title,
      subtitle: d.stage,
      href: `/pipeline/${d.id}`,
    })),
  ]

  return results.slice(0, limit)
}
