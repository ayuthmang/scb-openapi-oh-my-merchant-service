require('dotenv').config()

const createError = require('http-errors')
const express = require('express')
const logger = require('morgan')
const HttpStatus = require('http-status-codes')

const routes = require('./routes')

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use(routes)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(HttpStatus.NOT_FOUND))
})

// error handler
app.use(function (err, req, res, next) {
  // Once the response has started, only the default handler can close it.
  if (res.headersSent) {
    return next(err)
  }

  const isEnvProduction = process.env.NODE_ENV === 'production'
  const status =
    err.status || err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR

  // default error
  const response = {
    status: {
      code: 9990,
      description: 'Service not available, or currently under maintenance',
    },
  }

  if (status === HttpStatus.NOT_FOUND) {
    response.status = {
      code: 404, // TBD: swap in the matching SCB generic response code
      description: 'Resource not found',
    }
  }

  // set locals, only providing error in development
  if (!isEnvProduction) {
    response['error'] = err.stack
  }
  res.status(status).send(response)
})

module.exports = app
