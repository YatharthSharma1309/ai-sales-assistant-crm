import crypto from 'crypto'
import type { Request } from 'express'

export function verifySalesforceWebhookSignature(
  req: Request,
  rawBody: string,
  secret: string,
): boolean {
  const signature = req.headers['x-salesforce-signature']
  if (typeof signature !== 'string') return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false
  }
}
