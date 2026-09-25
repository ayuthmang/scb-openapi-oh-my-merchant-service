const mockUsers = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
jest.mock('../../data/users.json', () => mockUsers)

const userController = require('../user.controller')
const { createReq, createRes } = require('../../../test/helpers/express-mocks')

const findByUsername = (params) => {
  const res = createRes()
  userController.findByUsername(createReq({ params }), res)
  return res
}

describe('findByUsername', () => {
  it('should return the user without the password', () => {
    const res = findByUsername({ username: 'john' })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      status: { code: 1000, description: 'Success' },
      data: {
        id: 1,
        email: 'john.validEmail@example.com',
        username: 'john',
      },
    })
  })

  it('should not mutate the stored user', () => {
    findByUsername({ username: 'john' })

    expect(mockUsers[0].password).toBe('aValidPassword')
  })

  it('should answer 404 for an unknown user', () => {
    const res = findByUsername({ username: 'nobody' })

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      status: {
        code: 404,
        description: 'Resource not found {username}',
      },
    })
  })

  it('should answer 404 with code 1101 when the username is missing', () => {
    // Unreachable through the router, which needs `:username`, but guarded.
    const res = findByUsername({})

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      status: { code: 1101, description: 'Missing required parameters' },
    })
  })
})
