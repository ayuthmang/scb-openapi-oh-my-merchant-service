const { authorizer } = require('../auth.service')
const users = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
jest.mock('../../app/data/users.json', () => users)

test('should returns true when user is matched', () => {
  expect(
    authorizer('john.validEmail@example.com', 'aValidPassword')
  ).toBeTruthy()
})

test('should returns false when user is not matched', () => {
  expect(
    authorizer('john.validEmail@example.com', 'anInvalidPassword')
  ).toBeFalsy()
  expect(authorizer('john', 'anInvalidPassword')).toBeFalsy()
})
