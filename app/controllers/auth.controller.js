const HttpStatus = require('http-status-codes')
const { v4: uuidv4 } = require('uuid')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:auth.controller'
)

const { authorizer } = require('../services/auth.service')
const scbAPIInstance = require('../utils/scb-api.instance')
const scbAPIConfig = require('../../config/scb-api.config')
const { findByEmail } = require('../services/user.service')

module.exports.login = async (req, res) => {
  // TODO: validate request body
  debug('Receive a POST request body from client')
  const { email, password } = req.body
  if (!authorizer(email, password)) {
    res.status(HttpStatus.UNAUTHORIZED).send({
      status: {
        code: 9500,
        description: 'Invalid authorization credentials',
      },
    })
    return
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
    debug('Receive a response data from /partners/sandbox/v1/oauth/token')
    const responseData = scbAPIResponse.data
    debug('Send all field data back to client')
    const user = findByEmail(email)
    // Avoid mutate the users object
    // and returns an object without password.
    const clonedUser = Object.assign({}, user)
    delete clonedUser.password

    const response = {
      status: { ...responseData.status },
      data: {
        ...responseData.data,
        user, // frontend ask for it!
      },
    }
    res.status(scbAPIResponse.status).send(response)
  } catch (err) {
    debug('An error occurs', err)
    const response = err.response
    res.status(response.status).send({ ...response.data })
  }
}
