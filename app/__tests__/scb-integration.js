// End-to-end through the real Express app and the real axios instance.
// Only SCB itself is replaced, by a local fake server that records every call.
jest.mock('morgan', () => () => (req, res, next) => next())

const http = require('http')

const { startFakeScbServer } = require('../../test/helpers/fake-scb-server')
const { applyScbEnv, SCB_TEST_ENV } = require('../../test/helpers/scb-env')
const { request, listen, close } = require('../../test/helpers/http-request')
const { UUID_V4 } = require('../../test/helpers/express-mocks')

const BEARER = { authorization: 'Bearer fake-access-token' }

let fakeScb
let server
let baseURL

beforeAll(async () => {
  fakeScb = await startFakeScbServer()
  // The config is read when the app loads, so the env must be set first.
  applyScbEnv(fakeScb.baseURL)
  const app = require('../app')
  server = http.createServer(app)
  baseURL = await listen(server)
})

afterAll(async () => {
  await close(server)
  await fakeScb.close()
})

beforeEach(() => {
  fakeScb.reset()
})

const expectScbHeaders = (sent, { authorization } = {}) => {
  expect(sent.headers.resourceownerid).toBe(SCB_TEST_ENV.SCB_API_KEY)
  expect(sent.headers.requestuid).toMatch(UUID_V4)
  if (authorization) {
    expect(sent.headers.authorization).toBe(authorization)
  }
}

describe('POST /auth/login', () => {
  const login = (json) =>
    request(baseURL, '/auth/login', { method: 'POST', json })

  it('should exchange the app credentials for an SCB token', async () => {
    const res = await login({
      email: 'admin@xyz.com',
      password: 'admin@xyz.com',
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      status: { code: 1000, description: 'Success' },
      data: expect.objectContaining({
        accessToken: 'fake-access-token',
        tokenType: 'Bearer',
        user: { id: 1, email: 'admin@xyz.com', username: 'admin' },
      }),
    })

    const sent = fakeScb.lastRequest('POST /partners/sandbox/v1/oauth/token')
    expect(sent.body).toEqual({
      applicationKey: SCB_TEST_ENV.SCB_API_KEY,
      applicationSecret: SCB_TEST_ENV.SCB_API_SECRET,
    })
    expectScbHeaders(sent)
  })

  it('should log in the second demo account too', async () => {
    const res = await login({ email: 'gique@xyz.com', password: 'giquenaruk' })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.user.username).toBe('gique')
  })

  it('should never return the password', async () => {
    const res = await login({
      email: 'admin@xyz.com',
      password: 'admin@xyz.com',
    })

    expect(res.body.data.user).not.toHaveProperty('password')
  })

  it('should reject bad credentials without calling SCB', async () => {
    const res = await login({ email: 'admin@xyz.com', password: 'wrong' })

    expect(res.statusCode).toBe(401)
    expect(fakeScb.requests).toHaveLength(0)
  })

  it('should relay an SCB rejection', async () => {
    fakeScb.respondWith('POST /partners/sandbox/v1/oauth/token', 401, {
      status: { code: 9500, description: 'Invalid application key' },
    })

    const res = await login({
      email: 'admin@xyz.com',
      password: 'admin@xyz.com',
    })

    expect(res.statusCode).toBe(401)
    expect(res.body.status.description).toBe('Invalid application key')
  })

  it('should answer 502 when SCB drops the connection', async () => {
    fakeScb.dropConnection('POST /partners/sandbox/v1/oauth/token')

    const res = await login({
      email: 'admin@xyz.com',
      password: 'admin@xyz.com',
    })

    expect(res.statusCode).toBe(502)
    expect(res.body.status.code).toBe(9990)
  })
})

describe('POST /payment/qrcode/create', () => {
  const create = (json, headers = BEARER) =>
    request(baseURL, '/payment/qrcode/create', {
      method: 'POST',
      headers,
      json,
    })

  it('should create a QR code and relay it', async () => {
    const res = await create({ amount: '100.00', ref3: 'ABC123' })

    expect(res.statusCode).toBe(200)
    expect(res.body.data).toEqual({
      qrRawData: '00020101021230...',
      qrImage: 'iVBORw0KGgo=',
    })

    const sent = fakeScb.lastRequest(
      'POST /partners/sandbox/v1/payment/qrcode/create'
    )
    expect(sent.body).toEqual({
      qrType: 'PP',
      ppType: 'BILLERID',
      ppId: SCB_TEST_ENV.SCB_BILLER_ID,
      amount: '100.00',
      ref1: '1234567890',
      ref2: '1234567890',
      ref3: 'ABC123',
    })
    expectScbHeaders(sent, BEARER)
  })

  it('should reject a request without a token before calling SCB', async () => {
    const res = await create({ amount: '100.00' }, {})

    expect(res.statusCode).toBe(401)
    expect(fakeScb.requests).toHaveLength(0)
  })

  it('should relay an SCB validation error', async () => {
    fakeScb.respondWith(
      'POST /partners/sandbox/v1/payment/qrcode/create',
      400,
      {
        status: { code: 4101, description: 'Invalid amount' },
      }
    )

    const res = await create({ amount: 'abc' })

    expect(res.statusCode).toBe(400)
    expect(res.body.status.code).toBe(4101)
  })

  it('should answer 502 when SCB drops the connection', async () => {
    fakeScb.dropConnection('POST /partners/sandbox/v1/payment/qrcode/create')

    const res = await create({ amount: '100.00' })

    expect(res.statusCode).toBe(502)
  })
})

describe('GET /payment/qrcode/billpayment/transactions/:transRef', () => {
  const verify = (path, headers = BEARER) =>
    request(baseURL, `/payment/qrcode/billpayment/transactions/${path}`, {
      headers,
    })

  it('should verify the slip with the default sending bank', async () => {
    const res = await verify('REF123')

    expect(res.statusCode).toBe(200)
    expect(res.body.data.transRef).toBe('fake-trans-ref')

    const sent = fakeScb.lastRequest(
      'GET /partners/sandbox/v1/payment/billpayment/transactions/REF123'
    )
    expect(sent.query).toEqual({ sendingBank: '014' })
    expectScbHeaders(sent, BEARER)
  })

  it('should forward an overridden sending bank', async () => {
    await verify('REF123?sendingBank=002')

    const sent = fakeScb.lastRequest('GET /partners/sandbox/v1/payment/bill')
    expect(sent.query).toEqual({ sendingBank: '002' })
  })

  it('should reject a request without a token before calling SCB', async () => {
    const res = await verify('REF123', {})

    expect(res.statusCode).toBe(401)
    expect(fakeScb.requests).toHaveLength(0)
  })

  it('should relay an SCB error for an unknown slip', async () => {
    fakeScb.respondWith(
      'GET /partners/sandbox/v1/payment/billpayment/transactions/*',
      404,
      { status: { code: 4404, description: 'Transaction not found' } }
    )

    const res = await verify('UNKNOWN')

    expect(res.statusCode).toBe(404)
    expect(res.body.status.code).toBe(4404)
  })

  it('should answer 502 when SCB drops the connection', async () => {
    fakeScb.dropConnection(
      'GET /partners/sandbox/v1/payment/billpayment/transactions/*'
    )

    const res = await verify('REF123')

    expect(res.statusCode).toBe(502)
  })
})

describe('POST /payment/merchant/rtp/confirm', () => {
  const confirm = (json, headers = BEARER) =>
    request(baseURL, '/payment/merchant/rtp/confirm', {
      method: 'POST',
      headers,
      json,
    })

  it('should confirm a B Scan C payment', async () => {
    const res = await confirm({
      qrData: 'customer-qr',
      transactionAmount: '250.00',
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.transactionId).toBe('fake-transaction-id')

    const sent = fakeScb.lastRequest(
      'POST /partners/sandbox/v1/payment/merchant/rtp/confirm'
    )
    expect(sent.body).toEqual({
      qrData: 'customer-qr',
      payeeBillerId: SCB_TEST_ENV.SCB_BILLER_ID,
      transactionAmount: '250.00',
      reference1: 'ABCDEFGHI',
      partnerTransactionId: expect.stringMatching(
        new RegExp(`^${SCB_TEST_ENV.SCB_BILLER_ID}\\d{14}ABCDEF$`)
      ),
    })
    expectScbHeaders(sent, BEARER)
  })

  it('should reject a request without a token before calling SCB', async () => {
    const res = await confirm({ qrData: 'q' }, {})

    expect(res.statusCode).toBe(401)
    expect(fakeScb.requests).toHaveLength(0)
  })

  it('should relay an SCB error', async () => {
    fakeScb.respondWith(
      'POST /partners/sandbox/v1/payment/merchant/rtp/confirm',
      409,
      { status: { code: 4409, description: 'Duplicate transaction' } }
    )

    const res = await confirm({ qrData: 'q', transactionAmount: '1.00' })

    expect(res.statusCode).toBe(409)
    expect(res.body.status.code).toBe(4409)
  })

  it('should answer 502 when SCB drops the connection', async () => {
    fakeScb.dropConnection(
      'POST /partners/sandbox/v1/payment/merchant/rtp/confirm'
    )

    const res = await confirm({ qrData: 'q', transactionAmount: '1.00' })

    expect(res.statusCode).toBe(502)
  })
})

describe('GET /users/:username', () => {
  it.each(['admin', 'gique'])(
    'should return %s without a password',
    async (username) => {
      const res = await request(baseURL, `/users/${username}`, {
        headers: BEARER,
      })

      expect(res.statusCode).toBe(200)
      expect(res.body.data.username).toBe(username)
      expect(res.body.data).not.toHaveProperty('password')
    }
  )

  it('should answer 404 for an unknown user', async () => {
    const res = await request(baseURL, '/users/nobody', { headers: BEARER })

    expect(res.statusCode).toBe(404)
  })

  it('should reject a request without a token', async () => {
    const res = await request(baseURL, '/users/admin')

    expect(res.statusCode).toBe(401)
  })

  it('should never call SCB', async () => {
    await request(baseURL, '/users/admin', { headers: BEARER })

    expect(fakeScb.requests).toHaveLength(0)
  })
})

describe('POST /payment/callback', () => {
  it('should acknowledge SCB with an empty 200 and no token', async () => {
    const res = await request(baseURL, '/payment/callback', {
      method: 'POST',
      json: { transactionId: 'T1', amount: '100.00' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.raw).toBe('')
  })

  it('should keep the service up after the callback', async () => {
    await request(baseURL, '/payment/callback', { method: 'POST', json: {} })

    const res = await request(baseURL, '/users/admin', { headers: BEARER })
    expect(res.statusCode).toBe(200)
  })
})
