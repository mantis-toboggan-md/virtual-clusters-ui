import ClusterManagerCreatePagePo from '@rancher/cypress/e2e/po/edit/provisioning.cattle.io.cluster/create/cluster-create.po';

describe('cluster creation', () => {
  beforeEach(() => {
    cy.login();
  });

  it('shows a card for the k3k provisioner', () => {
    ClusterManagerCreatePagePo.goTo('local');
    const clusterCreate = new ClusterManagerCreatePagePo('local');

    clusterCreate.gridElementExistanceByName('K3K', 'be.visible');
  });
});
