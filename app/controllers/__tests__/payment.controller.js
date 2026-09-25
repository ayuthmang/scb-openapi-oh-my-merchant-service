jest.mock('../../utils/scb-api.instance', () => ({
  post: jest.fn(),
  get: jest.fn(),
}))
jest.mock('../../../lib/socket', () => ({ broadcastPaymentSucceed: jest.fn() }))
jest.mock('../../../config/scb-api.config', () => ({
  BILLER_ID: '123456789012345',
}))

const scbAPIInstance = require('../../utils/scb-api.instance')
const socket = require('../../../lib/socket')
const paymentController = require('../payment.controller')
const {
  createReq,
  createRes,
  UUID_V4,
} = require('../../../test/helpers/express-mocks')

const AUTHORIZATION = 'Bearer aToken'

const scbSuccess = (data) => ({
  status: 200,
  data: { status: { code: 1000, description: 'Success' }, data },
})

const scbHttpError = (status, data) => ({
  isAxiosError: true,
  response: { status, data },
})

const unreachable = () =>
  Object.assign(new Error('connect ECONNREFUSED'), { isAxiosError: true })

beforeEach(() => {
  jest.clearAllMocks()
})

describe('qrcodeCreate', () => {
  const call = async (body = { amount: '100.00', ref3: 'ABC123' }) => {
    const res = createRes()
    await paymentController.qrcodeCreate(
      createReq({ body, headers: { authorization: AUTHORIZATION } }),
      res
    )
    return res
  }

  it('should ask SCB for a Thai QR against the biller id', async () => {
    scbAPIInstance.post.mockResolvedValue(scbSuccess({ qrRawData: 'raw' }))

    await call()

    const [path, body, config] = scbAPIInstance.post.mock.calls[0]
    expect(path).toBe('/partners/sandbox/v1/payment/qrcode/create')
    expect(body).toEqual({
      qrType: 'PP',
      ppType: 'BILLERID',
      ppId: '123456789012345',
      amount: '100.00',
      ref1: '1234567890',
      ref2: '1234567890',
      ref3: 'ABC123',
    })
    expect(config.headers.authorization).toBe(AUTHORIZATION)
    expect(config.headers.requestUId).toMatch(UUID_V4)
  })

  it('should relay the SCB response as-is', async () => {
    const upstream = scbSuccess({ qrRawData: 'raw', qrImage: 'base64' })
    scbAPIInstance.post.mockResolvedValue(upstream)

    const res = await call()

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(upstream.data)
  })

  it('should relay an SCB error', async () => {
    scbAPIInstance.post.mockRejectedValue(
      scbHttpError(400, { status: { code: 4101, description: 'Bad amount' } })
    )

    const res = await call({ amount: '-1' })

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      status: { code: 4101, description: 'Bad amount' },
    })
  })

  it('should answer 502 when SCB is unreachable', async () => {
    scbAPIInstance.post.mockRejectedValue(unreachable())

    const res = await call()

    expect(res.statusCode).toBe(502)
  })
})

describe('paymentSucceedCallback', () => {
  const payload = { transactionId: 'abc', amount: '100.00' }

  it('should end the response before broadcasting', async () => {
    const res = createRes()
    socket.broadcastPaymentSucceed.mockImplementation(() => {
      expect(res.end).toHaveBeenCalled()
    })

    await paymentController.paymentSucceedCallback(
      createReq({ body: payload }),
      res
    )

    expect(res.ended).toBe(true)
    expect(socket.broadcastPaymentSucceed).toHaveBeenCalledTimes(1)
  })

  it('should broadcast the SCB payload unchanged', async () => {
    await paymentController.paymentSucceedCallback(
      createReq({ body: payload }),
      createRes()
    )

    expect(socket.broadcastPaymentSucceed).toHaveBeenCalledWith(payload)
  })

  it('should swallow a broadcast failure after the response has ended', async () => {
    socket.broadcastPaymentSucceed.mockImplementation(() => {
      throw new Error('socket exploded')
    })
    const res = createRes()

    await expect(
      paymentController.paymentSucceedCallback(
        createReq({ body: payload }),
        res
      )
    ).resolves.toBeUndefined()
    expect(res.ended).toBe(true)
  })
})

describe('slipVerificationQR30', () => {
  const call = async (query = {}) => {
    const res = createRes()
    await paymentController.slipVerificationQR30(
      createReq({
        params: { transRef: 'REF123' },
        query,
        headers: { authorization: AUTHORIZATION },
      }),
      res
    )
    return res
  }

  it('should look up the transaction with the default sending bank', async () => {
    scbAPIInstance.get.mockResolvedValue(scbSuccess({ transRef: 'REF123' }))

    await call()

    const [path, config] = scbAPIInstance.get.mock.calls[0]
    expect(path).toBe(
      '/partners/sandbox/v1/payment/billpayment/transactions/REF123'
    )
    expect(config.params).toEqual({ sendingBank: '014' })
    expect(config.headers.authorization).toBe(AUTHORIZATION)
    expect(config.headers.requestUId).toMatch(UUID_V4)
  })

  it('should let the client override the sending bank', async () => {
    scbAPIInstance.get.mockResolvedValue(scbSuccess({}))

    await call({ sendingBank: '002' })

    expect(scbAPIInstance.get.mock.calls[0][1].params).toEqual({
      sendingBank: '002',
    })
  })

  it('should forward only the sending bank, not arbitrary query params', async () => {
    scbAPIInstance.get.mockResolvedValue(scbSuccess({}))

    await call({ sendingBank: '002', injected: 'x' })

    expect(scbAPIInstance.get.mock.calls[0][1].params).toEqual({
      sendingBank: '002',
    })
  })

  it('should relay the SCB response as-is', async () => {
    const upstream = scbSuccess({ transRef: 'REF123', amount: '100.00' })
    scbAPIInstance.get.mockResolvedValue(upstream)

    const res = await call()

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(upstream.data)
  })

  it('should relay an SCB error', async () => {
    scbAPIInstance.get.mockRejectedValue(
      scbHttpError(404, { status: { code: 4404, description: 'Not found' } })
    )

    const res = await call()

    expect(res.statusCode).toBe(404)
    expect(res.body.status.code).toBe(4404)
  })

  it('should answer 502 when SCB is unreachable', async () => {
    scbAPIInstance.get.mockRejectedValue(unreachable())

    const res = await call()

    expect(res.statusCode).toBe(502)
  })
})

describe('BScanCPayment', () => {
  const body = { qrData: 'customer-qr', transactionAmount: '250.00' }

  const call = async () => {
    const res = createRes()
    const next = jest.fn()
    await paymentController.BScanCPayment(
      createReq({ body, headers: { authorization: AUTHORIZATION } }),
      res,
      next
    )
    return { res, next }
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should confirm the payment against the biller id', async () => {
    // moment() reads the clock through Date.now.
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date(2026, 8, 25, 10, 30, 45).getTime())
    scbAPIInstance.post.mockResolvedValue(scbSuccess({}))

    await call()

    const [path, sent, config] = scbAPIInstance.post.mock.calls[0]
    expect(path).toBe('/partners/sandbox/v1/payment/merchant/rtp/confirm')
    expect(sent).toEqual({
      qrData: 'customer-qr',
      payeeBillerId: '123456789012345',
      transactionAmount: '250.00',
      reference1: 'ABCDEFGHI',
      partnerTransactionId: '12345678901234520260925103045ABCDEF',
    })
    expect(config.headers.authorization).toBe(AUTHORIZATION)
    expect(config.headers.requestUId).toMatch(UUID_V4)
  })

  it('should relay the SCB response as-is', async () => {
    const upstream = scbSuccess({ transactionId: 'T1' })
    scbAPIInstance.post.mockResolvedValue(upstream)

    const { res, next } = await call()

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual(upstream.data)
    expect(next).not.toHaveBeenCalled()
  })

  it('should relay an SCB error', async () => {
    scbAPIInstance.post.mockRejectedValue(
      scbHttpError(409, { status: { code: 4409, description: 'Duplicate' } })
    )

    const { res, next } = await call()

    expect(res.statusCode).toBe(409)
    expect(res.body.status.code).toBe(4409)
    expect(next).not.toHaveBeenCalled()
  })

  it('should answer 502 when SCB is unreachable', async () => {
    scbAPIInstance.post.mockRejectedValue(unreachable())

    const { res } = await call()

    expect(res.statusCode).toBe(502)
  })

  it('should hand a non-HTTP error to the error handler', async () => {
    const bug = new TypeError('something broke')
    scbAPIInstance.post.mockRejectedValue(bug)

    const { res, next } = await call()

    expect(next).toHaveBeenCalledWith(bug)
    expect(res.status).not.toHaveBeenCalled()
  })
})
