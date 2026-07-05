export type SendEmailInput = {
  to: string
  subject: string
  body: string
  from?: string
  bcc?: string[]
}

export type SendEmailResult = {
  sent: boolean
  provider: 'resend' | 'mock'
  message?: string
  id?: string
}

function isDevSoftFailEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

async function resendErrorResult(
  input: SendEmailInput,
  message: string,
): Promise<SendEmailResult> {
  if (isDevSoftFailEnabled()) {
    const { logger } = await import('./logger.js')
    logger.warn('email_send_soft_fail', {
      to: input.to,
      subject: input.subject,
      message,
    })
    return { sent: false, provider: 'resend', message }
  }
  throw new Error(message)
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    input.from ??
    process.env.RESEND_FROM_EMAIL ??
    'onboarding@resend.dev'

  if (!apiKey) {
    return {
      sent: false,
      provider: 'mock',
      message:
        'Set RESEND_API_KEY and RESEND_FROM_EMAIL to send emails. Draft copied only.',
    }
  }

  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        ...(input.bcc?.length ? { bcc: input.bcc } : {}),
        subject: input.subject,
        text: input.body,
      }),
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Resend request failed'
    return resendErrorResult(input, message)
  }

  if (!response.ok) {
    const err = await response.text()
    return resendErrorResult(input, `Resend error: ${response.status} ${err}`)
  }

  const data = (await response.json()) as { id: string }
  return { sent: true, provider: 'resend', id: data.id }
}
