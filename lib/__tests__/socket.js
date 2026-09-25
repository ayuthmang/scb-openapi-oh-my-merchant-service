const http = require('http')
const socketIO = require('socket.io')
const socketIOClient = require('socket.io-client')

const { listen, close } = require('../../test/helpers/http-request')

// Each describe gets a fresh copy, since the module holds the server.
const loadSocket = () => {
  let socket
  jest.isolateModules(() => {
    socket = require('../socket')
  })
  return socket
}

const createFakeServer = () => ({
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
})

describe('config', () => {
  it('should be a plain options object for Socket.IO', () => {
    expect(loadSocket().config).toEqual({})
  })
})

describe('broadcastPaymentSucceed', () => {
  it('should not throw before the socket server is initialized', () => {
    // Regression: this used to be undefined until the first client connected,
    // so the public payment callback crashed the process.
    const socket = loadSocket()

    expect(() =>
      socket.broadcastPaymentSucceed({ any: 'payload' })
    ).not.toThrow()
    expect(socket.broadcastPaymentSucceed({ any: 'payload' })).toBe(false)
  })

  it('should emit to every subscriber once the server is initialized', () => {
    const socket = loadSocket()
    const fakeServer = createFakeServer()
    socket.initSocketServer(fakeServer)

    const payload = { transactionId: 'abc' }
    expect(socket.broadcastPaymentSucceed(payload)).toBe(true)
    expect(fakeServer.emit).toHaveBeenCalledWith('payment-succeed', payload)
  })

  it('should emit even when no client has connected yet', () => {
    const socket = loadSocket()
    const fakeServer = createFakeServer()
    socket.initSocketServer(fakeServer)

    expect(socket.broadcastPaymentSucceed({ a: 1 })).toBe(true)
    expect(fakeServer.emit).toHaveBeenCalledTimes(1)
  })
})

describe('initSocketServer', () => {
  it('should let every handshake through', () => {
    const fakeServer = createFakeServer()
    loadSocket().initSocketServer(fakeServer)
    const [middleware] = fakeServer.use.mock.calls[0]
    const next = jest.fn()

    middleware({ handshake: {} }, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('should listen for disconnects on each connection', () => {
    const fakeServer = createFakeServer()
    loadSocket().initSocketServer(fakeServer)
    const [event, onConnection] = fakeServer.on.mock.calls[0]
    const client = { on: jest.fn() }

    onConnection(client)

    expect(event).toBe('connection')
    expect(client.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    const [, onDisconnect] = client.on.mock.calls[0]
    expect(() => onDisconnect()).not.toThrow()
  })
})

describe('with a real Socket.IO server and client', () => {
  let socket
  let httpServer
  let ioServer
  let baseURL
  const clients = []

  const connect = () =>
    new Promise((resolve, reject) => {
      const client = socketIOClient(baseURL, {
        forceNew: true,
        reconnection: false,
      })
      clients.push(client)
      client.on('connect', () => resolve(client))
      client.on('connect_error', reject)
    })

  const nextEvent = (client, event) =>
    new Promise((resolve) => client.once(event, resolve))

  beforeAll(async () => {
    socket = loadSocket()
    httpServer = http.createServer()
    ioServer = socketIO(httpServer, socket.config)
    socket.initSocketServer(ioServer)
    baseURL = await listen(httpServer)
  })

  afterAll(async () => {
    clients.forEach((client) => client.close())
    ioServer.close()
    await close(httpServer).catch(() => {})
  })

  it('should deliver payment-succeed to a connected client', async () => {
    const client = await connect()
    const received = nextEvent(client, 'payment-succeed')

    socket.broadcastPaymentSucceed({ transactionId: 'T1', amount: '100.00' })

    await expect(received).resolves.toEqual({
      transactionId: 'T1',
      amount: '100.00',
    })
  })

  it('should deliver the same event to every connected client', async () => {
    const [first, second] = await Promise.all([connect(), connect()])
    const received = Promise.all([
      nextEvent(first, 'payment-succeed'),
      nextEvent(second, 'payment-succeed'),
    ])

    socket.broadcastPaymentSucceed({ transactionId: 'T2' })

    await expect(received).resolves.toEqual([
      { transactionId: 'T2' },
      { transactionId: 'T2' },
    ])
  })

  it('should keep broadcasting after a client disconnects', async () => {
    const leaving = await connect()
    const staying = await connect()
    leaving.close()
    const received = nextEvent(staying, 'payment-succeed')

    expect(socket.broadcastPaymentSucceed({ transactionId: 'T3' })).toBe(true)
    await expect(received).resolves.toEqual({ transactionId: 'T3' })
  })
})
