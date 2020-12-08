const authMiddleware = require('../../app/middlewares/auth.middleware')
const HttpStatus = require('http-status-codes')

describe('auth middleware', () => {
  it('should reject when req do not have an authorization header', () => {
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

  it('should pass when req have an authorization header', () => {
    const mockReq = {
      header: jest.fn().mockReturnValue('Bearer ...'),
    }
    const mockRes = {}
    const mockNext = jest.fn()

    authMiddleware(mockReq, mockRes, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })
})
