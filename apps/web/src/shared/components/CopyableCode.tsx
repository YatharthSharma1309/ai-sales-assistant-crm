import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

type CopyableCodeProps = {
  value: string
  label?: string
}

export function CopyableCode({ value, label }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div>
      {label && (
        <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <code className="flex-1 break-all text-sm text-slate-800">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
