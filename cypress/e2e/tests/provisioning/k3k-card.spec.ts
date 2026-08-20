import ClusterManagerCreatePagePo from '@rancher/cypress/e2e/po/edit/provisioning.cattle.io.cluster/create/cluster-create.po';
import { LoginPagePo } from '@rancher/cypress/e2e/po/pages/login-page.po';

describe('cluster creation', { tags: ['@adminUser', '@standardUser'] }, () => {
  beforeEach(() => {
    // cy.login()'s default navigation checks for the "Welcome to Rancher"
    // message, which Rancher Prime doesn't render - navigate to the login
    // page ourselves and pass skipNavigation instead.
    LoginPagePo.goTo();
    const loginPage = new LoginPagePo();

    loginPage.checkIsCurrentPage();

    cy.login(undefined, undefined, false, true);
  });

  it('shows a card for the k3k provisioner', () => {
    ClusterManagerCreatePagePo.goTo('local');
    const clusterCreate = new ClusterManagerCreatePagePo('local');

    clusterCreate.gridElementExistanceByName('K3K', 'be.visible');
  });
});
