const authMiddleware = require('../auth.middleware')
const HttpStatus = require('http-status-codes')

test('should reject when req do not have an authorization header', () => {
  const mockReq = {
    header: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  }
  const mockRes = {
    json: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  }
  const mockNext = jest.fn()

  authMiddleware(mockReq, mockRes, mockNext)

  expect(mockReq.header).toHaveBeenCalledWith('authorization')
  expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
  expect(mockRes.send).toHaveBeenCalledWith({
    status: {
      code: 9500,
      description: 'Invalid authorization credentials',
    },
  })
  expect(mockNext).not.toHaveBeenCalled()
})

test('should pass when req have an authorization header', () => {
  const mockReq = {
    header: jest.fn().mockReturnValue('Bearer ...'),
  }
  const mockRes = {}
  const mockNext = jest.fn()

  authMiddleware(mockReq, mockRes, mockNext)

  expect(mockNext).toHaveBeenCalled()
})
