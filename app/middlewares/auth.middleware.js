const HttpStatus = require('http-status-codes')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:auth.middleware'
)

/**
 * Just verify the if the request have the 'Authorization' field, otherwise reject all.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Express.NextFunction} next
 */
const authMiddleware = (req, res, next) => {
  next()
  // if (typeof req.header('authorization') === 'string') {
  //   next()
  // }

  // res.status(HttpStatus.UNAUTHORIZED).send({
  //   status: {
  //     code: 9500,
  //     description: 'Invalid authorization credentials',
  //   },
  // })
}

module.exports = authMiddleware
