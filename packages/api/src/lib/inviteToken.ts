import crypto from 'crypto'

const INVITE_EXPIRY_HOURS = Number(process.env.INVITE_EXPIRY_HOURS ?? 168)

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  return { raw, hash: hashInviteToken(raw) }
}

export function hashInviteToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function inviteExpiresAt(): Date {
  return new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)
}

export function buildInviteAcceptUrl(rawToken: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  return `${base}/invite/accept?token=${encodeURIComponent(rawToken)}`
}
