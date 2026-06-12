import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type DeleteRecordButtonProps = {
  recordLabel: string
  redirectTo: string
  onDelete: () => Promise<unknown>
}

export function DeleteRecordButton({
  recordLabel,
  redirectTo,
  onDelete,
}: DeleteRecordButtonProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${recordLabel}? This cannot be undone.`,
      )
    ) {
      return
    }

    setDeleting(true)
    setError(null)
    try {
      await onDelete()
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
