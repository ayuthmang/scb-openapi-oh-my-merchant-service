const debug = require('debug')('scb-openapi-oh-my-merchant-service:socket')

/**
 * The Socket.IO server, captured by `initSocketServer`.
 *
 * @type {SocketIO.Server | null}
 */
let socketServerInstance = null

/**
 * Socket.IO config.
 *
 * @type {SocketIO.ServerOptions}
 */
module.exports.config = {
  // resource: '/socket.io/eiei', // in case you want a custom resource path
}

/**
 * @param {SocketIO.Server} socketServer
 */
module.exports.initSocketServer = (socketServer) => {
  socketServerInstance = socketServer

  // Middleware for validating a token or something else.
  // This is just a boilerplate, so we skip this section.
  socketServer.use((socket, next) => {
    debug('socket middleware')
    // const query = socket.handshake.query // If you want to read the query params.
    next() // Validated, let the client through.
  })

  socketServer.on('connection', (socket) => {
    debug('a user connected')

    socket.on('disconnect', () => {
      debug('a user disconnected')
    })
  })
}

/**
 * Broadcast a succeeded payment to every subscriber.
 *
 * This must stay on the module scope. Defining it inside the `connection`
 * handler left it undefined until the first client connected, so the public
 * payment callback threw a TypeError after the response had already ended,
 * which took the whole process down.
 *
 * @param {any} data
 * @returns {boolean} whether the broadcast was emitted
 */
module.exports.broadcastPaymentSucceed = (data) => {
  if (!socketServerInstance) {
    debug(
      'no socket server initialised, skipping the payment-succeed broadcast'
    )
    return false
  }

  debug('emitting payment-succeed to all subscribers')
  socketServerInstance.emit('payment-succeed', data)
  return true
}
