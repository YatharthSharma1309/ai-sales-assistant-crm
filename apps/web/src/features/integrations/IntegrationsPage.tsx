import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Cloud, Download } from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { IntegrationsPageSkeleton } from '../../shared/components/Skeleton'
import { useToast } from '../../shared/components/ToastProvider'
import { useRole } from '../../shared/hooks/useRole'
import { api } from '../../shared/api/client'
import { EmailLogCard, GoogleIntegrationCard, startOAuth } from './GoogleIntegrationCard'
import { HubSpotIntegrationCard } from './HubSpotIntegrationCard'
import { ImportSection, IntegrationMessages } from './IntegrationShared'
import { LeadCaptureCard } from './LeadCaptureCard'
import { SalesforceIntegrationCard } from './SalesforceIntegrationCard'
import { useIntegrationsPage } from './useIntegrationsPage'

export function IntegrationsPage() {
  const { success, error: toastError } = useToast()
  const { isAdmin, isManager } = useRole()
  const canManageIntegrations = isAdmin || isManager
  const state = useIntegrationsPage()

  useEffect(() => {
    if (state.message) success(state.message)
  }, [state.message, success])

  useEffect(() => {
    if (state.error) toastError(state.error)
  }, [state.error, toastError])

  async function handleGoogleConfigSave(e: FormEvent) {
    e.preventDefault()
    state.setGoogleConfigSaving(true)
    state.setMessage(null)
    state.setError(null)
    try {
      await api('/api/integrations/google/config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: state.googleClientId,
          clientSecret: state.googleClientSecret,
        }),
      })
      state.setGoogleClientSecret('')
      state.setMessage('Google OAuth credentials saved for this workspace.')
      state.loadStatus()
    } catch (err) {
      state.setError(
        err instanceof Error ? err.message : 'Failed to save Google OAuth credentials',
      )
    } finally {
      state.setGoogleConfigSaving(false)
    }
  }

  async function handleGoogleConfigRemove() {
    state.setGoogleConfigSaving(true)
    try {
      await api('/api/integrations/google/config', { method: 'DELETE' })
      state.setMessage('Workspace Google OAuth credentials removed.')
      state.loadStatus()
    } catch {
      state.setError('Failed to remove Google OAuth credentials')
    } finally {
      state.setGoogleConfigSaving(false)
    }
  }

  async function syncCalendar() {
    state.setSyncing(true)
    state.setMessage(null)
    state.setError(null)
    try {
      const result = await api<{ synced: number; created: number; skipped: number }>(
        '/api/integrations/google/sync',
        { method: 'POST' },
      )
      state.setMessage(
        `Synced ${result.synced} events — ${result.created} new meetings added.`,
      )
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      state.setSyncing(false)
    }
  }

  async function syncGmail() {
    state.setGmailSyncing(true)
    state.setMessage(null)
    state.setError(null)
    try {
      const result = await api<{ scanned: number; created: number; skipped: number }>(
        '/api/integrations/gmail/sync',
        { method: 'POST' },
      )
      state.setMessage(
        `Gmail sync: ${result.created} emails logged (${result.scanned} scanned).`,
      )
    } catch (err) {
      state.setError(err instanceof Error ? err.message : 'Gmail sync failed')
    } finally {
      state.setGmailSyncing(false)
    }
  }

  const [emailLogRegenerating, setEmailLogRegenerating] = useState(false)

  async function regenerateEmailLog() {
    setEmailLogRegenerating(true)
    try {
      await api('/api/organization/email-log/regenerate', { method: 'POST' })
      state.loadStatus()
      success('BCC email address regenerated.')
    } catch {
      toastError('Failed to regenerate BCC address.')
    } finally {
      setEmailLogRegenerating(false)
    }
  }

  if (state.loading) {
    return <IntegrationsPageSkeleton />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect external tools to sync data into your CRM."
      />

      <IntegrationMessages warnings={state.warnings} />

      <GoogleIntegrationCard
        status={state.status}
        canManageIntegrations={canManageIntegrations}
        googleClientId={state.googleClientId}
        googleClientSecret={state.googleClientSecret}
        googleConfigSaving={state.googleConfigSaving}
        syncing={state.syncing}
        gmailSyncing={state.gmailSyncing}
        onGoogleClientIdChange={state.setGoogleClientId}
        onGoogleClientSecretChange={state.setGoogleClientSecret}
        onGoogleConfigSave={handleGoogleConfigSave}
        onGoogleConfigRemove={handleGoogleConfigRemove}
        onConnectCalendar={() =>
          startOAuth('/api/integrations/google/auth-url', (msg) => state.setError(msg))
        }
        onSyncCalendar={syncCalendar}
        onDisconnectCalendar={async () => {
          await api('/api/integrations/google', { method: 'DELETE' })
          state.setMessage('Google Calendar disconnected.')
          state.loadStatus()
        }}
        onConnectGmail={() =>
          startOAuth('/api/integrations/gmail/auth-url', (msg) => state.setError(msg))
        }
        onSyncGmail={syncGmail}
        onDisconnectGmail={async () => {
          await api('/api/integrations/gmail', { method: 'DELETE' })
          state.setMessage('Gmail disconnected.')
          state.loadStatus()
        }}
      />

      <EmailLogCard
        emailLogAddress={state.emailLogAddress}
        emailLogToken={state.emailLogToken}
        isAdmin={isAdmin}
        onRegenerate={isAdmin ? () => void regenerateEmailLog() : undefined}
        regenerating={emailLogRegenerating}
      />

      {(isAdmin || isManager) && <LeadCaptureCard isAdmin={isAdmin} />}

      {isManager && (
        <>
          <HubSpotIntegrationCard
            status={state.status}
            hubspotToken={state.hubspotToken}
            hubspotConnecting={state.hubspotConnecting}
            hubspotSyncing={state.hubspotSyncing}
            setHubspotToken={state.setHubspotToken}
            setError={state.setError}
            setMessage={state.setMessage}
            setHubspotConnecting={state.setHubspotConnecting}
            setHubspotSyncing={state.setHubspotSyncing}
            setWarnings={state.setWarnings}
            loadStatus={state.loadStatus}
          />

          <ImportSection
            title="HubSpot CSV Import"
            icon={<Download className="h-6 w-6" />}
            iconClass="bg-orange-50 text-orange-600"
            description="Export contacts or deals from HubSpot as CSV."
            buttons={[
              {
                label: 'Import Contacts CSV',
                key: 'hubspot-contacts',
                onFile: (f) => state.importCsv('hubspot', 'contacts', f),
              },
              {
                label: 'Import Deals CSV',
                key: 'hubspot-deals',
                onFile: (f) => state.importCsv('hubspot', 'deals', f),
              },
            ]}
            hint="Contacts: First Name, Last Name, Email, Company Name."
            importing={state.importing}
          />

          <SalesforceIntegrationCard
            status={state.status}
            salesforceToken={state.salesforceToken}
            salesforceInstanceUrl={state.salesforceInstanceUrl}
            salesforceWebhookSecret={state.salesforceWebhookSecret}
            salesforceConnecting={state.salesforceConnecting}
            salesforceSyncing={state.salesforceSyncing}
            setSalesforceToken={state.setSalesforceToken}
            setSalesforceInstanceUrl={state.setSalesforceInstanceUrl}
            setSalesforceWebhookSecret={state.setSalesforceWebhookSecret}
            setError={state.setError}
            setMessage={state.setMessage}
            setSalesforceConnecting={state.setSalesforceConnecting}
            setSalesforceSyncing={state.setSalesforceSyncing}
            setWarnings={state.setWarnings}
            loadStatus={state.loadStatus}
          />

          <ImportSection
            title="Salesforce CSV Import"
            icon={<Cloud className="h-6 w-6" />}
            iconClass="bg-sky-50 text-sky-600"
            description="Export contacts, leads, or opportunities from Salesforce."
            buttons={[
              {
                label: 'Import Contacts CSV',
                key: 'salesforce-contacts',
                onFile: (f) => state.importCsv('salesforce', 'contacts', f),
              },
              {
                label: 'Import Leads CSV',
                key: 'salesforce-leads',
                onFile: (f) => state.importCsv('salesforce', 'leads', f),
              },
              {
                label: 'Import Opportunities CSV',
                key: 'salesforce-opportunities',
                onFile: (f) => state.importCsv('salesforce', 'opportunities', f),
              },
            ]}
            hint="Contacts: FirstName, LastName, Email. Opportunities: Name, Stage, Amount."
            importing={state.importing}
          />
        </>
      )}
    </div>
  )
}
