// Starts the real server the way `yarn start` and the Procfile do, then
// rehearses the whole demo against it. Only SCB is faked.
const { spawn } = require('child_process')
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const socketIOClient = require('socket.io-client')

const { startFakeScbServer } = require('../../test/helpers/fake-scb-server')
const { scbEnvFor } = require('../../test/helpers/scb-env')
const { request } = require('../../test/helpers/http-request')

jest.setTimeout(30000)

const WWW = path.join(__dirname, '..', 'www.js')
const children = []

/**
 * Spawn `bin/www.js` and wait until it is listening or has exited.
 *
 * @param {Record<string, string>} env
 * @returns {Promise<{ child, address?: string, kind?: string, exitCode?: number, stdout: () => string, stderr: () => string }>}
 */
const startServer = (env) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [WWW], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DEBUG: 'scb-openapi-oh-my-merchant-service:server',
        ...env,
      },
    })
    children.push(child)

    let stdout = ''
    let stderr = ''
    const result = (extra) => ({
      child,
      stdout: () => stdout,
      stderr: () => stderr,
      ...extra,
    })

    const timer = setTimeout(() => {
      reject(new Error(`bin/www.js did not start in time.\n${stderr}`))
    }, 15000)

    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      const match = stderr.match(/Listening on (port|pipe) (\S+)/)
      if (match) {
        clearTimeout(timer)
        resolve(result({ kind: match[1], address: match[2] }))
      }
    })
    child.on('exit', (exitCode) => {
      clearTimeout(timer)
      resolve(result({ exitCode }))
    })
  })

const exited = (child) =>
  new Promise((resolve) => {
    if (child.exitCode !== null) return resolve(child.exitCode)
    child.on('exit', resolve)
  })

afterAll(() => {
  children
    .filter((child) => child.exitCode === null)
    .forEach((child) => child.kill())
})

describe('the demo, end to end', () => {
  let fakeScb
  let server
  let baseURL
  let dashboard
  let token

  beforeAll(async () => {
    fakeScb = await startFakeScbServer()
    server = await startServer({ ...scbEnvFor(fakeScb.baseURL), PORT: '0' })
    expect(server.kind).toBe('port')
    baseURL = `http://127.0.0.1:${server.address}`

    // Stands in for the merchant screen waiting on `payment-succeed`.
    dashboard = socketIOClient(baseURL, {
      forceNew: true,
      reconnection: false,
    })
    await new Promise((resolve, reject) => {
      dashboard.on('connect', resolve)
      dashboard.on('connect_error', reject)
    })
  })

  afterAll(async () => {
    dashboard && dashboard.close()
    server && server.child.kill()
    fakeScb && (await fakeScb.close())
  })

  it('1. logs the merchant in and returns an SCB token', async () => {
    const res = await request(baseURL, '/auth/login', {
      method: 'POST',
      json: { email: 'admin@xyz.com', password: 'admin@xyz.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.user).toEqual({
      id: 1,
      email: 'admin@xyz.com',
      username: 'admin',
    })
    token = res.body.data.accessToken
    expect(token).toBe('fake-access-token')
  })

  it('2. creates a Thai QR for the customer to scan', async () => {
    const res = await request(baseURL, '/payment/qrcode/create', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      json: { amount: '100.00', ref3: 'DEMO123' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.qrRawData).toBeTruthy()
    expect(res.body.data.qrImage).toBeTruthy()
  })

  it('3. pushes the SCB payment confirmation to the merchant screen', async () => {
    const pushed = new Promise((resolve) =>
      dashboard.once('payment-succeed', resolve)
    )
    const confirmation = {
      transactionId: 'T-DEMO',
      amount: '100.00',
      billPaymentRef3: 'DEMO123',
    }

    const res = await request(baseURL, '/payment/callback', {
      method: 'POST',
      json: confirmation,
    })

    expect(res.statusCode).toBe(200)
    await expect(pushed).resolves.toEqual(confirmation)
  })

  it('4. verifies the slip', async () => {
    const res = await request(
      baseURL,
      '/payment/qrcode/billpayment/transactions/REF123',
      { headers: { authorization: `Bearer ${token}` } }
    )

    expect(res.statusCode).toBe(200)
    expect(res.body.status.code).toBe(1000)
  })

  it('5. takes a B Scan C payment', async () => {
    const res = await request(baseURL, '/payment/merchant/rtp/confirm', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      json: { qrData: 'customer-qr', transactionAmount: '250.00' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data.transactionId).toBe('fake-transaction-id')
  })

  it('6. looks up the merchant profile', async () => {
    const res = await request(baseURL, '/users/admin', {
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body.data).not.toHaveProperty('password')
  })

  it('writes an access log line for each request', () => {
    expect(server.stdout()).toMatch(/POST \/auth\/login .*200/)
    expect(server.stdout()).toMatch(/POST \/payment\/callback .*200/)
  })

  it('is still running after the whole demo', async () => {
    const res = await request(baseURL, '/users/admin', {
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(server.child.exitCode).toBeNull()
  })
})

describe('the payment callback before any screen connects', () => {
  it('does not take the server down', async () => {
    // Regression: this exact request used to terminate the process.
    const server = await startServer({ PORT: '0' })
    const baseURL = `http://127.0.0.1:${server.address}`

    const res = await request(baseURL, '/payment/callback', {
      method: 'POST',
      json: { transactionId: 'T1' },
    })
    const after = await request(baseURL, '/there-is-no-such-route')

    expect(res.statusCode).toBe(200)
    expect(after.statusCode).toBe(404)
    expect(server.child.exitCode).toBeNull()
    server.child.kill()
  })
})

describe('startup', () => {
  it('listens on the port given by PORT', async () => {
    // Find a free port, release it, then ask the server to take it.
    const probe = http.createServer()
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
    const { port } = probe.address()
    await new Promise((resolve) => probe.close(resolve))

    const server = await startServer({ PORT: String(port) })

    expect(server.address).toBe(String(port))
    server.child.kill()
  })

  it('exits with a clear message when the port is taken', async () => {
    const first = await startServer({ PORT: '0' })

    const second = await startServer({ PORT: first.address })

    expect(second.exitCode).toBe(1)
    expect(second.stderr()).toContain(`Port ${first.address} is already in use`)
    first.child.kill()
  })

  it('exits non-zero when PORT is not a valid port', async () => {
    const server = await startServer({ PORT: '-1' })

    expect(server.exitCode).not.toBe(0)
    expect(server.exitCode).not.toBeNull()
  })

  const describeUnix = process.platform === 'win32' ? describe.skip : describe

  describeUnix('on a named pipe', () => {
    const pipe = path.join(
      os.tmpdir(),
      `oh-my-merchant-${process.pid}-${Date.now()}.sock`
    )

    afterAll(() => {
      fs.rmSync(pipe, { force: true })
    })

    it('listens on the pipe given by PORT', async () => {
      const server = await startServer({ PORT: pipe })

      expect(server.kind).toBe('pipe')
      expect(server.address).toBe(pipe)

      const res = await new Promise((resolve, reject) => {
        http
          .get({ socketPath: pipe, path: '/there-is-no-such-route' }, resolve)
          .on('error', reject)
      })
      res.resume()
      expect(res.statusCode).toBe(404)

      server.child.kill()
      await exited(server.child)
    })

    it('exits with a clear message when it cannot bind the pipe', async () => {
      // libuv reports a missing directory as EACCES for pipes.
      const unreachable = path.join(os.tmpdir(), 'no-such-dir', 'x.sock')

      const server = await startServer({ PORT: unreachable })

      expect(server.exitCode).toBe(1)
      expect(server.stderr()).toContain(
        `Pipe ${unreachable} requires elevated privileges`
      )
    })
  })
})
