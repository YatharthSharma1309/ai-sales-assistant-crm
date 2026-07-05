import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '../api/client'

type SearchResult = {
  type: string
  id: string
  title: string
  subtitle?: string
  href: string
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(q.trim())}`,
        )
        setResults(data.results)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [q, open])

  function close() {
    setOpen(false)
    setQ('')
    setResults([])
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm transition-colors hover:border-slate-300 sm:flex"
        aria-label="Search CRM"
      >
        <Search size={16} />
        <span className="hidden md:inline">Search...</span>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 sm:hidden"
        aria-label="Search CRM"
      >
        <Search size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[10vh] backdrop-blur-sm">
          <div className="card w-full max-w-xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search leads, contacts, accounts, deals..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto py-2">
              {loading && (
                <li className="px-4 py-3 text-sm text-slate-500">Searching...</li>
              )}
              {!loading && q.trim().length >= 2 && results.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500">No results</li>
              )}
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => {
                      navigate(r.href)
                      close()
                    }}
                  >
                    <span className="text-sm font-medium text-slate-900">{r.title}</span>
                    <span className="text-xs capitalize text-slate-500">
                      {r.type}
                      {r.subtitle ? ` · ${r.subtitle}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
