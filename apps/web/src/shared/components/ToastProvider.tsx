import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 4000

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-slate-200 bg-white text-slate-900',
}

const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: AlertCircle,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, message, variant }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const success = useCallback(
    (message: string) => toast(message, 'success'),
    [toast],
  )
  const error = useCallback(
    (message: string) => toast(message, 'error'),
    [toast],
  )

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = VARIANT_ICONS[t.variant]
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${VARIANT_STYLES[t.variant]}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
