const sendUpstreamError = require('../send-upstream-error')
const { createRes } = require('../../../test/helpers/express-mocks')

describe('sendUpstreamError', () => {
  it('should relay the upstream status and body', () => {
    const res = createRes()
    const data = { status: { code: 9500, description: 'Invalid key' } }

    sendUpstreamError(res, { response: { status: 401, data } })

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(data)
  })

  it('should send a copy of the upstream body, not the same object', () => {
    const res = createRes()
    const data = { status: { code: 1 } }

    sendUpstreamError(res, { response: { status: 400, data } })

    expect(res.body).not.toBe(data)
  })

  it.each([
    ['a refused connection', 'ECONNREFUSED'],
    ['a timeout', 'ECONNABORTED'],
    ['a DNS failure', 'ENOTFOUND'],
  ])('should answer 502 on %s, when there is no response', (_, code) => {
    const res = createRes()

    sendUpstreamError(res, Object.assign(new Error(code), { code }))

    expect(res.statusCode).toBe(502)
    expect(res.body).toEqual({
      status: {
        code: 9990,
        description: 'Service not available, or currently under maintenance',
      },
    })
  })
})
