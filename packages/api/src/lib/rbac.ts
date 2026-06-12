import type { Request, Response, NextFunction } from 'express'

export type OrgRole = 'ADMIN' | 'MANAGER' | 'REP'

/**
 * Role matrix (enforced via requireRole + membershipMiddleware DB role):
 * - ADMIN: full org control, team mutations, org settings, email-log token
 * - MANAGER: team list/view, CRM reassign, manager dashboard; invite REP only
 * - REP: own assigned leads/deals, profile; no team or org admin APIs
 */

export function requireRole(...allowed: OrgRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role as OrgRole | undefined
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export function isManagerRole(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}
