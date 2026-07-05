import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { EmptyState } from '../../shared/components/EmptyState'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { ListPageSkeleton } from '../../shared/components/Skeleton'
import { PageHeader } from '../../shared/components/PageHeader'
import { useToast } from '../../shared/components/ToastProvider'
import { ROLE_LABELS, type OrgRole } from '../../shared/constants/roles'
import { useRole } from '../../shared/hooks/useRole'
import { useDialog } from '../../shared/components/DialogProvider'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchMe } from '../../store/authSlice'
import {
  fetchPendingInvites,
  fetchTeam,
  inviteTeamMember,
  removeTeamMember,
  resendInvite,
  revokeInvite,
  updateMemberRole,
} from '../../store/teamSlice'

const ROLE_RANK: Record<OrgRole, number> = {
  ADMIN: 3,
  MANAGER: 2,
  REP: 1,
}

export function TeamPage() {
  const dispatch = useAppDispatch()
  const { confirm } = useDialog()
  const { success, error: toastError } = useToast()
  const { isAdmin, isManager } = useRole()
  const { user } = useAppSelector((state) => state.auth)
  const { members, pendingInvites, loading, error } = useAppSelector(
    (state) => state.team,
  )
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'REP' as 'MANAGER' | 'REP',
  })

  const canInvite = isAdmin || isManager

  const pageDescription = isAdmin
    ? 'Manage your sales team'
    : isManager
      ? 'View your sales team and rep activity'
      : 'Manage your sales team and view rep activity'

  const emptyDescription = isAdmin
    ? 'Invite sales reps and managers to collaborate on leads and pipeline deals.'
    : isManager
      ? 'Invite sales reps to your workspace or review your team roster.'
      : 'Your team roster and activity metrics.'

  useEffect(() => {
    dispatch(fetchTeam())
    if (canInvite) dispatch(fetchPendingInvites())
  }, [dispatch, canInvite])

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    const result = await dispatch(
      inviteTeamMember({
        ...form,
        name: form.name || undefined,
        role: isAdmin ? form.role : 'REP',
      }),
    )
    if (inviteTeamMember.fulfilled.match(result)) {
      const inviteUrl = result.payload.inviteUrl
      setForm({ name: '', email: '', role: 'REP' })
      setShowInvite(false)
      success(
        inviteUrl
          ? `Invite sent. Dev link: ${inviteUrl}`
          : `Invitation email sent to ${result.payload.email}.`,
      )
    } else if (inviteTeamMember.rejected.match(result)) {
      const payload = result.payload as { message?: string } | undefined
      toastError(
        payload?.message ??
          'Could not send invite. Email may already be on the team.',
      )
    }
  }

  async function handleRoleChange(
    membershipId: string,
    role: OrgRole,
    previousRole: OrgRole,
    memberUserId: string,
  ) {
    const result = await dispatch(updateMemberRole({ membershipId, role }))
    if (updateMemberRole.fulfilled.match(result)) {
      success('Role updated')
      if (
        memberUserId === user?.id ||
        ROLE_RANK[role] < ROLE_RANK[previousRole]
      ) {
        dispatch(fetchMe())
      }
      dispatch(fetchTeam())
    } else if (updateMemberRole.rejected.match(result)) {
      const payload = result.payload as { message?: string } | undefined
      toastError(payload?.message ?? 'Failed to update role.')
    }
  }

  async function handleRemove(membershipId: string) {
    const result = await dispatch(removeTeamMember(membershipId))
    if (removeTeamMember.fulfilled.match(result)) {
      success('Member removed')
      dispatch(fetchTeam())
    } else if (removeTeamMember.rejected.match(result)) {
      const payload = result.payload as { message?: string } | undefined
      toastError(payload?.message ?? 'Failed to remove member.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description={pageDescription}
        action={
          canInvite ? (
            <button
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showInvite ? 'Cancel' : isAdmin ? 'Invite member' : 'Invite rep'}
            </button>
          ) : undefined
        }
      />

      <ListErrorBanner error={error} />

      {showInvite && canInvite && (
        <form
          onSubmit={handleInvite}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Invite teammate</h2>
          <p className="mt-1 text-sm text-slate-500">
            We&apos;ll email a magic link to join your workspace.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Work email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {isAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as 'MANAGER' | 'REP',
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="REP">Sales Rep</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Send invite
          </button>
        </form>
      )}

      {canInvite && pendingInvites.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Pending invites</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{invite.email}</p>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABELS[invite.role]} · expires{' '}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => dispatch(resendInvite(invite.id))}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Resend
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => dispatch(revokeInvite(invite.id))}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading ? (
        <ListPageSkeleton rows={5} />
      ) : members.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description={emptyDescription}
          action={
            canInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                {isAdmin ? 'Invite member' : 'Invite rep'}
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium text-slate-900">{member.user.name}</p>
                <p className="text-xs text-slate-500">{member.user.email}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {ROLE_LABELS[member.role]} · {member.leadCount ?? 0} leads ·{' '}
                  {member.dealCount ?? 0} deals · {member.activityCount} activities
                </p>
                {isAdmin && member.user.id !== user?.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Remove team member',
                        message: `Remove ${member.user.name} from the team?`,
                        confirmLabel: 'Remove',
                        destructive: true,
                      })
                      if (!ok) return
                      await handleRemove(member.id)
                    }}
                    className="mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Deals</th>
                <th className="px-4 py-3 font-medium">Activities</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{member.user.name}</p>
                    <p className="text-xs text-slate-500">{member.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.id,
                            e.target.value as OrgRole,
                            member.role,
                            member.user.id,
                          )
                        }
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        {(['ADMIN', 'MANAGER', 'REP'] as OrgRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {member.leadCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {member.dealCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {member.activityCount}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {member.user.id !== user?.id && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Remove team member',
                              message: `Remove ${member.user.name} from the team?`,
                              confirmLabel: 'Remove',
                              destructive: true,
                            })
                            if (!ok) return
                            await handleRemove(member.id)
                          }}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}
