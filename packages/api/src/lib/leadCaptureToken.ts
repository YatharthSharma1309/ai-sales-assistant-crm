import crypto from 'crypto'

export function generateLeadCaptureToken(): string {
  return crypto.randomBytes(24).toString('hex')
}

export function buildLeadCaptureUrl(slug: string, token: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  return `${base}/capture/${slug}?token=${encodeURIComponent(token)}`
}
