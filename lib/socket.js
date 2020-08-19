const debug = require('debug')('scb-openapi-oh-my-merchant-service:socket')

/**
 * Socket.IO config.
 *
 * @type {SocketIO.ServerOptions}
 * @returns {SocketIO.ServerOptions}
 */
module.exports.config = {
  // resource: '/socket.io/eiei', // in case of you want a custom resource path
}

/**
 * @param {SocketIO.Server} socket
 */
module.exports.initSocketServer = (socketServer) => {
  // Middleware for validate token or something else.
  // This is just a boilerplate, I'll skip this section
  socketServer.use((socket, next) => {
    debug('socket middleware')
    // const query = socket.handshake.query // In case you wanna get query params.
    next() // validated and let client go through.
  })

  socketServer.on('connection', (socket) => {
    debug('a user connected')
    const handleOnDisconnect = () => {
      debug('a user disconnected')
    }

    const broadcastPaymentSucceed = (data) => {
      debug('broadcastPaymentSucceed')

      // sending to all clients, include sender
      // https://gist.github.com/alexpchin/3f257d0bb813e2c8c476
      // socketServer.emit('/payment/succeed', 'hello from broadcast payment')

      debug('emiting payment-succeed to subscribers')
      socket.emit('payment-succeed', data)
    }
    socket.on('disconnect', handleOnDisconnect)

    // expose function calling on controller when receives payment succeed callback
    module.exports.broadcastPaymentSucceed = broadcastPaymentSucceed
  })
}
