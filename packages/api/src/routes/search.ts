import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { globalSearch } from '../lib/globalSearch.js'
import type { OrgRole } from '../lib/rbac.js'

const router = Router()
router.use(protectedMiddleware)

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : ''
  const results = await globalSearch({
    organizationId: req.auth!.organizationId,
    userId: req.auth!.userId,
    role: req.auth!.role as OrgRole,
    q,
  })
  res.json({ results })
})

export default router
