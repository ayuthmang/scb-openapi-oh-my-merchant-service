const {
  findByEmail,
  findByUsername,
} = require('../../app/services/user.service')
const users = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
jest.mock('../../app/data/users.json', () => users)

describe('findByEmail', () => {
  it('should returns user when email is correct', () => {
    const email = 'john.validEmail@example.com'

    const actual = findByEmail(email)

    expect(actual).toEqual(users[0])
  })

  it('should returns undefined when email is not found', () => {
    const email = 'xxx@xxx.com'

    const actual = findByEmail(email)

    expect(actual).toBeUndefined()
  })
})

describe('findByUsername', () => {
  it('should returns user when username is correct', () => {
    const username = 'john'

    const actual = findByUsername(username)

    expect(actual).toEqual(users[0])
  })

  it('should returns user when username is not found', () => {
    const username = 'jane'

    const actual = findByUsername(username)

    expect(actual).toBeUndefined()
  })
})
