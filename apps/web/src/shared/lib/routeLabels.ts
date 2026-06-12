const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/contacts': 'Contacts',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline',
  '/meetings': 'Meetings',
  '/communications': 'AI Emails',
  '/analytics': 'Analytics',
  '/team': 'Team',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
}

const DETAIL_PARENTS: Record<string, string> = {
  accounts: 'Accounts',
  contacts: 'Contacts',
  leads: 'Leads',
  pipeline: 'Pipeline',
}

export function getBreadcrumbLabels(pathname: string): string[] {
  if (ROUTE_LABELS[pathname]) {
    return [ROUTE_LABELS[pathname]]
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2) {
    const parent = DETAIL_PARENTS[segments[0]]
    if (parent) {
      return [parent, 'Details']
    }
  }

  return ['Dashboard']
}
