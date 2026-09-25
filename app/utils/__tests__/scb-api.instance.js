const { SCB_TEST_ENV } = require('../../../test/helpers/scb-env')

const loadInstance = () => {
  let instance
  jest.isolateModules(() => {
    instance = require('../scb-api.instance')
  })
  return instance
}

const originalEnv = process.env

beforeEach(() => {
  process.env = {
    ...originalEnv,
    ...SCB_TEST_ENV,
    SCB_API_BASE_URL: 'https://scb.example.test',
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('scb-api.instance', () => {
  it('should target the configured SCB base URL', () => {
    expect(loadInstance().defaults.baseURL).toBe('https://scb.example.test')
  })

  it('should identify the application as the resource owner', () => {
    expect(loadInstance().defaults.headers.resourceOwnerId).toBe('test-api-key')
  })

  it('should request English responses', () => {
    expect(loadInstance().defaults.headers.acceptLanguage).toBe('EN')
  })

  it('should not bake a requestUId into the defaults', () => {
    // Each call must supply its own, or every request would share one id.
    expect(loadInstance().defaults.headers).not.toHaveProperty('requestUId')
  })

  it('should expose the HTTP verbs the controllers use', () => {
    const instance = loadInstance()

    expect(typeof instance.get).toBe('function')
    expect(typeof instance.post).toBe('function')
  })
})
