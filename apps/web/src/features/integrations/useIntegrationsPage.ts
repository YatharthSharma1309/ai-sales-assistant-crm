import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../shared/api/client'
import type {
  EmailLogConfig,
  ImportKind,
  ImportResult,
  ImportSource,
  IntegrationStatus,
} from './types'

export function useIntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [emailLogAddress, setEmailLogAddress] = useState<string | null>(null)
  const [emailLogToken, setEmailLogToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [hubspotSyncing, setHubspotSyncing] = useState(false)
  const [salesforceSyncing, setSalesforceSyncing] = useState(false)
  const [hubspotConnecting, setHubspotConnecting] = useState(false)
  const [salesforceConnecting, setSalesforceConnecting] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hubspotToken, setHubspotToken] = useState('')
  const [salesforceToken, setSalesforceToken] = useState('')
  const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState('')
  const [salesforceWebhookSecret, setSalesforceWebhookSecret] = useState<
    string | null
  >(null)
  const [gmailSyncing, setGmailSyncing] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleConfigSaving, setGoogleConfigSaving] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const data = await api<IntegrationStatus>('/api/integrations/status')
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadEmailLog = useCallback(async () => {
    try {
      const data = await api<EmailLogConfig>('/api/organization/email-log')
      setEmailLogAddress(data.address)
      setEmailLogToken(data.token ?? null)
    } catch {
      setEmailLogAddress(null)
      setEmailLogToken(null)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadEmailLog()
  }, [loadStatus, loadEmailLog])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')

    if (connected === 'google') {
      setMessage('Google Calendar connected successfully.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (connected === 'hubspot') {
      setMessage('HubSpot connected via OAuth.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (connected === 'salesforce') {
      setMessage('Salesforce connected via OAuth.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (connected === 'gmail') {
      setMessage('Gmail inbox connected successfully.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (oauthError) {
      setError('OAuth connection failed. Please try again.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, loadStatus])

  useEffect(() => {
    if (status?.googleOAuth?.clientId) {
      setGoogleClientId(status.googleOAuth.clientId)
    }
  }, [status?.googleOAuth?.clientId])

  async function importCsv(source: ImportSource, kind: ImportKind, file: File) {
    const key = `${source}-${kind}`
    setImporting(key)
    setMessage(null)
    setWarnings([])
    setError(null)

    const endpoint =
      source === 'hubspot'
        ? '/api/integrations/hubspot/import-csv'
        : '/api/integrations/salesforce/import-csv'

    try {
      const csv = await file.text()
      const result = await api<ImportResult>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ type: kind, csv }),
      })
      const parts = [
        result.contactsCreated && `${result.contactsCreated} contacts`,
        result.leadsCreated && `${result.leadsCreated} leads`,
        result.leadsSkipped && `${result.leadsSkipped} leads skipped`,
        result.accountsCreated && `${result.accountsCreated} accounts`,
        result.dealsCreated && `${result.dealsCreated} deals`,
        result.dealsSkipped && `${result.dealsSkipped} deals skipped`,
      ].filter(Boolean)
      const label = source === 'hubspot' ? 'HubSpot' : 'Salesforce'
      setMessage(`${label} import complete: ${parts.join(', ')}.`)
      if (result.warnings?.length) setWarnings(result.warnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  return {
    status,
    emailLogAddress,
    emailLogToken,
    loading,
    syncing,
    setSyncing,
    hubspotSyncing,
    setHubspotSyncing,
    salesforceSyncing,
    setSalesforceSyncing,
    hubspotConnecting,
    setHubspotConnecting,
    salesforceConnecting,
    setSalesforceConnecting,
    importing,
    message,
    setMessage,
    warnings,
    setWarnings,
    error,
    setError,
    hubspotToken,
    setHubspotToken,
    salesforceToken,
    setSalesforceToken,
    salesforceInstanceUrl,
    setSalesforceInstanceUrl,
    salesforceWebhookSecret,
    setSalesforceWebhookSecret,
    gmailSyncing,
    setGmailSyncing,
    googleClientId,
    setGoogleClientId,
    googleClientSecret,
    setGoogleClientSecret,
    googleConfigSaving,
    setGoogleConfigSaving,
    loadStatus,
    importCsv,
  }
}
