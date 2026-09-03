import CruK3kPo from '../../po/cru-k3k.po';
import { login } from '../../utils/login';

const HOST_CLUSTER = 'e2e-generic';

/**
 * Behaviour that only shows up once the k3k controller is present in the host cluster.
 *
 * k3k is installed once for the whole spec and removed again afterwards, so that specs which
 * expect a k3k-free cluster (cru-k3k.spec.ts) still pass in the same run
 */
describe('host cluster with k3k installed', { tags: ['@adminUser'] }, () => {
  before(() => {
    login();
    cy.installK3k(HOST_CLUSTER);
  });


  beforeEach(() => login());

  it('does not offer to install k3k in a host cluster that already has it', () => {
    const cruK3k = CruK3kPo.goToCreate();

    cruK3k.selectHostCluster(HOST_CLUSTER);

    cruK3k.installK3kButton().self().should('not.exist');
  });

  it('does not warn about the k3k version when the chart matches the extension', () => {
    const cruK3k = CruK3kPo.goToCreate();

    cruK3k.selectHostCluster(HOST_CLUSTER);

    // cy.installK3k installs the k3k major/minor matching this extension, so the mismatch
    // banner must stay hidden
    cruK3k.versionMismatchBanner().self().should('not.exist');
  });
});
