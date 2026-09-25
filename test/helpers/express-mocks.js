/**
 * A chainable stand-in for `Express.Response` that records what was sent.
 */
const createRes = () => {
  const res = {
    statusCode: undefined,
    body: undefined,
    ended: false,
  }
  res.status = jest.fn((code) => {
    res.statusCode = code
    return res
  })
  res.send = jest.fn((payload) => {
    res.body = payload
    return res
  })
  res.end = jest.fn(() => {
    res.ended = true
    return res
  })
  return res
}

/**
 * A minimal `Express.Request`. `headers` are also served through `header()`,
 * case-insensitively, like Express does.
 *
 * @param {{ body?: any, params?: object, query?: object, headers?: object }} [init]
 */
const createReq = ({
  body = {},
  params = {},
  query = {},
  headers = {},
} = {}) => {
  const lowered = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  )
  return {
    body,
    params,
    query,
    headers: lowered,
    header: (name) => lowered[name.toLowerCase()],
  }
}

/** The RFC 4122 v4 shape `uuid.v4()` produces. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

module.exports = { createRes, createReq, UUID_V4 }
