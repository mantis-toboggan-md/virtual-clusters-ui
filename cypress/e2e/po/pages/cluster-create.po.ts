export class ClusterCreatePo {
  static url(clusterId = 'local') {
    return `/c/${ clusterId }/manager/provisioning.cattle.io.cluster/create`;
  }

  goTo(clusterId = 'local') {
    return cy.visit(ClusterCreatePo.url(clusterId));
  }

  // SelectIconGrid derives the testid from the card's rendered label, not
  // its stable provider id, so this selects on the (translated) label text.
  providerCard(label: string) {
    return cy.get(`[data-testid="cluster-manager-create-grid-${ label }"]`);
  }
}
