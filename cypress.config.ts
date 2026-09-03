import semver from 'semver';
import { extendConfig } from '@rancher/cypress/extend-config';

if (!process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL must be set to the Rancher instance to test against');
}

// TEST_BASE_URL is the Rancher instance itself (same as API env var)
// baseUrl for cypress tests will need to include /dashboard unless the UI is running locally
let baseUrl = process.env.TEST_BASE_URL.replace(/\/$/, '');
const localDevHosts = ['localhost', '127.0.0.1'];
const isLocalDevServer = localDevHosts.includes(new URL(baseUrl).hostname);

if (!baseUrl.endsWith('/dashboard') && !isLocalDevServer) {
  baseUrl += '/dashboard';
}

// k3k is installed by cy.installK3k() at the same major/minor as the extension under test, so
// that the two are always exercised as a matching pair. The range is deliberately prerelease
// inclusive - the extension ships release candidates (eg 1.2.0-rc2) and so does k3k
const extensionVersion = semver.coerce(require('./pkg/virtual-clusters/package.json').version);

if (!extensionVersion) {
  throw new Error('Could not read the extension version from pkg/virtual-clusters/package.json');
}

const major = semver.major(extensionVersion);
const minor = semver.minor(extensionVersion);
const k3kChartVersion = process.env.K3K_CHART_VERSION || `>=${ major }.${ minor }.0-0 <${ major }.${ minor + 1 }.0-0`;

export default extendConfig({
  env: {
    extensionUrl: process.env.EXTENSION_URL,
    k3kChartVersion,
    // helm repo for the k3k chart. `helm repo add` needs an index.yaml, so this is the charts
    // published from https://github.com/rancher/k3k, not the git repo itself
    k3kRepoUrl:   process.env.K3K_REPO_URL || 'https://rancher.github.io/k3k',
  },
  e2e: {
    baseUrl,
    specPattern: 'cypress/e2e/tests/**/*.spec.ts',
  }
});
