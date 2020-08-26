const HttpStatus = require('http-status-codes')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:auth.middleware'
)

/**
 * This is just an example of how to implements middleware for verifying request.
 *
 * This middleware just verify a request that must have an 'Authorization' field in the request header
 * and must starts with 'Bearer' will be passed, else rejected all.
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
    // Since we're not store any data in this service.
    // In production, you might be verify some genearted token before going through next middlewares.
    next() // Verified, allows to go to next route.
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
