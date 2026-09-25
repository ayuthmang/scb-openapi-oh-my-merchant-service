const router = require('..')
const authMiddleware = require('../../middlewares/auth.middleware')
const authController = require('../../controllers/auth.controller')
const paymentController = require('../../controllers/payment.controller')
const userController = require('../../controllers/user.controller')

// The public contract the demo client and the SCB callback depend on.
// Renaming, removing or re-protecting any of these is a breaking change.
const EXPECTED_ROUTES = [
  {
    method: 'post',
    path: '/auth/login',
    protected: false,
    handler: authController.login,
  },
  {
    method: 'post',
    path: '/payment/callback',
    protected: false,
    handler: paymentController.paymentSucceedCallback,
  },
  {
    method: 'post',
    path: '/payment/qrcode/create',
    protected: true,
    handler: paymentController.qrcodeCreate,
  },
  {
    method: 'get',
    path: '/payment/qrcode/billpayment/transactions/:transRef',
    protected: true,
    handler: paymentController.slipVerificationQR30,
  },
  {
    method: 'post',
    path: '/payment/merchant/rtp/confirm',
    protected: true,
    handler: paymentController.BScanCPayment,
  },
  {
    method: 'get',
    path: '/users/:username',
    protected: true,
    handler: userController.findByUsername,
  },
]

const actualRoutes = router.stack
  .filter((layer) => layer.route)
  .map((layer) => ({
    method: Object.keys(layer.route.methods)[0],
    path: layer.route.path,
    handles: layer.route.stack.map((routeLayer) => routeLayer.handle),
  }))

describe('route table', () => {
  it('should register exactly the expected routes', () => {
    expect(
      actualRoutes.map(({ method, path }) => `${method.toUpperCase()} ${path}`)
    ).toEqual(
      EXPECTED_ROUTES.map(
        ({ method, path }) => `${method.toUpperCase()} ${path}`
      )
    )
  })

  it('should register one method per route', () => {
    router.stack
      .filter((layer) => layer.route)
      .forEach((layer) => {
        expect(Object.keys(layer.route.methods)).toHaveLength(1)
      })
  })

  it('should not register router-wide middleware', () => {
    // Regression: `router.use(authMiddleware)` also intercepted unmatched
    // paths, which made the 404 handler unreachable.
    expect(router.stack.filter((layer) => !layer.route)).toEqual([])
  })

  describe.each(EXPECTED_ROUTES)('$method $path', (expected) => {
    const actual = () =>
      actualRoutes.find(
        (route) =>
          route.method === expected.method && route.path === expected.path
      )

    it('should end in the right controller', () => {
      const { handles } = actual()
      expect(handles[handles.length - 1]).toBe(expected.handler)
    })

    it(
      expected.protected
        ? 'should run the auth middleware first'
        : 'should be public',
      () => {
        const { handles } = actual()
        if (expected.protected) {
          expect(handles).toEqual([authMiddleware, expected.handler])
        } else {
          expect(handles).toEqual([expected.handler])
        }
      }
    )
  })
})
