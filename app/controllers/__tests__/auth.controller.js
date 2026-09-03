const mockUsers = [
  {
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
    password: 'aValidPassword',
  },
]
jest.mock('../../data/users.json', () => mockUsers)
jest.mock('../../utils/scb-api.instance', () => ({ post: jest.fn() }))

const scbAPIInstance = require('../../utils/scb-api.instance')
const authController = require('../auth.controller')

const createRes = () => {
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) {
      res.statusCode = code
      return res
    },
    send(payload) {
      res.body = payload
      return res
    },
  }
  return res
}

const validCredentials = {
  email: 'john.validEmail@example.com',
  password: 'aValidPassword',
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('should reject invalid credentials without calling the SCB API', async () => {
  const res = createRes()

  const badCredentials = { ...validCredentials, password: 'x' }

  await authController.login({ body: badCredentials }, res)

  expect(res.statusCode).toBe(401)
  expect(res.body.status.code).toBe(9500)
  expect(scbAPIInstance.post).not.toHaveBeenCalled()
})

it('should never return the password on a successful login', async () => {
  // Regression: the response spread the original user object, so the stored
  // password was echoed back to the client on every login.
  scbAPIInstance.post.mockResolvedValue({
    status: 200,
    data: {
      status: { code: 1000, description: 'Success' },
      data: { accessToken: 'aToken' },
    },
  })
  const res = createRes()

  await authController.login({ body: validCredentials }, res)

  expect(res.statusCode).toBe(200)
  expect(res.body.data.user).toEqual({
    id: 1,
    email: 'john.validEmail@example.com',
    username: 'john',
  })
  expect(res.body.data.user).not.toHaveProperty('password')
  expect(JSON.stringify(res.body)).not.toContain('aValidPassword')
})

it('should answer 502 when the SCB API is unreachable', async () => {
  // Regression: reading `err.response.status` threw when axios never got a
  // response, which surfaced as an unhandled rejection.
  scbAPIInstance.post.mockRejectedValue(
    Object.assign(new Error('connect ECONNREFUSED'), { isAxiosError: true })
  )
  const res = createRes()

  await authController.login({ body: validCredentials }, res)

  expect(res.statusCode).toBe(502)
  expect(res.body.status.code).toBe(9990)
})

it('should relay the status the SCB API returned', async () => {
  scbAPIInstance.post.mockRejectedValue({
    isAxiosError: true,
    response: { status: 403, data: { status: { code: 9500 } } },
  })
  const res = createRes()

  await authController.login({ body: validCredentials }, res)

  expect(res.statusCode).toBe(403)
  expect(res.body.status.code).toBe(9500)
})
