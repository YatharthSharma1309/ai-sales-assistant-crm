import type { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma.js'
import type { OrgRole } from './rbac.js'

export async function membershipMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: req.auth.organizationId,
        userId: req.auth.userId,
      },
    },
  })

  if (!membership) {
    res.status(401).json({ error: 'Membership not found' })
    return
  }

  req.auth.role = membership.role as OrgRole
  next()
}
