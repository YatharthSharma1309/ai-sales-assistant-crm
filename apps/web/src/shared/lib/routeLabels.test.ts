import { describe, expect, it } from 'vitest'
import { getBreadcrumbLabels } from './routeLabels'

describe('getBreadcrumbLabels', () => {
  it('returns label for top-level routes', () => {
    expect(getBreadcrumbLabels('/leads')).toEqual(['Leads'])
    expect(getBreadcrumbLabels('/')).toEqual(['Dashboard'])
  })

  it('returns parent and Details for detail routes', () => {
    expect(getBreadcrumbLabels('/leads/abc123')).toEqual(['Leads', 'Details'])
    expect(getBreadcrumbLabels('/pipeline/deal-1')).toEqual([
      'Pipeline',
      'Details',
    ])
  })

  it('falls back to Dashboard for unknown routes', () => {
    expect(getBreadcrumbLabels('/unknown')).toEqual(['Dashboard'])
  })
})
