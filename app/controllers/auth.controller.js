const HttpStatus = require('http-status-codes')
const { v4: uuidv4 } = require('uuid')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:auth.controller'
)

const authorizer = require('../services/auth.service')
const scbAPIInstance = require('../utils/scb-api.instance')
const scbAPIConfig = require('../../config/scb-api.config')

module.exports.login = async function login(req, res) {
  // TODO: validate request body
  debug('Got a request body from client')
  const { email, password } = req.body
  if (!authorizer(email, password)) {
    res.status(HttpStatus.UNAUTHORIZED).send({
      status: {
        code: 9500,
        description: 'Invalid authorization credentials',
      },
    })
  }

  try {
    debug('POST to /partners/sandbox/v1/oauth/token')
    const scbAPIResponse = await scbAPIInstance.post(
      '/partners/sandbox/v1/oauth/token',
      {
        applicationKey: scbAPIConfig.API_KEY,
        applicationSecret: scbAPIConfig.API_SECRET,
      },
      {
        headers: {
          requestUId: uuidv4(),
        },
      }
    )
    debug('Got a response data from /partners/sandbox/v1/oauth/token')
    const responseData = scbAPIResponse.data
    // const { accessToken, tokenType, expiresIn, expiresAt } = data.data
    debug('Send all field data back to client')
    res.status(scbAPIResponse.status).send({ ...responseData })
  } catch (err) {
    debug('error', err)
  }
}
