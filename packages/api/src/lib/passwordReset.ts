import crypto from 'crypto'
import { sendEmail } from './emailSend.js'
import { hashToken } from './authSession.js'

const PASSWORD_RESET_TTL_HOURS = 1

export function generatePasswordResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  return { raw, hash: hashToken(raw) }
}

export function passwordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000)
}

export function buildPasswordResetUrl(rawToken: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:5173'
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<{ sent: boolean; message?: string }> {
  try {
    const result = await sendEmail({
      to,
      subject: 'Reset your password — AI Sales Assistant CRM',
      body: [
        'You requested a password reset for your AI Sales Assistant CRM account.',
        '',
        'Reset your password (link expires in 1 hour):',
        resetUrl,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
    })
    return { sent: result.sent, message: result.message }
  } catch (err) {
    return {
      sent: false,
      message: err instanceof Error ? err.message : 'Email send failed',
    }
  }
}
