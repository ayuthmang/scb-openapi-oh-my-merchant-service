const querystring = require('querystring')
const { v4: uuidv4 } = require('uuid')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:payment.controller'
)

const socket = require('../../lib/socket')
const scbAPIInstance = require('../utils/scb-api.instance')
const scbAPIConfig = require('../../config/scb-api.config')

/**
 * TBD:
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.qrcodeCreate = async (req, res) => {
  debug('Got a POST request from client')
  const reqHeaders = req.headers // we surely have an authorization header
  const reqBody = req.body

  // https://developer.scb/#/documents/api-reference-index/qr-payments/post-qrcode-create.html
  try {
    debug('POST to /partners/sandbox/v1/payment/qrcode/create')
    const scbAPIResponse = await scbAPIInstance.post(
      '/partners/sandbox/v1/payment/qrcode/create',
      {
        qrType: 'PP',
        ppType: 'BILLERID',
        ppId: scbAPIConfig.BILLER_ID,
        amount: reqBody.amount,
        ref1: '1234567890',
        ref2: '1234567890',
        ref3: reqBody.ref3, // must be [AZ09], up to 20 length
      },
      {
        headers: {
          requestUId: uuidv4(),
          authorization: reqHeaders.authorization,
        },
      }
    )

    debug('Got a response from POST /partners/sandbox/v1/payment/qrcode/create')
    // const { qrRawData, qrImage } = scbAPIResponse.data.data
    const responseData = scbAPIResponse.data
    res.status(scbAPIResponse.status).send({ ...responseData })

    // in case of you wanna respond with image
    // res.type('png').status(200).end(Buffer.from(qrImage, 'base64'))
  } catch (err) {
    debug('An error occurs', err)
    const response = err.response
    res.status(response.status).send({ ...response.data })
  }
}

/**
 * Handle payment callback from scb api and pass forward all through client.
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.paymentSucceedCallback = async (req, res) => {
  // received body from scb api
  debug('received request from scb api')
  const body = req.body

  // To avoiding the request timeout on the gateway, we end the response of callback.
  // We need to respond that we're done for you.
  debug('ending response from scb api payment succeed callback')
  res.end()

  // broadcast to client
  debug('calling socket to broadcast request body to subscribers')
  socket.broadcastPaymentSucceed(body)
}

/**
 * https://developer.scb/#/documents/api-reference-index/qr-payments/get-billpayment-transactions.html
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.slipVerificationQR30 = async (req, res) => {
  const reqHeaders = req.headers
  const reqParams = req.params
  const { transRef } = reqParams
  const reqQuery = req.query

  try {
    const debugQueryStr = querystring.stringify(reqQuery)
    debug(
      `GET /partners/sandbox/v1/payment/billpayment/transactions/${transRef}${
        debugQueryStr.length > 0 ? `?${querystring.stringify(reqQuery)}` : ''
      }}`
    )
    const scbAPIResponse = await scbAPIInstance.get(
      `/partners/sandbox/v1/payment/billpayment/transactions/${transRef}`,
      {
        params: {
          sendingBank: reqQuery.sendingBank || '014', // in case of the client want to change the query, this will override the sending bank
        },
        headers: {
          requestUId: uuidv4(),
          authorization: reqHeaders.authorization,
        },
      }
    )

    debug(
      `Got a response from GET /partners/sandbox/v1/payment/billpayment/transactions/${transRef}?${querystring.stringify(
        reqQuery
      )}`
    )
    const responseData = scbAPIResponse.data
    res.status(scbAPIResponse.status).send({ ...responseData })
  } catch (err) {
    debug('An error occurs', err)
    const response = err.response
    res.status(response.status).send({ ...response.data })
  }
}
