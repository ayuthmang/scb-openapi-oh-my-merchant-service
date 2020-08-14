const scbAPIInstance = require('../utils/scb-api.instance')
const { v4: uuidv4 } = require('uuid')
const scbApiConfig = require('../../config/scb-api.config')
const debug = require('debug')(
  'scb-openapi-oh-my-merchant-service:payment.controller'
)

module.exports.qrcodeCreate = async function qrcodeCreate(req, res) {
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
        ppId: scbApiConfig.BILLER_ID,
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
    debug('An error occurs')
    const response = err.response
    res.status(response.status).send({ ...response.data })
  }
}
