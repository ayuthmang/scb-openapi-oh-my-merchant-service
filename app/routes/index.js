const express = require('express')
const router = express.Router()

const authMiddleware = require('../middlewares/auth.middleware')
const authController = require('../controllers/auth.controller')
const paymentController = require('../controllers/payment.controller')

// authen route
router.post('/auth/login', authController.login)

// protect routes
router.use(authMiddleware);
router.post('/payment/qrcode/create', paymentController.qrcodeCreate)

module.exports = router
