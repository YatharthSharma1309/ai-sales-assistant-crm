import { PageHeader } from '../../shared/components/PageHeader'

export function TermsPage() {
  return (
    <div>
      <PageHeader
        title="Terms of Service"
        description="Terms for using AI Sales Assistant CRM"
      />
      <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          Acceptable use
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You agree to use this CRM for lawful business purposes. You are
          responsible for the accuracy of data you import and for complying with
          applicable email and privacy regulations when sending outreach.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          Service availability
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          The service is provided as-is. We strive for reliability but do not
          guarantee uninterrupted access. Back up critical data regularly.
        </p>
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          AI-generated content
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          AI drafts and summaries are suggestions. Review all AI-generated
          content before sending to customers or storing as official records.
        </p>
      </div>
    </div>
  )
}
