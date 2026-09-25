// Silence the per-request access log; `bin/__tests__/www.js` runs the real one.
jest.mock('morgan', () => () => (req, res, next) => next())
jest.mock('../utils/scb-api.instance', () => ({
  post: jest.fn(),
  get: jest.fn(),
}))

const http = require('http')

const app = require('../app')
const scbAPIInstance = require('../utils/scb-api.instance')
const { request, listen, close } = require('../../test/helpers/http-request')

const SERVICE_UNAVAILABLE = {
  code: 9990,
  description: 'Service not available, or currently under maintenance',
}

let server
let baseURL
const originalNodeEnv = process.env.NODE_ENV

beforeAll(async () => {
  server = http.createServer(app)
  baseURL = await listen(server)
})

afterAll(() => close(server))

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  jest.clearAllMocks()
})

// The final error-handling layer, for the branches no route can reach.
const errorHandler = app._router.stack
  .map((layer) => layer.handle)
  .filter((handle) => handle.length === 4)
  .pop()

describe('app/index', () => {
  it('should export the app that bin/www serves', () => {
    expect(require('..')).toBe(app)
  })
})

describe('body parsing', () => {
  it('should parse a JSON body', async () => {
    const res = await request(baseURL, '/auth/login', {
      method: 'POST',
      json: { email: 'admin@xyz.com', password: 'wrong' },
    })

    // Reaching the credential check proves the body was parsed.
    expect(res.statusCode).toBe(401)
    expect(res.body.status.code).toBe(9500)
  })

  it('should parse a URL-encoded body', async () => {
    scbAPIInstance.post.mockResolvedValue({
      status: 200,
      data: { status: { code: 1000 }, data: { accessToken: 't' } },
    })

    const res = await request(baseURL, '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=admin%40xyz.com&password=admin%40xyz.com',
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.user.username).toBe('admin')
  })

  it('should answer 400 for malformed JSON', async () => {
    const res = await request(baseURL, '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"email": ',
    })

    // Only the status and the envelope are pinned: the description currently
    // reads "Service not available", which is misleading for a client error.
    expect(res.statusCode).toBe(400)
    expect(res.body.status).toEqual({
      code: expect.any(Number),
      description: expect.any(String),
    })
  })
})

describe('404 handler', () => {
  it.each([
    ['GET', '/'],
    ['GET', '/there-is-no-such-route'],
    ['POST', '/users/admin'],
    ['GET', '/auth/login'],
    ['DELETE', '/payment/callback'],
  ])('should answer 404 for %s %s', async (method, path) => {
    const res = await request(baseURL, path, { method })

    expect(res.statusCode).toBe(404)
    expect(res.body.status).toEqual({
      code: 404,
      description: 'Resource not found',
    })
  })
})

describe('error handler', () => {
  it('should answer 500 for an unexpected error', async () => {
    scbAPIInstance.post.mockRejectedValue(new TypeError('something broke'))

    const res = await request(baseURL, '/payment/merchant/rtp/confirm', {
      method: 'POST',
      headers: { authorization: 'Bearer aToken' },
      json: { qrData: 'q', transactionAmount: '1.00' },
    })

    expect(res.statusCode).toBe(500)
    expect(res.body.status).toEqual(SERVICE_UNAVAILABLE)
  })

  it('should include the stack trace outside production', async () => {
    process.env.NODE_ENV = 'development'

    const res = await request(baseURL, '/there-is-no-such-route')

    expect(res.body.error).toMatch(/NotFoundError/)
  })

  it('should hide the stack trace in production', async () => {
    process.env.NODE_ENV = 'production'

    const res = await request(baseURL, '/there-is-no-such-route')

    expect(res.statusCode).toBe(404)
    expect(res.body).not.toHaveProperty('error')
  })

  it('should hide the stack trace of a 500 in production', async () => {
    process.env.NODE_ENV = 'production'
    scbAPIInstance.post.mockRejectedValue(new Error('secret internals'))

    const res = await request(baseURL, '/payment/merchant/rtp/confirm', {
      method: 'POST',
      headers: { authorization: 'Bearer aToken' },
      json: {},
    })

    expect(res.statusCode).toBe(500)
    expect(res.raw).not.toContain('secret internals')
  })

  it('should honor `statusCode` when `status` is absent', () => {
    const res = { headersSent: false, status: jest.fn(), send: jest.fn() }
    res.status.mockReturnValue(res)

    errorHandler({ statusCode: 503, stack: '' }, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('should defer to Express once the response has started', () => {
    const res = { headersSent: true, status: jest.fn(), send: jest.fn() }
    const next = jest.fn()
    const err = new Error('late')

    errorHandler(err, {}, res, next)

    expect(next).toHaveBeenCalledWith(err)
    expect(res.status).not.toHaveBeenCalled()
  })
})
