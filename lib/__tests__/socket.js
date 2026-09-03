const socket = require('../socket')

const createFakeServer = () => ({
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
})

describe('broadcastPaymentSucceed', () => {
  it('should not throw before the socket server is initialised', () => {
    // Regression: this used to be undefined until the first client connected,
    // so the public payment callback crashed the process.
    expect(() =>
      socket.broadcastPaymentSucceed({ any: 'payload' })
    ).not.toThrow()
    expect(socket.broadcastPaymentSucceed({ any: 'payload' })).toBe(false)
  })

  it('should emit to every subscriber once the server is initialised', () => {
    const fakeServer = createFakeServer()
    socket.initSocketServer(fakeServer)

    const payload = { transactionId: 'abc' }
    expect(socket.broadcastPaymentSucceed(payload)).toBe(true)
    expect(fakeServer.emit).toHaveBeenCalledWith('payment-succeed', payload)
  })

  it('should emit even when no client has connected yet', () => {
    const fakeServer = createFakeServer()
    socket.initSocketServer(fakeServer)
    // `on('connection')` is registered but never fired.
    expect(fakeServer.on).toHaveBeenCalledWith(
      'connection',
      expect.any(Function)
    )

    expect(socket.broadcastPaymentSucceed({ a: 1 })).toBe(true)
    expect(fakeServer.emit).toHaveBeenCalledTimes(1)
  })
})
