const axios = require('axios').default
const { v4: uuidv4 } = require('uuid')

const { API_KEY, API_SECRET, BASE_URL } = require('../../config/scb-api.config')

const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    contentType: 'application/json',
    resourceOwnerId: API_KEY,
    // requestUId: uuidv4(),
    acceptLanguage: 'EN',
  },
})

module.exports = instance
