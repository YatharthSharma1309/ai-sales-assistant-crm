import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { protectedMiddleware } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { isManagerRole } from '../lib/rbac.js'
import { parseMeetingActivityBody } from '../lib/meetingSummary.js'

const router = Router()
router.use(protectedMiddleware)

router.get('/', async (req, res) => {
  const orgId = req.auth!.organizationId
  const userId = req.auth!.userId

  const repFilter: Prisma.ActivityWhereInput = isManagerRole(req.auth!.role)
    ? {}
    : {
        OR: [
          { createdById: userId },
          { lead: { assignedToId: userId } },
          { deal: { assignedToId: userId } },
        ],
      }

  const meetings = await prisma.activity.findMany({
    where: {
      organizationId: orgId,
      type: 'MEETING',
      ...repFilter,
    },
    include: {
      contact: true,
      lead: true,
      deal: true,
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  res.json(
    meetings.map((m) => ({
      id: m.id,
      title: m.title,
      createdAt: m.createdAt,
      contact: m.contact,
      lead: m.lead,
      deal: m.deal,
      createdBy: m.createdBy,
      summary: parseMeetingActivityBody(m.body),
    })),
  )
})

export default router
