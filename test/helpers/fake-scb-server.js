const http = require('http')

/**
 * Canned responses shaped like the SCB sandbox, keyed by `METHOD path`.
 * A path ending in `/*` matches any single trailing segment.
 */
const DEFAULT_ROUTES = {
  'POST /partners/sandbox/v1/oauth/token': {
    status: 200,
    body: {
      status: { code: 1000, description: 'Success' },
      data: {
        accessToken: 'fake-access-token',
        tokenType: 'Bearer',
        expiresIn: 1800,
        expiresAt: 1600000000,
      },
    },
  },
  'POST /partners/sandbox/v1/payment/qrcode/create': {
    status: 200,
    body: {
      status: { code: 1000, description: 'Success' },
      data: {
        qrRawData: '00020101021230...',
        qrImage: 'iVBORw0KGgo=',
      },
    },
  },
  'GET /partners/sandbox/v1/payment/billpayment/transactions/*': {
    status: 200,
    body: {
      status: { code: 1000, description: 'Success' },
      data: { transRef: 'fake-trans-ref', amount: '100.00' },
    },
  },
  'POST /partners/sandbox/v1/payment/merchant/rtp/confirm': {
    status: 200,
    body: {
      status: { code: 1000, description: 'Success' },
      data: { transactionId: 'fake-transaction-id' },
    },
  },
}

const NOT_FOUND = {
  status: 404,
  body: { status: { code: 404, description: 'Fake SCB: no such route' } },
}

/**
 * Start a local HTTP server that impersonates the SCB API.
 *
 * Every request is recorded, so a test can assert exactly what the service
 * sent upstream: method, path, query, headers and JSON body.
 *
 * @returns {Promise<FakeScbServer>}
 */
const startFakeScbServer = () =>
  new Promise((resolve) => {
    const overrides = {}
    const requests = []

    const findRoute = (method, pathname) => {
      const exact = `${method} ${pathname}`
      const wildcard = `${method} ${pathname.replace(/\/[^/]+$/, '/*')}`
      return (
        overrides[exact] ||
        overrides[wildcard] ||
        DEFAULT_ROUTES[exact] ||
        DEFAULT_ROUTES[wildcard] ||
        NOT_FOUND
      )
    }

    const server = http.createServer((req, res) => {
      let raw = ''
      req.on('data', (chunk) => (raw += chunk))
      req.on('end', () => {
        const url = new URL(req.url, 'http://fake-scb')
        const recorded = {
          method: req.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          headers: req.headers,
          body: raw ? JSON.parse(raw) : undefined,
        }
        requests.push(recorded)

        const route = findRoute(req.method, url.pathname)
        if (route.drop) {
          // Simulate the upstream vanishing mid-request: no response at all.
          req.socket.destroy()
          return
        }
        res.writeHead(route.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(route.body))
      })
    })

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()

      /** @typedef {typeof fake} FakeScbServer */
      const fake = {
        baseURL: `http://127.0.0.1:${port}`,
        requests,

        /** The most recent request whose `METHOD path` starts with `prefix`. */
        lastRequest(prefix) {
          return [...requests]
            .reverse()
            .find((r) => `${r.method} ${r.path}`.startsWith(prefix))
        },

        /** Answer `METHOD path` with `status` and `body` until `reset()`. */
        respondWith(route, status, body) {
          overrides[route] = { status, body }
        },

        /** Destroy the connection for `METHOD path` until `reset()`. */
        dropConnection(route) {
          overrides[route] = { drop: true }
        },

        reset() {
          requests.length = 0
          Object.keys(overrides).forEach((key) => delete overrides[key])
        },

        close() {
          return new Promise((done) => server.close(done))
        },
      }
      resolve(fake)
    })
  })

module.exports = { startFakeScbServer, DEFAULT_ROUTES }
