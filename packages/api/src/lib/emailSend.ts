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

  const response = await fetch('https://api.resend.com/emails', {
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

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Resend error: ${response.status} ${err}`)
  }

  const data = (await response.json()) as { id: string }
  return { sent: true, provider: 'resend', id: data.id }
}
