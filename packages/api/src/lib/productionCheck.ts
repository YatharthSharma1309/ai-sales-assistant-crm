const MIN_JWT_SECRET_LENGTH = 32

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') return

  const errors: string[] = []

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push('DATABASE_URL is required')
  } else if (process.env.DATABASE_URL.startsWith('file:')) {
    errors.push('DATABASE_URL must be PostgreSQL in production (not SQLite file:)')
  }

  const jwtSecret = process.env.JWT_SECRET?.trim()
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required')
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`)
  } else if (
    jwtSecret.includes('change-me') ||
    jwtSecret.includes('dev-secret')
  ) {
    errors.push('JWT_SECRET must not use a placeholder value in production')
  }

  if (!process.env.FRONTEND_URL?.trim()) {
    errors.push('FRONTEND_URL is required (your Vercel production URL)')
  }

  if (!process.env.API_PUBLIC_URL?.trim()) {
    errors.push('API_PUBLIC_URL is required (public API URL for webhooks)')
  }

  if (process.env.TRUST_PROXY !== '1') {
    errors.push('TRUST_PROXY must be set to 1 behind Railway/Render')
  }

  const sameSite = process.env.REFRESH_COOKIE_SAME_SITE ?? 'none'
  if (sameSite !== 'none' && sameSite !== 'strict' && sameSite !== 'lax') {
    errors.push('REFRESH_COOKIE_SAME_SITE must be lax, strict, or none')
  }

  if (process.env.RATE_LIMIT_DISABLED === '1') {
    errors.push('RATE_LIMIT_DISABLED must not be enabled in production')
  }

  if (!process.env.SECRETS_ENCRYPTION_KEY?.trim()) {
    errors.push(
      'SECRETS_ENCRYPTION_KEY is required to encrypt workspace OAuth secrets at rest',
    )
  }

  if (!process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim()) {
    errors.push(
      'INBOUND_EMAIL_WEBHOOK_SECRET is required in production (inbound email webhook)',
    )
  }

  if (errors.length > 0) {
    throw new Error(
      `Production environment misconfigured:\n${errors.map((e) => `- ${e}`).join('\n')}`,
    )
  }
}
