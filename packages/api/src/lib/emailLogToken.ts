import crypto from 'crypto'

export function generateEmailLogToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function formatEmailLogAddress(token: string): string {
  const domain = process.env.EMAIL_LOG_DOMAIN ?? 'inbound.crm.local'
  return `crm+${token}@${domain}`
}

export function extractTokenFromAddress(address: string): string | null {
  const normalized = address.toLowerCase().trim()
  const plusMatch = normalized.match(/crm\+([a-f0-9]+)@/)
  if (plusMatch) return plusMatch[1]
  const localMatch = normalized.match(/^([a-f0-9]{32})@/)
  return localMatch?.[1] ?? null
}
