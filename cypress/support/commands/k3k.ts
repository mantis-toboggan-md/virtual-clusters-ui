import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import Kubectl from '@rancher/cypress/e2e/po/components/kubectl.po';

import { K3K_CHART_NAME, K3K_CHART_NAMESPACE, K3K_REPO_NAME } from '../../../pkg/virtual-clusters/utils/k3k-chart';

const K3K_UPSTREAM_CHART_NAME = 'k3k';

const HELM_TIMEOUT = 600000;

let markerCount = 0;

/**
 * Type a command into the shell and block until it finishes.
 *
 * The terminal has no notion of "command finished", so echo a marker after the command and wait
 * for it to be printed. The marker is typed split across two quoted strings so that the echoed
 * command line itself doesn't satisfy the assertion, and it's numbered so that a marker left in
 * the scrollback by an earlier command doesn't either.
 */
const executeAndWait = (kubectl: Kubectl, command: string, timeout = HELM_TIMEOUT): Kubectl => {
  const marker = `K3KDONE${ ++markerCount }`;

  kubectl.executeShellCommand(`${ command }; echo "K3KDONE""${ markerCount }"`, 0);

  return kubectl.waitForOutput(marker, timeout);
};

const openHostClusterShell = (clusterName: string): Kubectl => {
  const clusterList = new ClusterManagerListPagePo();

  ClusterManagerListPagePo.goTo('_');
  clusterList.waitForPage();

  return clusterList.openKubectlShell(clusterName);
};

/**
 * Install k3k into the given host cluster via its kubectl shell.
 *
 * The chart version installed is constrained to the major/minor of the extension version - see
 * `k3kChartVersion` in cypress.config.ts
 * TODO when running the std user test suite need to attempt login as admin to do this command and the uninstall
 *
 * @param clusterName name of the host cluster as shown in the cluster management list
 */
Cypress.Commands.add('installK3k', (clusterName: string) => {
  const repoUrl = Cypress.env('k3kRepoUrl');
  const chartVersion = Cypress.env('k3kChartVersion');

  const kubectl = openHostClusterShell(clusterName);

  executeAndWait(kubectl, `helm repo add ${ K3K_REPO_NAME } ${ repoUrl } --force-update`, 120000);
  executeAndWait(kubectl, `helm repo update ${ K3K_REPO_NAME }`, 120000);
  executeAndWait(
    kubectl,
    `helm upgrade --install ${ K3K_CHART_NAME } ${ K3K_REPO_NAME }/${ K3K_UPSTREAM_CHART_NAME } --namespace ${ K3K_CHART_NAMESPACE } --create-namespace --version '${ chartVersion }' --devel --wait --timeout 8m`
  );

  kubectl.waitForOutput('STATUS: deployed');
  kubectl.closeTerminal();
});

/**
 * Remove k3k from the given host cluster via its kubectl shell, returning the cluster to a state
 * where the extension offers to install k3k again.
 *
 * Also removes the ClusterRepo the extension's "Install K3k" button creates, so this cleans up
 * after either install path. Every step tolerates the resource being absent
 *
 * @param clusterName name of the host cluster as shown in the cluster management list
 */
Cypress.Commands.add('uninstallK3k', (clusterName: string) => {
  const kubectl = openHostClusterShell(clusterName);

  executeAndWait(kubectl, `helm uninstall ${ K3K_CHART_NAME } --namespace ${ K3K_CHART_NAMESPACE } --ignore-not-found --wait --timeout 5m`);
  executeAndWait(kubectl, `kubectl delete namespace ${ K3K_CHART_NAMESPACE } --ignore-not-found`, 300000);
  executeAndWait(kubectl, `kubectl delete clusterrepos.catalog.cattle.io ${ K3K_REPO_NAME } --ignore-not-found`, 120000);
  executeAndWait(kubectl, `helm repo remove ${ K3K_REPO_NAME } || true`, 120000);

  kubectl.closeTerminal();
});
