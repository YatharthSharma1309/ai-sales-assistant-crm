import crypto from 'crypto'
import { sendEmail } from './emailSend.js'
import { hashToken } from './authSession.js'

const EMAIL_CHANGE_TTL_HOURS = 24

export function generateEmailChangeToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  return { raw, hash: hashToken(raw) }
}

export function emailChangeExpiresAt(): Date {
  return new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 60 * 60 * 1000)
}

export function buildEmailChangeVerifyUrl(rawToken: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  return `${base}/verify-email-change?token=${encodeURIComponent(rawToken)}`
}

export async function sendEmailChangeVerification(
  to: string,
  verifyUrl: string,
): Promise<{ sent: boolean; message?: string }> {
  const result = await sendEmail({
    to,
    subject: 'Verify your new email — AI Sales Assistant CRM',
    body: [
      'You requested to change the email on your AI Sales Assistant CRM account.',
      '',
      'Confirm your new email address:',
      verifyUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  })
  return { sent: result.sent, message: result.message }
}

export async function sendEmailChangeNotification(
  to: string,
  newEmail: string,
): Promise<void> {
  try {
    await sendEmail({
      to,
      subject: 'Email change requested — AI Sales Assistant CRM',
      body: [
        `A request was made to change your account email to ${newEmail}.`,
        '',
        'If this was not you, sign in and change your password immediately.',
      ].join('\n'),
    })
  } catch {
    // Notification to the old address is best-effort.
  }
}
