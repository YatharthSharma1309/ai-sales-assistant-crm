import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { CopyableCode } from '../../shared/components/CopyableCode'
import { useToast } from '../../shared/components/ToastProvider'
import { api } from '../../shared/api/client'

type LeadCaptureInfo = {
  formUrl: string
  token: string
  slug: string
}

export function LeadCaptureCard({ isAdmin }: { isAdmin: boolean }) {
  const { success, error: toastError } = useToast()
  const [info, setInfo] = useState<LeadCaptureInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api<LeadCaptureInfo>('/api/organization/lead-capture')
      setInfo(data)
    } catch {
      toastError('Could not load lead capture form.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function regenerate() {
    if (!isAdmin) return
    setRegenerating(true)
    try {
      const data = await api<LeadCaptureInfo>('/api/organization/lead-capture/regenerate', {
        method: 'POST',
      })
      setInfo(data)
      success('Lead capture link regenerated.')
    } catch {
      toastError('Failed to regenerate link.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Web lead capture</h2>
          <p className="mt-1 text-sm text-slate-600">
            Share this public form on your website or ads. Submissions create leads in your CRM.
          </p>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">Loading form link...</p>
          )}

          {!loading && info && (
            <div className="mt-4 space-y-4">
              <CopyableCode value={info.formUrl} label="Public form URL" />
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  disabled={regenerating}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate link'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
