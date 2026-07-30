/**
 * Annotations applied to provisioning.cattle.io.cluster resources
 * created by the virtual clusters extension.
 */
export const ANNOTATIONS = {
  /** Host cluster's norman cluster id */
  PARENT_CLUSTER:         'ui.rancher/parent-cluster',
  /** Host cluster display name */
  PARENT_CLUSTER_DISPLAY: 'ui.rancher/parent-cluster-display',
  /** Namespace of the k3k cluster in the host cluster */
  K3K_NAMESPACE:          'ui.rancher/k3k-namespace',
  /** Prevents k3s-upgrade-controller from running */
  IMPORTED_VERSION_MGMT:  'rancher.io/imported-cluster-version-management',
};

/**
 * Labels applied to provisioning.cattle.io.cluster resources
 * for SSP-compatible sorting and filtering.
 */
export const LABELS = {
  /** Parent cluster display name (duplicated from annotation for SSP sort support) */
  PARENT_CLUSTER_DISPLAY: 'ui.rancher/parent-cluster-display',
};
