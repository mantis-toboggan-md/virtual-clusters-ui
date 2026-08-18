import { defineConfig } from 'cypress';

// Required for a local .env file to populate process.env before Cypress reads it.
require('dotenv').config();

// No sensible default: unlike rancher/dashboard (which runs its own Rancher
// dev server on :8005), this repo only builds/serves the extension package
// itself - there is no local Rancher instance to fall back to.
if (!process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL must be set to the Rancher instance to test against');
}

const baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');

export default defineConfig({
  // The served extension is plain HTTP while Rancher runs on HTTPS.
  chromeWebSecurity:     false,
  defaultCommandTimeout: process.env.TEST_TIMEOUT ? +process.env.TEST_TIMEOUT : 10000,
  retries:               {
    runMode:  2,
    openMode: 0,
  },
  screenshotOnRunFailure: process.env.TEST_NO_SCREENSHOTS !== 'true',
  video:                  process.env.TEST_NO_VIDEOS !== 'true',
  env:                    {
    username:     process.env.TEST_USERNAME || 'admin',
    password:     process.env.CATTLE_BOOTSTRAP_PASSWORD || process.env.TEST_PASSWORD,
    extensionUrl: process.env.EXTENSION_URL,
  },
  e2e: {
    baseUrl,
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/tests/**/*.spec.ts',
  },
});
