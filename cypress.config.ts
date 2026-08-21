import { extendConfig } from '@rancher/cypress/extend-config';


if (!process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL must be set to the Rancher instance to test against');
}

// // TEST_BASE_URL is the Rancher instance itself (also used bare, as the API
// // root, by the e2e shell scripts) - the UI is canonically served under
// // /dashboard, so normalize it here rather than requiring every caller to
// // remember the suffix.
let baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');

if (!baseUrl.endsWith('/dashboard')) {
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
