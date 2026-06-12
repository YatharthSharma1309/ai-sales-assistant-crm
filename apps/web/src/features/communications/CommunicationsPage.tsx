import { useEffect, useState } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchLeads } from '../../store/leadsSlice'
import { fetchDeals } from '../../store/pipelineSlice'
import { AiEmailGenerator } from './AiEmailGenerator'

type SourceType = 'lead' | 'deal' | ''

export function CommunicationsPage() {
  const dispatch = useAppDispatch()
  const { items: leads } = useAppSelector((state) => state.leads)
  const { deals } = useAppSelector((state) => state.pipeline)
  const [sourceType, setSourceType] = useState<SourceType>('')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    dispatch(fetchLeads({ pageSize: 100 }))
    dispatch(fetchDeals({ pageSize: 100 }))
  }, [dispatch])

  function handleSourceTypeChange(type: SourceType) {
    setSourceType(type)
    setSelectedId('')
  }

  const leadId = sourceType === 'lead' ? selectedId : undefined
  const dealId = sourceType === 'deal' ? selectedId : undefined

  return (
    <div>
      <PageHeader
        title="AI Follow-up Emails"
        description="Select a lead or deal — context is loaded automatically from your CRM"
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Select record</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Source
            </label>
            <select
              value={sourceType}
              onChange={(e) =>
                handleSourceTypeChange(e.target.value as SourceType)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Choose...</option>
              <option value="lead">Lead</option>
              <option value="deal">Deal</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {sourceType === 'lead'
                ? 'Lead'
                : sourceType === 'deal'
                  ? 'Deal'
                  : 'Record'}
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!sourceType}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">
                {sourceType ? 'Select...' : 'Choose a source type first'}
              </option>
              {sourceType === 'lead' &&
                leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              {sourceType === 'deal' &&
                deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                    {deal.account ? ` (${deal.account.name})` : ''}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {!sourceType && (
          <p className="mt-3 text-sm text-slate-500">
            Or open a lead/deal detail page and use the AI panel there.
          </p>
        )}
      </div>

      {selectedId ? (
        <AiEmailGenerator leadId={leadId} dealId={dealId} />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            Select a lead or deal above to generate a contextual follow-up email.
          </p>
        </div>
      )}
    </div>
  )
}
