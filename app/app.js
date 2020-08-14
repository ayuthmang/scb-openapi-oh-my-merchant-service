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
  next(createError(HttpStatus.BAD_REQUEST))
})

// error handler
app.use(function (err, req, res, next) {
  const isEnvProduction = process.env.NODE_ENV === 'production'
  // default error
  const response = {
    status: {
      code: 9990,
      description: 'Service not available, or currently under maintenance',
    },
  }
  // set locals, only providing error in development
  if (!isEnvProduction) {
    response['error'] = err.stack
  }
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(response)
})

module.exports = app
