import { sendEmail } from './emailSend.js'
import { buildTeamInviteEmail } from './teamInviteEmail.js'

export async function sendTeamInviteEmail(opts: {
  to: string
  inviterName: string
  organizationName: string
  role: string
  inviteUrl: string
  expiresAt: Date
}): Promise<{ sent: boolean; message?: string }> {
  const { subject, body } = buildTeamInviteEmail(opts)
  const result = await sendEmail({ to: opts.to, subject, body })
  return { sent: result.sent, message: result.message }
}
