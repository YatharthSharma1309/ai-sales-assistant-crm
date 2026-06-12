import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { useRole } from '../hooks/useRole'
import { fetchTeam } from '../../store/teamSlice'

type AssigneeSelectProps = {
  value: string
  onChange: (userId: string) => void
  label?: string
  allowUnassigned?: boolean
}

export function AssigneeSelect({
  value,
  onChange,
  label = 'Assigned to',
  allowUnassigned = true,
}: AssigneeSelectProps) {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const { members } = useAppSelector((state) => state.team)
  const { user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (isManager) dispatch(fetchTeam())
  }, [dispatch, isManager])

  if (!isManager) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-sm text-slate-900">
          {value === user?.id ? 'You' : members.find((m) => m.user.id === value)?.user.name ?? '—'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {allowUnassigned && <option value="">Unassigned</option>}
        {members.map((m) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name} ({m.role})
          </option>
        ))}
      </select>
    </div>
  )
}
