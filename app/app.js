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

// TODO: error development
// error handler
app.use(function (err, req, res, next) {
  if (err) {
    return res.status(err.status).send({
      status: {
        code: 9990,
        description: 'Service not available, or currently under maintenance',
      },
    })
  }

  // default error
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
    status: {
      code: 9990,
      description: 'Service not available, or currently under maintenance',
    },
  })

  // // set locals, only providing error in development
  // res.locals.message = err.message
  // res.locals.error = req.app.get('env') === 'development' ? err : {}

  // // render the error page
  // res.status(err.status || 500)
  // // res.render('error')
})

module.exports = app
