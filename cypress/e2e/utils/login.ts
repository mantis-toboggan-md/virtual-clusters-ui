import { LoginPagePo } from '@rancher/cypress/e2e/po/pages/login-page.po';

/**
 * cy.login()'s default navigation checks for the "Welcome to Rancher" message, which Rancher Prime
 * doesn't render - navigate to the login page ourselves and pass skipNavigation instead.
 * TODO nb https://github.com/rancher/virtual-clusters-ui/issues/205
 */
export const login = () => {
  LoginPagePo.goTo();
  const loginPage = new LoginPagePo();

  loginPage.checkIsCurrentPage();

  cy.login(undefined, undefined, false, true);
};
