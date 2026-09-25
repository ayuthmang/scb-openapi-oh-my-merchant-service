// Replays every request in the published Postman collection against the real
// app, with SCB faked. If the collection and the service drift apart, the
// demo script breaks, and so does this test.
jest.mock('morgan', () => () => (req, res, next) => next())

const http = require('http')

const collection = require('../../docs/postman/oh-my-merchant-service.postman_collection.json')
const { startFakeScbServer } = require('../../test/helpers/fake-scb-server')
const { applyScbEnv } = require('../../test/helpers/scb-env')
const { request, listen, close } = require('../../test/helpers/http-request')

// Sample values for every `<Your ...>` placeholder in the collection.
// A placeholder missing here fails the test, so new requests cannot slip by.
const PLACEHOLDERS = {
  '<Your Email>': 'admin@xyz.com',
  '<Your Password>': 'admin@xyz.com',
  '<Your Amount>': '100.00',
  '<Your Ref3>': 'DEMO123',
  '<Your transRef>': 'REF123',
  '<Your qrData>': 'customer-qr',
  '<Your transactionAmount>': '250.00',
}
const PATH_SEGMENTS = { '{username}': 'admin' }

const flatten = (items) =>
  items.flatMap((item) => (item.item ? flatten(item.item) : [item]))

const requests = flatten(collection.item)

const fill = (text, token) =>
  text
    .replace('<Your Access Token>', token)
    .replace(/<Your [^>]+>/g, (placeholder) => {
      if (!(placeholder in PLACEHOLDERS)) {
        throw new Error(
          `No sample value for Postman placeholder ${placeholder}`
        )
      }
      return PLACEHOLDERS[placeholder]
    })

/** Turn a Postman request into what `request()` needs. */
const toHttp = ({ request: postman }, token, { withDisabledQuery } = {}) => {
  const variables = Object.fromEntries(
    (postman.url.variable || []).map(({ key, value }) => [`:${key}`, value])
  )
  const path =
    '/' +
    postman.url.path
      .map((segment) => variables[segment] || PATH_SEGMENTS[segment] || segment)
      .map((segment) => fill(segment, token))
      .join('/')
  const query = (postman.url.query || [])
    .filter((param) => withDisabledQuery || !param.disabled)
    .map(({ key, value }) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  const headers = Object.fromEntries(
    (postman.header || []).map(({ key, value }) => [key, fill(value, token)])
  )
  const body = postman.body && postman.body.raw && fill(postman.body.raw, token)
  if (body) headers['content-type'] = 'application/json'

  return {
    method: postman.method,
    path: query ? `${path}?${query}` : path,
    headers,
    body,
  }
}

let fakeScb
let server
let baseURL
let token

beforeAll(async () => {
  fakeScb = await startFakeScbServer()
  applyScbEnv(fakeScb.baseURL)
  const app = require('../app')
  server = http.createServer(app)
  baseURL = await listen(server)

  // Log in the way the collection's first request does, to get a token.
  const login = await request(baseURL, '/auth/login', {
    method: 'POST',
    json: { email: 'admin@xyz.com', password: 'admin@xyz.com' },
  })
  token = login.body.data.accessToken
})

afterAll(async () => {
  await close(server)
  await fakeScb.close()
})

beforeEach(() => {
  fakeScb.reset()
})

describe('Postman collection', () => {
  it('should contain requests', () => {
    expect(requests.length).toBeGreaterThan(0)
  })

  it('should have a sample value for every placeholder it uses', () => {
    requests.forEach((item) => {
      expect(() => toHttp(item, 'token')).not.toThrow()
    })
  })

  it.each(requests.map((item) => [item.name, item]))(
    'should succeed when replaying %s',
    async (_, item) => {
      const { method, path, headers, body } = toHttp(item, token)

      const res = await request(baseURL, path, { method, headers, body })

      expect(res.statusCode).toBe(200)
      expect(res.body.status.code).toBe(1000)
    }
  )

  it('should forward the sample values the collection sends', async () => {
    const qrCreate = requests.find((item) =>
      item.name.includes('qrcode/create')
    )
    const { method, path, headers, body } = toHttp(qrCreate, token)

    await request(baseURL, path, { method, headers, body })

    const sent = fakeScb.lastRequest('POST /partners/sandbox/v1/payment/qrcode')
    expect(sent.body).toMatchObject({ amount: '100.00', ref3: 'DEMO123' })
  })

  it('should honor the optional sendingBank query once enabled', async () => {
    const slip = requests.find((item) =>
      item.name.includes('billpayment/transactions')
    )
    const { method, path, headers } = toHttp(slip, token, {
      withDisabledQuery: true,
    })

    const res = await request(baseURL, path, { method, headers })

    expect(res.statusCode).toBe(200)
    expect(
      fakeScb.lastRequest('GET /partners/sandbox/v1/payment/billpayment').query
    ).toEqual({ sendingBank: '014' })
  })
})
