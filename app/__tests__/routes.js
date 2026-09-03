const http = require('http')

const app = require('../app')

/** @type {http.Server} */
let server

/**
 * @param {string} path
 * @param {{ method?: string, headers?: object, body?: string }} options
 */
const request = (path, options = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        port: server.address().port,
        path,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode,
            body: raw ? JSON.parse(raw) : undefined,
          })
        )
      }
    )
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })

beforeAll((done) => {
  server = http.createServer(app).listen(0, done)
})

afterAll((done) => {
  server.close(done)
})

describe('unmatched routes', () => {
  it('should answer 404 rather than 401 for an unknown path', async () => {
    // Regression: the auth middleware was mounted with `router.use`, so it
    // intercepted unmatched paths too and the 404 handler was unreachable.
    const res = await request('/there-is-no-such-route')

    expect(res.statusCode).toBe(404)
    expect(res.body.status.description).toBe('Resource not found')
  })

  it('should answer 404 for an unknown path even with a valid token', async () => {
    const res = await request('/there-is-no-such-route', {
      headers: { authorization: 'Bearer aToken' },
    })

    expect(res.statusCode).toBe(404)
  })
})

describe('protected routes', () => {
  it('should reject a request without an authorization header', async () => {
    const res = await request('/users/admin')

    expect(res.statusCode).toBe(401)
    expect(res.body.status.code).toBe(9500)
  })

  it('should allow a request carrying a bearer token', async () => {
    const res = await request('/users/admin', {
      headers: { authorization: 'Bearer aToken' },
    })

    expect(res.statusCode).toBe(200)
  })

  it('should never expose a password', async () => {
    const res = await request('/users/admin', {
      headers: { authorization: 'Bearer aToken' },
    })

    expect(res.body.data).not.toHaveProperty('password')
  })
})

describe('POST /payment/callback', () => {
  it('should answer without crashing when no client has connected', async () => {
    // Regression: this unauthenticated route used to throw a TypeError after
    // the response had ended, which terminated the process.
    const res = await request('/payment/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactionId: 'abc' }),
    })

    expect(res.statusCode).toBe(200)
  })

  it('should keep serving requests afterwards', async () => {
    const res = await request('/users/admin', {
      headers: { authorization: 'Bearer aToken' },
    })

    expect(res.statusCode).toBe(200)
  })
})
