const safeCompare = require('safe-compare')

const users = require('../data/users.json')

/**
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
module.exports.authorizer = (email, password) => {
  const user = users.find((item) => item.email === email)
  if (!user) return false

  const userMatches = safeCompare(email, user.email)
  const passwordMatches = safeCompare(password, user.password)
  return userMatches & passwordMatches
}
