import { ClusterCreatePo } from '../../po/pages/cluster-create.po';

describe('cluster creation', () => {
  const clusterCreate = new ClusterCreatePo();

  beforeEach(() => {
    cy.login();
  });

  it('shows a card for the k3k provisioner', () => {
    clusterCreate.goTo();
    clusterCreate.providerCard('K3K').should('be.visible');
  });
});
