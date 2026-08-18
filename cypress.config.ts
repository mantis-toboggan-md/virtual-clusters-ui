import { defineConfig } from 'cypress';

const baseUrl = (process.env.TEST_BASE_URL || 'https://localhost:8005').replace(/\/$/, '');

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
