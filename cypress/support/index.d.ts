// eslint-disable-next-line no-unused-vars
declare namespace Cypress {
  interface Chainable {
    /**
     * Install k3k into a host cluster using its kubectl shell
     * @param clusterName name of the host cluster as shown in the cluster management list
     */
    installK3k(clusterName: string): Chainable<void>;

    /**
     * Remove k3k, its namespace and its repo from a host cluster using its kubectl shell
     * @param clusterName name of the host cluster as shown in the cluster management list
     */
    uninstallK3k(clusterName: string): Chainable<void>;
  }
}
