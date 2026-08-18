Cypress.Commands.add('login', (
  username = Cypress.env('username'),
  password = Cypress.env('password'),
) => {
  cy.visit('/auth/login');
  cy.get('[data-testid="local-login-username"]').type(username);
  cy.get('[data-testid="local-login-password"]').type(password);
  cy.get('[data-testid="login-submit"]').click();
  cy.url().should('not.include', '/auth/login');
});

export {};
