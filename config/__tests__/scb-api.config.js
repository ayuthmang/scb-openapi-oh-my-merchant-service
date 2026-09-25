const fs = require('fs')
const path = require('path')

const loadConfig = () => {
  let config
  jest.isolateModules(() => {
    config = require('../scb-api.config')
  })
  return config
}

const originalEnv = process.env

afterEach(() => {
  process.env = originalEnv
})

describe('scb-api.config', () => {
  it('should map each SCB_* variable to its config key', () => {
    process.env = {
      ...originalEnv,
      SCB_API_KEY: 'key',
      SCB_API_SECRET: 'secret',
      SCB_API_BASE_URL: 'https://scb.example.test',
      SCB_BILLER_ID: 'biller',
      SCB_MERCHANT_ID: 'merchant',
      SCB_MERCHANT_TERMINAL_ID: 'terminal',
    }

    expect(loadConfig()).toEqual({
      API_KEY: 'key',
      API_SECRET: 'secret',
      BASE_URL: 'https://scb.example.test',
      BILLER_ID: 'biller',
      MERCHANT_ID: 'merchant',
      MERCHANT_TERMINAL_ID: 'terminal',
    })
  })

  it('should leave a key undefined when its variable is unset', () => {
    process.env = { ...originalEnv }
    delete process.env.SCB_BILLER_ID

    expect(loadConfig().BILLER_ID).toBeUndefined()
  })
})

describe('.env.example', () => {
  const root = path.join(__dirname, '..', '..')
  const configSource = fs.readFileSync(
    path.join(root, 'config', 'scb-api.config.js'),
    'utf8'
  )
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8')

  const referenced = [...configSource.matchAll(/process\.env\.(\w+)/g)].map(
    (match) => match[1]
  )
  const documented = example
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0])

  it('should find the variables the config reads', () => {
    expect(referenced.length).toBeGreaterThan(0)
  })

  it.each(referenced)('should document %s', (name) => {
    expect(documented).toContain(name)
  })

  it('should not document variables the config never reads', () => {
    expect(documented.filter((name) => !referenced.includes(name))).toEqual([])
  })
})
