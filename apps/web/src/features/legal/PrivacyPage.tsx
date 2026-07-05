import { PageHeader } from '../../shared/components/PageHeader'

export function PrivacyPage() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        description="How we handle your data in AI Sales Assistant CRM"
      />
      <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          Data we collect
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          We store account, contact, lead, deal, and activity data you enter into
          the CRM, along with authentication credentials and integration tokens
          needed to sync with connected services (Google, HubSpot, Salesforce).
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          How we use data
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your data is used solely to provide CRM functionality within your
          workspace. AI features send context to your configured OpenRouter model
          when generating emails or meeting summaries.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">Contact</h2>
        <p className="mt-2 text-sm text-slate-600">
          For privacy questions, contact your workspace administrator.
        </p>
      </div>
    </div>
  )
}
