import { extendConfig } from '@rancher/cypress/extend-config';

// No sensible default: unlike rancher/dashboard (which runs its own Rancher
// dev server on :8005), this repo only builds/serves the extension package
// itself - there is no local Rancher instance to fall back to.
if (!process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL must be set to the Rancher instance to test against');
}

// TEST_BASE_URL is the Rancher instance itself (also used bare, as the API
// root, by the e2e shell scripts) - the UI is canonically served under
// /dashboard, so normalize it here rather than requiring every caller to
// remember the suffix.
let baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');

if (!baseUrl.endsWith('/dashboard')) {
  baseUrl += '/dashboard';
}

export default extendConfig({
  env: { extensionUrl: process.env.EXTENSION_URL },
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/tests/**/*.spec.ts',
  },
});
