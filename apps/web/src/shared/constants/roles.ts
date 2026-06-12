export type OrgRole = 'ADMIN' | 'MANAGER' | 'REP'

export const ROLE_LABELS: Record<OrgRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  REP: 'Sales Rep',
}

export function isManager(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN'
}
