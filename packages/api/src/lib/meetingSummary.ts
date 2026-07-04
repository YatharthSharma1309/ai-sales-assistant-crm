import { z } from 'zod'
import { openRouterChatCompletion } from './openRouter.js'

export const meetingSummaryResultSchema = z.object({
  summary: z.string(),
  painPoints: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  nextSteps: z.array(z.string()).default([]),
  actionItems: z
    .array(
      z.object({
        title: z.string(),
        dueInDays: z.number().optional(),
      }),
    )
    .default([]),
  suggestedFollowUpAngle: z.string().default(''),
})

export type MeetingSummaryResult = z.infer<typeof meetingSummaryResultSchema>

export function buildMockMeetingSummary(
  transcript: string,
  title?: string,
): MeetingSummaryResult {
  const preview = transcript.slice(0, 120).trim()
  const lines = transcript
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const actionItems = lines
    .filter((l) => /^(-|\*|•|\d+\.)\s/.test(l) || /action|follow up|send|schedule/i.test(l))
    .slice(0, 4)
    .map((l) => ({
      title: l.replace(/^(-|\*|•|\d+\.)\s*/, '').slice(0, 120),
      dueInDays: 3,
    }))

  if (actionItems.length === 0) {
    actionItems.push(
      { title: 'Send follow-up email recap', dueInDays: 1 },
      { title: 'Share pricing or proposal if discussed', dueInDays: 3 },
    )
  }

  return {
    summary: title
      ? `Summary of "${title}": The conversation covered key topics from the call. ${preview}${transcript.length > 120 ? '…' : ''}`
      : `Call summary: ${preview}${transcript.length > 120 ? '…' : ''}`,
    painPoints: [
      'Manual workflows slowing the team down',
      'Need better visibility into pipeline',
    ],
    objections: ['Budget timing — may need to wait until next quarter'],
    nextSteps: [
      'Send recap email with agreed next steps',
      'Schedule technical demo with broader team',
    ],
    actionItems,
    suggestedFollowUpAngle:
      'Reference the pain points discussed and propose a short demo focused on their top priority.',
  }
}

export async function generateMeetingSummaryWithAI(
  transcript: string,
  title: string | undefined,
  context: Record<string, unknown>,
): Promise<MeetingSummaryResult> {
  const content = await openRouterChatCompletion(
    [
      {
        role: 'system',
        content: `You analyze B2B SaaS sales call notes/transcripts.
Return JSON with keys: summary (string), painPoints (string[]), objections (string[]), nextSteps (string[]), actionItems (array of {title, dueInDays}), suggestedFollowUpAngle (string).
Keep actionItems concrete and assign dueInDays 1-14.`,
      },
      {
        role: 'user',
        content: JSON.stringify({ title, transcript, context }),
      },
    ],
    { jsonMode: true },
  )

  const parsed = meetingSummaryResultSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    throw new Error('Invalid meeting summary response from OpenRouter')
  }
  return parsed.data
}

export function formatMeetingActivityBody(
  result: MeetingSummaryResult,
  transcript: string,
): string {
  return JSON.stringify({
    ...result,
    transcriptPreview: transcript.slice(0, 500),
  })
}

export function parseMeetingActivityBody(body: string | null): MeetingSummaryResult | null {
  if (!body) return null
  try {
    return JSON.parse(body) as MeetingSummaryResult
  } catch {
    return null
  }
}
