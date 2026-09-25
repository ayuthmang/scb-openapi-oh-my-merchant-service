const mockUsers = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
  {
    id: 2,
    email: 'jane@example.com',
    username: 'jane',
    password: 'janesPassword',
  },
]
// The path is relative to this file, and `jest.mock` is hoisted above the
// `const` above, so the factory may only close over `mock`-prefixed names.
jest.mock('../../data/users.json', () => mockUsers)

const { authorizer } = require('../auth.service')

describe('authorizer', () => {
  it('should return true when the user matches', () => {
    expect(authorizer('john.validEmail@example.com', 'aValidPassword')).toBe(
      true
    )
  })

  it('should authenticate every user, not only the first one', () => {
    expect(authorizer('jane@example.com', 'janesPassword')).toBe(true)
  })

  it('should return false when the password does not match', () => {
    expect(authorizer('john.validEmail@example.com', 'anInvalidPassword')).toBe(
      false
    )
  })

  it("should return false for another user's password", () => {
    expect(authorizer('john.validEmail@example.com', 'janesPassword')).toBe(
      false
    )
  })

  it('should return false when the email is not registered', () => {
    expect(authorizer('john', 'anInvalidPassword')).toBe(false)
  })

  it('should treat the email as case-sensitive', () => {
    expect(authorizer('JOHN.VALIDEMAIL@EXAMPLE.COM', 'aValidPassword')).toBe(
      false
    )
  })

  it('should treat the password as case-sensitive', () => {
    expect(authorizer('john.validEmail@example.com', 'AVALIDPASSWORD')).toBe(
      false
    )
  })

  it('should return false for an empty password', () => {
    expect(authorizer('john.validEmail@example.com', '')).toBe(false)
  })

  it('should return false when the credentials are missing', () => {
    expect(authorizer(undefined, undefined)).toBe(false)
    expect(authorizer('john.validEmail@example.com', undefined)).toBe(false)
  })

  it('should always return a boolean', () => {
    expect(
      typeof authorizer('john.validEmail@example.com', 'aValidPassword')
    ).toBe('boolean')
    expect(typeof authorizer('nobody@example.com', 'x')).toBe('boolean')
    expect(typeof authorizer('john.validEmail@example.com', 'x')).toBe(
      'boolean'
    )
  })
})
