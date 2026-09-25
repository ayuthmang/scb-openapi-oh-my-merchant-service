const http = require('http')

/**
 * Minimal HTTP client for exercising the service in tests.
 *
 * Objects passed as `json` are serialized with the matching content type;
 * JSON responses are parsed, anything else is returned as raw text.
 *
 * @param {string} baseURL e.g. `http://127.0.0.1:3000`
 * @param {string} path
 * @param {{ method?: string, headers?: object, json?: any, body?: string }} [options]
 * @returns {Promise<{ statusCode: number, headers: object, body: any, raw: string }>}
 */
const request = (baseURL, path, options = {}) =>
  new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) }
    let payload = options.body
    if (options.json !== undefined) {
      payload = JSON.stringify(options.json)
      headers['content-type'] = 'application/json'
    }

    const req = http.request(
      new URL(path, baseURL),
      { method: options.method || 'GET', headers },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          const isJSON = /json/.test(res.headers['content-type'] || '')
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: isJSON && raw ? JSON.parse(raw) : raw || undefined,
            raw,
          })
        })
      }
    )
    req.on('error', reject)
    if (payload !== undefined) req.write(payload)
    req.end()
  })

/**
 * Listen on an ephemeral loopback port and resolve with the base URL.
 *
 * @param {http.Server} server
 * @returns {Promise<string>}
 */
const listen = (server) =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`)
    })
  })

/** @param {http.Server} server */
const close = (server) => new Promise((resolve) => server.close(resolve))

module.exports = { request, listen, close }
