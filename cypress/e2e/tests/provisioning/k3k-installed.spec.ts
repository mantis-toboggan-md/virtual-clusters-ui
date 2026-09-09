import CruK3kPo from '../../po/cru-k3k.po';

const HOST_CLUSTER = 'e2e-generic';

/**
 * Behaviour that only shows up once the k3k controller is present in the host cluster.
 *
 * k3k is installed once for the whole spec and removed again afterwards, so that specs which
 * expect a k3k-free cluster (cru-k3k.spec.ts) still pass in the same run
 */
describe('host cluster with k3k installed', { tags: ['@adminUser'] }, () => {
  before(() => {
    cy.loginPrime();

    cy.installK3k(HOST_CLUSTER);
  });

  beforeEach(() => cy.loginPrime());

  it('does not offer to install k3k in a host cluster that already has it', () => {
    // check the cluster provisioning form
    const cruK3k = CruK3kPo.goToCreate();

    cruK3k.selectHostCluster(HOST_CLUSTER);

    cruK3k.installK3kButton().self().should('not.exist');
  });
});
