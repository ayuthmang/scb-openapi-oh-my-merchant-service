const users = require('../data/users.json')

/**
 * Find by user by username, returns user or undefined.
 *
 * @param {string} username
 * @returns {object | undefined}
 */
module.exports.findByUsername = (username) => {
  return users.find((user) => user.username === username)
}

/**
 * Find user by email, returns user or undefined.
 *
 * @param {string} email
 * @returns {object | undefined}
 */
module.exports.findByEmail = (email) => {
  return users.find((user) => user.email == email)
}
