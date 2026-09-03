import PagePo from '@rancher/cypress/e2e/po/pages/page.po';
import LabeledSelectPo from '@rancher/cypress/e2e/po/components/labeled-select.po';
import LabeledInputPo from '@rancher/cypress/e2e/po/components/labeled-input.po';
import AsyncButtonPo from '@rancher/cypress/e2e/po/components/async-button.po';
import BannersPo from '@rancher/cypress/e2e/po/components/banners.po';
import CruResourcePo from '@rancher/cypress/e2e/po/components/cru-resource.po';
import NameNsDescriptionPo from '@rancher/cypress/e2e/po/components/name-ns-description.po';
import ClusterManagerCreatePagePo from '@rancher/cypress/e2e/po/edit/provisioning.cattle.io.cluster/create/cluster-create.po';

export default class CruK3kPo extends PagePo {
  /**
   * Navigate to cluster creation and open the k3k provisioner's form
   */
  static goToCreate(clusterId = '_'): CruK3kPo {
    ClusterManagerCreatePagePo.goTo(clusterId);
    const clusterCreate = new ClusterManagerCreatePagePo();

    clusterCreate.waitForPage();

    // TODO nb https://github.com/rancher/virtual-clusters-ui/issues/205
    clusterCreate.resourceDetail().cruResource().selectSubType(1, 0).click();

    const cruK3k = new CruK3kPo();

    cruK3k.waitForHostClusterLoad();

    return cruK3k;
  }

  constructor() {
    super('[data-testid="cluster-manager-virtual-cluster"]');
  }

  cruResource(): CruResourcePo {
    return new CruResourcePo(this.self());
  }

  nameNsDescription(): NameNsDescriptionPo {
    return new NameNsDescriptionPo(this.self());
  }

  hostClusterSelect(): LabeledSelectPo {
    return new LabeledSelectPo('[data-testid="k3k-host-cluster-select"]', this.self());
  }

  // options are rendered from cluster display names fetched async after the
  // form loads, so match by label rather than a per-option testid
  selectHostCluster(label: string): Cypress.Chainable {
    this.hostClusterSelect().toggle();

    return this.hostClusterSelect().clickOptionWithLabel(label);
  }

  hostClusterOptionLabels(): Cypress.Chainable<string[]> {
    this.hostClusterSelect().toggle();

    return this.hostClusterSelect().getOptionsAsStrings();
  }

  installK3kButton(): AsyncButtonPo {
    return new AsyncButtonPo('[data-testid="install-k3k-button"]', this.self());
  }

  policySelect(): LabeledSelectPo {
    return new LabeledSelectPo('[data-testid="k3k-policy-select"]', this.self());
  }

  selectPolicy(label: string): Cypress.Chainable {
    this.policySelect().toggle();

    return this.policySelect().clickOptionWithLabel(label);
  }

  targetNamespaceSelect(): LabeledSelectPo {
    // LabeledSelectWithCreate renders the select inside its own wrapper, which is what carries
    // the testid
    return new LabeledSelectPo('[data-testid="k3k-target-namespace"] .v-select', this.self());
  }

  // in create mode the target namespace field swaps the select out for a text input
  targetNamespaceCreateInput(): LabeledInputPo {
    return new LabeledInputPo(this.self().find('[data-testid="k3k-target-namespace"] input'));
  }

  /**
   * Pick the target namespace's "create a new namespace" option and type a name into it
   */
  createTargetNamespace(namespace: string): Cypress.Chainable {
    this.targetNamespaceSelect().toggle();
    this.targetNamespaceSelect().clickOptionWithLabel('Create a new Namespace');

    return this.targetNamespaceCreateInput().set(namespace);
  }

  /**
   * Banner shown when the k3k chart in the host cluster doesn't match the extension's major/minor
   */
  versionMismatchBanner(): BannersPo {
    return new BannersPo('[data-testid="k3k-version-banner"]', this.self());
  }

  save(): AsyncButtonPo {
    return this.cruResource().saveOrCreate();
  }

  // the host cluster select's data-testid lands on the inner v-select (LabeledSelect
  // has inheritAttrs: false), but the loading spinner is a sibling of v-select under
  // the outer .labeled-select wrapper, so we have to search from there instead
  // TODO nb https://github.com/rancher/virtual-clusters-ui/issues/205
  waitForHostClusterLoad(timeout = 20000): Cypress.Chainable {
    return this.hostClusterSelect().self()
      .closest('.labeled-select')
      .find('.icon-spinner', { timeout })
      .should('not.exist');
  }
}
