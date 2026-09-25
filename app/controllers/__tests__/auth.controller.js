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
jest.mock('../../../config/scb-api.config', () => ({
  API_KEY: 'test-api-key',
  API_SECRET: 'test-api-secret',
}))

const scbAPIInstance = require('../../utils/scb-api.instance')
const authController = require('../auth.controller')
const {
  createReq,
  createRes,
  UUID_V4,
} = require('../../../test/helpers/express-mocks')

const validCredentials = {
  email: 'john.validEmail@example.com',
  password: 'aValidPassword',
}

const scbTokenResponse = {
  status: 200,
  data: {
    status: { code: 1000, description: 'Success' },
    data: {
      accessToken: 'aToken',
      tokenType: 'Bearer',
      expiresIn: 1800,
    },
  },
}

const login = async (body) => {
  const res = createRes()
  await authController.login(createReq({ body }), res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('login with invalid credentials', () => {
  it.each([
    ['a wrong password', { ...validCredentials, password: 'x' }],
    ['an unknown email', { email: 'nobody@example.com', password: 'x' }],
    ['an empty body', {}],
  ])('should answer 401 for %s without calling SCB', async (_, body) => {
    const res = await login(body)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({
      status: {
        code: 9500,
        description: 'Invalid authorization credentials',
      },
    })
    expect(scbAPIInstance.post).not.toHaveBeenCalled()
  })
})

describe('login with valid credentials', () => {
  beforeEach(() => {
    scbAPIInstance.post.mockResolvedValue(scbTokenResponse)
  })

  it('should request a token with the application credentials', async () => {
    await login(validCredentials)

    expect(scbAPIInstance.post).toHaveBeenCalledTimes(1)
    const [path, body, config] = scbAPIInstance.post.mock.calls[0]
    expect(path).toBe('/partners/sandbox/v1/oauth/token')
    expect(body).toEqual({
      applicationKey: 'test-api-key',
      applicationSecret: 'test-api-secret',
    })
    expect(config.headers.requestUId).toMatch(UUID_V4)
  })

  it('should never send the user password upstream', async () => {
    await login(validCredentials)

    expect(JSON.stringify(scbAPIInstance.post.mock.calls)).not.toContain(
      'aValidPassword'
    )
  })

  it('should use a fresh requestUId for every login', async () => {
    await login(validCredentials)
    await login(validCredentials)

    const [first, second] = scbAPIInstance.post.mock.calls.map(
      ([, , config]) => config.headers.requestUId
    )
    expect(first).not.toBe(second)
  })

  it('should relay the SCB status and token alongside the user', async () => {
    const res = await login(validCredentials)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      status: { code: 1000, description: 'Success' },
      data: {
        accessToken: 'aToken',
        tokenType: 'Bearer',
        expiresIn: 1800,
        user: {
          id: 1,
          email: 'john.validEmail@example.com',
          username: 'john',
        },
      },
    })
  })

  it('should never return the password', async () => {
    // Regression: the response spread the original user object, so the stored
    // password was echoed back to the client on every login.
    const res = await login(validCredentials)

    expect(res.body.data.user).not.toHaveProperty('password')
    expect(JSON.stringify(res.body)).not.toContain('aValidPassword')
  })

  it('should not mutate the stored user', async () => {
    await login(validCredentials)

    expect(mockUsers[0].password).toBe('aValidPassword')
  })

  it('should relay a non-200 success status from SCB', async () => {
    scbAPIInstance.post.mockResolvedValue({ ...scbTokenResponse, status: 201 })

    const res = await login(validCredentials)

    expect(res.statusCode).toBe(201)
  })
})

describe('login when SCB fails', () => {
  it('should relay the status and body SCB returned', async () => {
    scbAPIInstance.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: { status: { code: 9500, description: 'Invalid key' } },
      },
    })

    const res = await login(validCredentials)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({
      status: { code: 9500, description: 'Invalid key' },
    })
  })

  it('should answer 502 when SCB is unreachable', async () => {
    // Regression: reading `err.response.status` threw when axios never got a
    // response, which surfaced as an unhandled rejection.
    scbAPIInstance.post.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { isAxiosError: true })
    )

    const res = await login(validCredentials)

    expect(res.statusCode).toBe(502)
    expect(res.body.status.code).toBe(9990)
  })
})
