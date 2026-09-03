const safeCompare = require('safe-compare')

const users = require('../data/users.json')

/**
 * @param {string} email
 * @param {string} password
 * @returns {boolean}
 */
module.exports.authorizer = (email, password) => {
  const user = users.find((item) => item.email === email)
  // NOTE: returning early leaks whether an email is registered through the
  // response timing, which defeats the constant-time compare below. A real
  // deployment should compare against a dummy value instead.
  if (!user) return false

  const userMatches = safeCompare(email, user.email)
  const passwordMatches = safeCompare(password, user.password)
  return userMatches && passwordMatches
}
