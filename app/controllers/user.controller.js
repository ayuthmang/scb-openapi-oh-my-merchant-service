const HttpStatus = require('http-status-codes')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:user.controller'
)

const userService = require('../services/user.service')

module.exports.findByUsername = (req, res) => {
  debug('findByUsername')

  const usernameParam = req.params.username
  if (!usernameParam) {
    res.status(HttpStatus.NOT_FOUND).send({
      status: {
        code: 1101,
        description: 'Missing required parameters',
      },
    })
    return
  }

  debug('findByUsername `username`:', usernameParam)
  const user = userService.findByUsername(usernameParam)
  if (user) {
    // Avoid mutate the users object
    // and returns an object without password.
    const clonedUser = Object.assign({}, user)
    delete clonedUser.password

    const response = {
      status: {
        code: 1000,
        description: 'Success',
      },
      data: {
        ...clonedUser,
      },
    }
    res.status(HttpStatus.OK).send(response)
    return
  }

  res.status(HttpStatus.NOT_FOUND).send({
    status: {
      code: 404, // TBD: the status of code!
      description: 'Resource not found {username}',
    },
  })
}
