import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AppLogo } from '../../shared/components/AppLogo'

const API_BASE = ''

export function LeadCapturePage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [orgName, setOrgName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/api/public/lead-form/${slug}`)
      .then((r) => r.json())
      .then((d: { organizationName?: string }) => setOrgName(d.organizationName ?? ''))
      .catch(() => setError('This form is not available.'))
  }, [slug])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      setError('Missing form token. Use the link from your CRM integrations page.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, email, company: company || undefined, message: message || undefined }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setDone(data.message ?? 'Thanks! We will be in touch.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          <AppLogo size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {orgName || 'Contact us'}
            </p>
            <p className="text-xs text-slate-500">Sales inquiry form</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {done ? (
          <div className="card p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Thank you!</h1>
            <p className="mt-2 text-sm text-slate-600">{done}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4 p-6">
            <h1 className="text-lg font-semibold text-slate-900">Get in touch</h1>
            <p className="text-sm text-slate-500">
              Tell us about your needs and our team will follow up.
            </p>

            <div>
              <label className="form-label" htmlFor="capture-name">Name</label>
              <input id="capture-name" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" autoComplete="name" />
            </div>
            <div>
              <label className="form-label" htmlFor="capture-email">Work email</label>
              <input id="capture-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" autoComplete="email" />
            </div>
            <div>
              <label className="form-label" htmlFor="capture-company">Company (optional)</label>
              <input id="capture-company" value={company} onChange={(e) => setCompany(e.target.value)} className="input-field" autoComplete="organization" />
            </div>
            <div>
              <label className="form-label" htmlFor="capture-message">Message (optional)</label>
              <textarea id="capture-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="input-field resize-none" />
            </div>

            {error && <p className="alert-error">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Submit'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
