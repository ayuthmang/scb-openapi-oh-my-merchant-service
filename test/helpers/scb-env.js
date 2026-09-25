/**
 * Fake SCB credentials used by every test that loads the real config.
 *
 * Setting all of them explicitly, rather than relying on a local `.env`,
 * guarantees that no test can ever reach the real SCB sandbox with real keys.
 */
const SCB_TEST_ENV = {
  SCB_API_KEY: 'test-api-key',
  SCB_API_SECRET: 'test-api-secret',
  SCB_BILLER_ID: '123456789012345',
  SCB_MERCHANT_ID: 'test-merchant-id',
  SCB_MERCHANT_TERMINAL_ID: 'test-terminal-id',
}

/**
 * Environment for a process that talks to the fake SCB server at `baseURL`.
 *
 * Loopback is excluded from any configured proxy so that axios reaches the
 * fake server directly, both locally and in CI.
 *
 * @param {string} baseURL
 * @returns {Record<string, string>}
 */
const scbEnvFor = (baseURL) => ({
  ...SCB_TEST_ENV,
  SCB_API_BASE_URL: baseURL,
  NO_PROXY: '127.0.0.1,localhost',
  no_proxy: '127.0.0.1,localhost',
})

/**
 * Apply `scbEnvFor(baseURL)` to `process.env`.
 * Call it before requiring the app, since the config is read at load time.
 *
 * @param {string} baseURL
 */
const applyScbEnv = (baseURL) => {
  Object.assign(process.env, scbEnvFor(baseURL))
}

module.exports = { SCB_TEST_ENV, scbEnvFor, applyScbEnv }
