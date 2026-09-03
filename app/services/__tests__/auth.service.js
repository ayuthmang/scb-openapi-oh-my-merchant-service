const mockUsers = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
// The path is relative to this file, and `jest.mock` is hoisted above the
// `const` above, so the factory may only close over `mock`-prefixed names.
jest.mock('../../data/users.json', () => mockUsers)

const { authorizer } = require('../auth.service')

test('should return true when the user matches', () => {
  expect(authorizer('john.validEmail@example.com', 'aValidPassword')).toBe(true)
})

test('should return false when the password does not match', () => {
  expect(authorizer('john.validEmail@example.com', 'anInvalidPassword')).toBe(
    false
  )
})

test('should return false when the email is not registered', () => {
  expect(authorizer('john', 'anInvalidPassword')).toBe(false)
})
