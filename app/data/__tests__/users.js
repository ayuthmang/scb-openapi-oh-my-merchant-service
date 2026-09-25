// These tests run against the real `users.json`, not a mock: they guard the
// accounts the demo logs in with.
const users = require('../users.json')
const { authorizer } = require('../../services/auth.service')
const { findByEmail, findByUsername } = require('../../services/user.service')

const DEMO_ACCOUNTS = [
  { email: 'admin@xyz.com', username: 'admin', password: 'admin@xyz.com' },
  { email: 'gique@xyz.com', username: 'gique', password: 'giquenaruk' },
]

describe('users.json', () => {
  it('should be a non-empty list', () => {
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
  })

  it('should give every user an id, email, username and password', () => {
    users.forEach((user) => {
      expect(user).toEqual({
        id: expect.any(Number),
        email: expect.any(String),
        username: expect.any(String),
        password: expect.any(String),
      })
      expect(user.email).toMatch(/^[^@\s]+@[^@\s]+$/)
      expect(user.username).not.toHaveLength(0)
      expect(user.password).not.toHaveLength(0)
    })
  })

  it.each(['id', 'email', 'username'])('should keep every %s unique', (key) => {
    const values = users.map((user) => user[key])
    expect(new Set(values).size).toBe(values.length)
  })
})

describe.each(DEMO_ACCOUNTS)('demo account $username', (account) => {
  it('should log in with its documented password', () => {
    expect(authorizer(account.email, account.password)).toBe(true)
  })

  it('should be found by email and by username', () => {
    expect(findByEmail(account.email)).toMatchObject({
      username: account.username,
    })
    expect(findByUsername(account.username)).toMatchObject({
      email: account.email,
    })
  })
})
