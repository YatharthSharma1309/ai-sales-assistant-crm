export type EmailQualityFactor = {
  label: string
  score: number
  max: number
}

export type EmailQualityResult = {
  score: number
  factors: EmailQualityFactor[]
  label: 'Excellent' | 'Good' | 'Needs work' | 'Poor'
}

export function scoreEmailDraft(input: {
  subject: string
  body: string
  contactName?: string
  companyName?: string
}): EmailQualityResult {
  const factors: EmailQualityFactor[] = []
  let total = 0
  let maxTotal = 0

  function add(label: string, score: number, max: number) {
    factors.push({ label, score, max })
    total += score
    maxTotal += max
  }

  const subjectLen = input.subject.trim().length
  const subjectScore =
    subjectLen >= 20 && subjectLen <= 60 ? 20 : subjectLen >= 10 ? 12 : 5
  add('Subject length (20–60 chars ideal)', subjectScore, 20)

  const bodyWords = input.body.trim().split(/\s+/).filter(Boolean).length
  const lengthScore =
    bodyWords >= 40 && bodyWords <= 180
      ? 25
      : bodyWords >= 20
        ? 15
        : bodyWords >= 10
          ? 8
          : 3
  add('Body length (40–180 words ideal)', lengthScore, 25)

  const name = input.contactName?.split(' ')[0]
  const hasPersonalization =
    Boolean(name && input.body.toLowerCase().includes(name.toLowerCase())) ||
    Boolean(
      input.companyName &&
        input.body.toLowerCase().includes(input.companyName.toLowerCase()),
    )
  add('Personalization (name or company)', hasPersonalization ? 25 : 5, 25)

  const spamPatterns = /\b(free!!!|act now|limited time|click here)\b/i
  const spamFree = !spamPatterns.test(input.body) && !spamPatterns.test(input.subject)
  add('Avoid spam trigger phrases', spamFree ? 15 : 0, 15)

  const hasQuestion = /\?/.test(input.body)
  const hasCta =
    /\b(schedule|book|demo|call|meet|reply|let me know)\b/i.test(input.body)
  add('Clear call-to-action', hasQuestion || hasCta ? 15 : 5, 15)

  const score = Math.round((total / maxTotal) * 100)
  const label =
    score >= 80
      ? 'Excellent'
      : score >= 60
        ? 'Good'
        : score >= 40
          ? 'Needs work'
          : 'Poor'

  return { score, factors, label }
}
