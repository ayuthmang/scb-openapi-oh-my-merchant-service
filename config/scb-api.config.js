const SCB_API_BASE_URL = process.env.SCB_API_BASE_URL || 'some fallback value'
const SCB_API_KEY = process.env.SCB_API_KEY || 'some fallback value'
const SCB_API_SECRET = process.env.SCB_API_SECRET || 'some fallback value'
const SCB_BILLER_ID = process.env.SCB_BILLER_ID || 'some fallback value'
const SCB_MERCHANT_ID = process.env.SCB_MERCHANT_ID || 'some fallback value'
const SCB_MERCHANT_TERMINAL_ID =
  process.env.SCB_MERCHANT_TERMINAL_ID || 'some fallback value'

module.exports = {
  API_KEY: SCB_API_KEY,
  API_SECRET: SCB_API_SECRET,
  BASE_URL: SCB_API_BASE_URL,
  BILLER_ID: SCB_BILLER_ID,
  MERCHANT_ID: SCB_MERCHANT_ID,
  MERCHANT_TERMINAL_ID: SCB_MERCHANT_TERMINAL_ID,
}
