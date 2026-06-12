export const orgName = 'E2E Test Org'

export const users = {
  admin: {
    email: 'e2e-admin@test.local',
    password: 'testpass123',
    name: 'E2E Admin',
  },
  manager: {
    email: 'e2e-manager@test.local',
    password: 'testpass123',
    name: 'E2E Manager',
  },
  rep: {
    email: 'e2e-rep@test.local',
    password: 'testpass123',
    name: 'E2E Rep',
  },
} as const
