import type { ReactNode } from 'react'

export function IntegrationMessages({
  warnings,
}: {
  warnings: string[]
}) {
  if (warnings.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Import warnings</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  )
}

export function ImportSection({
  title,
  icon,
  iconClass,
  description,
  buttons,
  hint,
  importing,
}: {
  title: string
  icon: ReactNode
  iconClass: string
  description: string
  buttons: { label: string; key: string; onFile: (file: File) => void }[]
  hint: string
  importing: string | null
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${iconClass}`}>{icon}</div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {buttons.map(({ label, key, onFile }) => (
              <label
                key={key}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={importing !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onFile(file)
                    e.target.value = ''
                  }}
                />
                {importing === key ? 'Importing...' : label}
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </section>
  )
}
