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
jest.mock('../../data/users.json', () => mockUsers)

const { findByEmail, findByUsername } = require('../user.service')

describe('findByEmail', () => {
  it('should return the user when the email is correct', () => {
    expect(findByEmail('john.validEmail@example.com')).toEqual(mockUsers[0])
  })

  it('should find any user, not only the first one', () => {
    expect(findByEmail('jane@example.com')).toEqual(mockUsers[1])
  })

  it('should return undefined when the email is not found', () => {
    expect(findByEmail('xxx@xxx.com')).toBeUndefined()
  })

  it('should treat the email as case-sensitive', () => {
    expect(findByEmail('JANE@EXAMPLE.COM')).toBeUndefined()
  })

  it('should return undefined when no email is given', () => {
    expect(findByEmail(undefined)).toBeUndefined()
  })

  it('should not match a username passed as an email', () => {
    expect(findByEmail('jane')).toBeUndefined()
  })
})

describe('findByUsername', () => {
  it('should return the user when the username is correct', () => {
    expect(findByUsername('john')).toEqual(mockUsers[0])
  })

  it('should find any user, not only the first one', () => {
    expect(findByUsername('jane')).toEqual(mockUsers[1])
  })

  it('should return undefined when the username is not found', () => {
    expect(findByUsername('nobody')).toBeUndefined()
  })

  it('should treat the username as case-sensitive', () => {
    expect(findByUsername('JOHN')).toBeUndefined()
  })

  it('should return undefined when no username is given', () => {
    expect(findByUsername(undefined)).toBeUndefined()
  })

  it('should not match an email passed as a username', () => {
    expect(findByUsername('jane@example.com')).toBeUndefined()
  })
})
