export function buildTeamInviteEmail(opts: {
  inviterName: string
  organizationName: string
  role: string
  inviteUrl: string
  expiresAt: Date
}): { subject: string; body: string } {
  const roleLabel =
    opts.role === 'MANAGER' ? 'Manager' : opts.role === 'ADMIN' ? 'Admin' : 'Sales Rep'

  return {
    subject: `Join ${opts.organizationName} on AI Sales Assistant CRM`,
    body: [
      `Hi,`,
      ``,
      `${opts.inviterName} invited you to join ${opts.organizationName} as a ${roleLabel}.`,
      ``,
      `Accept your invitation:`,
      opts.inviteUrl,
      ``,
      `This link expires on ${opts.expiresAt.toUTCString()}.`,
      ``,
      `— AI Sales Assistant CRM`,
    ].join('\n'),
  }
}
