const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'
}

export async function openRouterChatCompletion(
  messages: ChatMessage[],
  options?: { jsonMode?: boolean },
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const siteUrl = process.env.OPENROUTER_SITE_URL ?? process.env.FRONTEND_URL
  const siteName = process.env.OPENROUTER_SITE_NAME ?? 'AI Sales Assistant CRM'
  if (siteUrl) headers['HTTP-Referer'] = siteUrl
  if (siteName) headers['X-OpenRouter-Title'] = siteName

  const body: Record<string, unknown> = {
    model: getOpenRouterModel(),
    messages,
  }
  if (options?.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(
      `OpenRouter error: ${response.status}${errText ? ` — ${errText.slice(0, 200)}` : ''}`,
    )
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  const content = data.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenRouter returned empty response')
  }
  return content
}
