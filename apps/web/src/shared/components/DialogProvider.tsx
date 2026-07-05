import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Modal } from './Modal'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

type PromptOptions = {
  title?: string
  message?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  placeholder?: string
}

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const [promptState, setPromptState] = useState<{
    options: PromptOptions
    resolve: (value: string | null) => void
    value: string
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({
        options,
        resolve,
        value: options.defaultValue ?? '',
      })
    })
  }, [])

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}

      <Modal
        open={Boolean(confirmState)}
        title={confirmState?.options.title ?? 'Confirm'}
        onClose={() => {
          confirmState?.resolve(false)
          setConfirmState(null)
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                confirmState?.resolve(false)
                setConfirmState(null)
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {confirmState?.options.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                confirmState?.resolve(true)
                setConfirmState(null)
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                confirmState?.options.destructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {confirmState?.options.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{confirmState?.options.message}</p>
      </Modal>

      <Modal
        open={Boolean(promptState)}
        title={promptState?.options.title ?? 'Edit'}
        onClose={() => {
          promptState?.resolve(null)
          setPromptState(null)
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                promptState?.resolve(null)
                setPromptState(null)
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {promptState?.options.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                const trimmed = promptState?.value.trim() ?? ''
                if (!trimmed) return
                promptState?.resolve(trimmed)
                setPromptState(null)
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {promptState?.options.confirmLabel ?? 'Save'}
            </button>
          </>
        }
      >
        {promptState?.options.message && (
          <p className="mb-3 text-sm text-slate-600">
            {promptState.options.message}
          </p>
        )}
        <input
          autoFocus
          value={promptState?.value ?? ''}
          onChange={(e) =>
            setPromptState((prev) =>
              prev ? { ...prev, value: e.target.value } : prev,
            )
          }
          placeholder={promptState?.options.placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </Modal>
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return ctx
}

/** Stable no-op dialog for tests or isolated components */
export function useDialogOptional(): DialogContextValue {
  const ctx = useContext(DialogContext)
  const fallback = useRef<DialogContextValue>({
    confirm: async (opts) => window.confirm(opts.message),
    prompt: async (opts) =>
      window.prompt(opts.message ?? opts.title ?? '', opts.defaultValue ?? ''),
  })
  return ctx ?? fallback.current
}
