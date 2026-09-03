const express = require('express')
const router = express.Router()

const authMiddleware = require('../middlewares/auth.middleware')

const authController = require('../controllers/auth.controller')
const paymentController = require('../controllers/payment.controller')
const userController = require('../controllers/user.controller')

// public routes
router.post('/auth/login', authController.login)
router.post('/payment/callback', paymentController.paymentSucceedCallback)

// protected routes
// `router.use(authMiddleware)` would also intercept unmatched paths, so every
// unknown route answered 401 and the 404 handler was unreachable. Mounting the
// middleware per route keeps the same protection without swallowing the rest.
router.post(
  '/payment/qrcode/create',
  authMiddleware,
  paymentController.qrcodeCreate
)
router.get(
  '/payment/qrcode/billpayment/transactions/:transRef',
  authMiddleware,
  paymentController.slipVerificationQR30
)
router.post(
  '/payment/merchant/rtp/confirm',
  authMiddleware,
  paymentController.BScanCPayment
)
router.get('/users/:username', authMiddleware, userController.findByUsername)

module.exports = router
