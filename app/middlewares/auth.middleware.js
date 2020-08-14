const HttpStatus = require('http-status-codes')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:auth.middleware'
)

/**
 * Just verify the if the request have the 'Authorization' field and starts with 'Bearer' else reject all.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const authMiddleware = (req, res, next) => {
  debug('authMiddleware')
  if (
    typeof req.header('authorization') === 'string' &&
    req.header('authorization').startsWith('Bearer')
  ) {
    // CAUTION! This is just a quick move.
    // Since we're not store any data in this service.
    // In production, you might be verify some genearted token before going through next middlewares.
    next() // allows to go to next route.
    return
  }

  res.status(HttpStatus.UNAUTHORIZED).send({
    status: {
      code: 9500,
      description: 'Invalid authorization credentials',
    },
  })
}

module.exports = authMiddleware
