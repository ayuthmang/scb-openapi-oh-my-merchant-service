const HttpStatus = require('http-status-codes')

/**
 * Relay an error returned by the SCB API back to the client.
 *
 * Axios only populates `err.response` when the upstream actually answered.
 * On a timeout, a DNS failure or a dropped connection it is undefined, so
 * reading `err.response.status` throws a second error inside the catch block.
 * In an async handler that becomes an unhandled rejection, which terminates
 * the process on modern Node versions.
 *
 * @param {Express.Response} res
 * @param {Error & { response?: { status: number, data: any } }} err
 */
module.exports = (res, err) => {
  const response = err.response

  if (!response) {
    res.status(HttpStatus.BAD_GATEWAY).send({
      status: {
        code: 9990,
        description: 'Service not available, or currently under maintenance',
      },
    })
    return
  }

  res.status(response.status).send({ ...response.data })
}
