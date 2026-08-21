import { extendConfig } from '@rancher/cypress/extend-config';


if (!process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL must be set to the Rancher instance to test against');
}

// TEST_BASE_URL is the Rancher instance itself (same as API env var)
// baseUrl for cypress tests will need to include /dashboard unless the UI is running locally
let baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');

// TODO nb pass SKIP_SETUP env var so misleading message is not shown when cypress starts
if (!baseUrl.endsWith('/dashboard') && !baseUrl.includes('https://localhost')) {
  baseUrl += '/dashboard';
}

// defaultConfig to see which env vars are supported
export default extendConfig({
  env: { extensionUrl: process.env.EXTENSION_URL },
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/tests/**/*.spec.ts',
  },
});
