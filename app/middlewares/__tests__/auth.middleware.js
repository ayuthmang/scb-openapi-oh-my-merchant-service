const HttpStatus = require('http-status-codes')

const authMiddleware = require('../auth.middleware')
const middlewares = require('..')
const { createReq, createRes } = require('../../../test/helpers/express-mocks')

const REJECTION = {
  status: {
    code: 9500,
    description: 'Invalid authorization credentials',
  },
}

const run = (headers) => {
  const req = createReq({ headers })
  const res = createRes()
  const next = jest.fn()
  authMiddleware(req, res, next)
  return { res, next }
}

describe('authMiddleware', () => {
  it('should reject a request without an authorization header', () => {
    const { res, next } = run({})

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(res.send).toHaveBeenCalledWith(REJECTION)
    expect(next).not.toHaveBeenCalled()
  })

  it('should read the header through `req.header`', () => {
    const req = { header: jest.fn() }
    authMiddleware(req, createRes(), jest.fn())

    expect(req.header).toHaveBeenCalledWith('authorization')
  })

  it('should pass a request carrying a bearer token', () => {
    const { res, next } = run({ Authorization: 'Bearer aToken' })

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })

  it.each([
    ['a Basic scheme', 'Basic dXNlcjpwYXNz'],
    ['a lowercase bearer scheme', 'bearer aToken'],
    ['a bare token', 'aToken'],
    ['an empty header', ''],
    ['leading whitespace', ' Bearer aToken'],
  ])('should reject %s', (_, value) => {
    const { res, next } = run({ Authorization: value })

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(res.send).toHaveBeenCalledWith(REJECTION)
    expect(next).not.toHaveBeenCalled()
  })

  it('should reject a header that is not a string', () => {
    const req = { header: () => ['Bearer aToken'] }
    const res = createRes()
    const next = jest.fn()

    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(next).not.toHaveBeenCalled()
  })

  // The middleware is documented as a placeholder that only checks the
  // prefix. These pin that behavior so a stricter check is a deliberate change.
  it.each([
    ['the scheme alone', 'Bearer'],
    ['a scheme without a separating space', 'BearerToken'],
  ])('should pass %s, since only the prefix is checked', (_, value) => {
    const { next } = run({ Authorization: value })

    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('middlewares/index', () => {
  it('should expose the auth middleware as `auth`', () => {
    expect(middlewares.auth).toBe(authMiddleware)
  })
})
