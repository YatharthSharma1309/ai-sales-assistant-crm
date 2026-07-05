import type { Request, Response, NextFunction } from 'express'
import { createRequestId, logger } from '../lib/logger.js'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = createRequestId()
  res.locals.requestId = requestId
  const start = Date.now()

  res.on('finish', () => {
    if (req.path === '/api/health') return
    logger.info('request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      orgId: (req as { auth?: { organizationId?: string } }).auth?.organizationId,
      userId: (req as { auth?: { userId?: string } }).auth?.userId,
    })
  })

  next()
}
