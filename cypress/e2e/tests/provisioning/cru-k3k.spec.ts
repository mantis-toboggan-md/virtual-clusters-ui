import ClusterManagerCreatePagePo from '@rancher/cypress/e2e/po/edit/provisioning.cattle.io.cluster/create/cluster-create.po';

import CruK3kPo from '../../po/cru-k3k.po';

const HOST_CLUSTER = 'e2e-generic';

describe('cluster creation', () => {
  before(()=>{
    cy.loginPrime();

    cy.uninstallK3k(HOST_CLUSTER);
  })

  beforeEach(() => {
    cy.loginPrime();
  });

  it('shows a card for the k3k provisioner', { tags: ['@adminUser', '@standardUser'] }, () => {
    ClusterManagerCreatePagePo.goTo('_');
    const clusterCreate = new ClusterManagerCreatePagePo();

    clusterCreate.waitForPage();

    clusterCreate.gridElementExistanceByName('K3K', 'be.visible');
  });

  it('offers admins an Install K3k button when a cluster without k3k is selected', { tags: ['@adminUser'] }, () => {
    const cruK3k = CruK3kPo.goToCreate();

    cruK3k.selectHostCluster(HOST_CLUSTER);
    cruK3k.installK3kButton().self().should('be.visible');
  });

  it('does not allow standard users to select clusters without k3k installed', { tags: ['@standardUser'] }, () => {
    const cruK3k = CruK3kPo.goToCreate();

    cruK3k.hostClusterOptionLabels().should('not.include', HOST_CLUSTER);
  });
});
