export class ClusterCreatePo {
  static url(clusterId = 'local') {
    return `/c/${ clusterId }/manager/provisioning.cattle.io.cluster/create`;
  }

  goTo(clusterId = 'local') {
    return cy.visit(ClusterCreatePo.url(clusterId));
  }

  providerCard(label: string) {
    return cy.get(`[data-testid="cluster-manager-create-grid-${ label }"]`);
  }
}
