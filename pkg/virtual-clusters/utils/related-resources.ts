import { CONFIG_MAP, WORKLOAD_TYPES } from '@shell/config/types';
import { EditableRelatedResource, EditableRelatedResourceSave } from '@shell/core/types';
import { PROVIDER, PARENT_CLUSTER, K3K_NAMESPACE } from '../labels-annotations';
import { K3K } from '../types';

const VIRTUAL_CLUSTER_GROUP = 'k3k.resourceGraph.groups.virtualCluster';
const IMPORT_JOB_GROUP = 'k3k.resourceGraph.groups.importJob';
const IMPORT_CONFIG_MAP_GROUP = 'k3k.resourceGraph.groups.importConfigMap';

/**
 * Builds the steve url of a resource in the host cluster
 *
 * The management store only holds resources of the local cluster, so the host cluster is reached
 * through its proxy
 *
 * @param hostClusterId management cluster id of the host cluster, from the `ui.rancher/parent-cluster` annotation
 * @param type steve type of the resource, for example `batch.job`
 * @param namespace namespace of the resource
 * @param name name of the resource
 * @returns the url, relative to the rancher server
 */
function hostUrl(hostClusterId: string, type: string, namespace: string, name: string): string {
  return `/k8s/clusters/${ hostClusterId }/v1/${ type }s/${ namespace }/${ name }`;
}

/**
 * Fetches a resource from the host cluster
 *
 * The response is not classified into a model: a model in the management store would look up its
 * own related resources, and save, in the local cluster
 *
 * @param cluster a model in the management store, which makes the request
 * @param hostClusterId management cluster id of the host cluster
 * @param type steve type of the resource
 * @param namespace namespace of the resource
 * @param name name of the resource
 * @returns the resource as steve returns it, or null where it does not exist or the user can not fetch it
 */
async function findInHost(cluster: any, hostClusterId: string, type: string, namespace: string, name: string): Promise<any | null> {
  try {
    return await cluster.$dispatch('request', { url: hostUrl(hostClusterId, type, namespace, name), method: 'GET' });
  } catch (e: any) {
    if (e?._status !== 404) {
      console.warn(`Failed to fetch ${ type } ${ namespace }/${ name } from cluster ${ hostClusterId }`, e); // eslint-disable-line no-console
    }

    return null;
  }
}

/**
 * Creates the `save` of an editable related resource in the host cluster
 *
 * The `save` puts the yaml in the editor to the host cluster. No store keeps the resource current,
 * so the response is copied onto it for the editor to show
 *
 * @param cluster a model in the management store, which makes the request
 * @param hostClusterId management cluster id of the host cluster
 * @returns the `save`, resolving to the saved resource
 */
function saveInHost(cluster: any, hostClusterId: string): EditableRelatedResourceSave {
  return async(ctx) => {
    const { type, metadata } = ctx.resource;
    const saved = await cluster.$dispatch('request', {
      url:     hostUrl(hostClusterId, type, metadata?.namespace, metadata?.name),
      method:  'PUT',
      headers: { 'content-type': 'application/yaml', accept: 'application/json' },
      data:    ctx.editorState.yaml[ctx.nodeId] ?? ctx.initialYaml[ctx.nodeId],
    });

    Object.keys(ctx.resource).filter((key) => !(key in saved)).forEach((key) => delete ctx.resource[key]);
    Object.assign(ctx.resource, saved);

    return ctx.resource;
  };
}

/**
 * Fetches the resources in the host cluster behind a virtual cluster's provisioning cluster: the
 * k3k cluster, and the Job and ConfigMap that imported it into Rancher
 *
 * These are named after the provisioning cluster, in the namespace recorded on it when the virtual
 * cluster was created
 *
 * @param cluster the provisioning cluster
 * @returns an editable related resource for each of these that exists, or none when `cluster` is
 * not a virtual cluster. Each has a heading of its own, as the Job and ConfigMap share a name
 */
export async function fetchVirtualClusterResources(cluster: any): Promise<EditableRelatedResource[]> {
  const annotations = cluster.metadata?.annotations || {};
  const hostClusterId = annotations[PARENT_CLUSTER];
  const namespace = annotations[K3K_NAMESPACE];
  const name = cluster.metadata?.name;

  if (annotations[PROVIDER] !== 'k3k' || !hostClusterId || !namespace || !name) {
    return [];
  }

  const [virtualCluster, importJob, importConfigMap] = await Promise.all([
    findInHost(cluster, hostClusterId, K3K.CLUSTER, namespace, name),
    findInHost(cluster, hostClusterId, WORKLOAD_TYPES.JOB, namespace, `import-${ name }`),
    findInHost(cluster, hostClusterId, CONFIG_MAP, namespace, `import-${ name }`),
  ]);
  const save = saveInHost(cluster, hostClusterId);

  return ([
    [virtualCluster, VIRTUAL_CLUSTER_GROUP],
    [importJob, IMPORT_JOB_GROUP],
    [importConfigMap, IMPORT_CONFIG_MAP_GROUP],
  ] as [any, string][])
    .filter(([resource]) => !!resource)
    .map(([resource, groupKey]) => ({
      resource, groupKey, save
    }));
}
