import { USERS_MOCK } from './users.data'

describe('users.data', () => {
  it('exports users array', () => {
    expect(Array.isArray(USERS_MOCK)).toBe(true)
  })

  it('has 6 mock users', () => {
    expect(USERS_MOCK).toHaveLength(6)
  })

  it('each user has required fields', () => {
    for (const user of USERS_MOCK) {
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('name')
      expect(user).toHaveProperty('role')
      expect(user).toHaveProperty('status')
      expect(user).toHaveProperty('createdAt')
    }
  })

  it('includes all roles', () => {
    const roles = USERS_MOCK.map(u => u.role)
    expect(roles).toContain('USER')
    expect(roles).toContain('AUDITOR')
    expect(roles).toContain('ADMIN')
  })

  it('includes all statuses', () => {
    const statuses = USERS_MOCK.map(u => u.status)
    expect(statuses).toContain('ACTIVE')
    expect(statuses).toContain('PENDING')
    expect(statuses).toContain('REVOKED')
  })
})
