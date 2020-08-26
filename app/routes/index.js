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
router.use(authMiddleware)
router.post('/payment/qrcode/create', paymentController.qrcodeCreate)
router.get(
  '/payment/qrcode/billpayment/transactions/:transRef',
  paymentController.slipVerificationQR30
)
router.post('/payment/merchant/rtp/confirm', paymentController.BScanCPayment)
router.get('/users/:username', userController.findByUsername)

module.exports = router
