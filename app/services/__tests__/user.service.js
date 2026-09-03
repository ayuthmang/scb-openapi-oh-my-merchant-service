const mockUsers = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
jest.mock('../../data/users.json', () => mockUsers)

const { findByEmail, findByUsername } = require('../user.service')

describe('findByEmail', () => {
  it('should return the user when the email is correct', () => {
    expect(findByEmail('john.validEmail@example.com')).toEqual(mockUsers[0])
  })

  it('should return undefined when the email is not found', () => {
    expect(findByEmail('xxx@xxx.com')).toBeUndefined()
  })
})

describe('findByUsername', () => {
  it('should return the user when the username is correct', () => {
    expect(findByUsername('john')).toEqual(mockUsers[0])
  })

  it('should return undefined when the username is not found', () => {
    expect(findByUsername('jane')).toBeUndefined()
  })
})
