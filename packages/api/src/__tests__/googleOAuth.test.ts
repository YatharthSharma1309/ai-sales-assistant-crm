import { describe, expect, it, afterEach } from 'vitest'
import {
  getGoogleRedirectUris,
  isGoogleOAuthConfiguredInEnv,
} from '../lib/googleOAuth.js'

describe('googleOAuth', () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_REDIRECT_URI
    delete process.env.GMAIL_REDIRECT_URI
  })

  it('isGoogleOAuthConfiguredInEnv is false when env is empty', () => {
    expect(isGoogleOAuthConfiguredInEnv()).toBe(false)
  })

  it('isGoogleOAuthConfiguredInEnv is true when env credentials are set', () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    expect(isGoogleOAuthConfiguredInEnv()).toBe(true)
  })

  it('getGoogleRedirectUris returns local defaults', () => {
    const uris = getGoogleRedirectUris()
    expect(uris.calendarRedirectUri).toContain('/api/integrations/google/callback')
    expect(uris.gmailRedirectUri).toContain('/api/integrations/gmail/callback')
  })
})
