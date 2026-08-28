import { PROVIDER, PARENT_CLUSTER, K3K_NAMESPACE } from '../labels-annotations';
import { MODES } from './shared';

type K3kCoords = { parent: string, ns: string, name: string };

const CACHE_TTL = 60 * 1000;

/**
 * Cached in-flight promises, keyed by k3k cluster coordinates.
 *
 * The promise is cached rather than the resolved value, so concurrent callers - the tab's
 * `enabled` predicate and the tab component's own guard, or two Tabbed instances - share a
 * single request instead of racing.
 */
const modeCache = new Map<string, { at: number, promise: Promise<string | undefined> }>();

/**
 * Coordinates of the k3k.io.cluster backing a provisioning cluster, or null if this isn't a
 * k3k cluster or the annotations we need aren't all there.
 *
 * These annotations live on the provisioning.cattle.io.cluster and are written by the UI at
 * create time - see CruK3KCluster.
 */
export function k3kCoords(cluster: any): K3kCoords | null {
  const annotations = cluster?.metadata?.annotations || {};

  if (annotations[PROVIDER] !== 'k3k') {
    return null;
  }

  const parent = annotations[PARENT_CLUSTER];
  const ns = annotations[K3K_NAMESPACE];
  const name = cluster?.metadata?.name;

  return parent && ns && name ? { parent, ns, name } : null;
}

/**
 * `spec.mode` of the k3k.io.cluster backing a provisioning cluster, or undefined if it isn't
 * a k3k cluster or the lookup fails.
 *
 * The k3k CR lives in the host cluster, so it has to be fetched through that cluster's proxy.
 */
export function getK3kMode(store: any, cluster: any): Promise<string | undefined> {
  const coords = k3kCoords(cluster);

  if (!coords) {
    return Promise.resolve(undefined);
  }

  const { parent, ns, name } = coords;
  const key = `${ parent }/${ ns }/${ name }`;
  const cached = modeCache.get(key);

  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return cached.promise;
  }

  const promise = store.dispatch('management/request', {
    url:    `/k8s/clusters/${ parent }/v1/k3k.io.clusters/${ ns }/${ name }`,
    method: 'GET',
  })
    .then((k3kCluster: any) => k3kCluster?.spec?.mode)
    .catch(() => {
      // Don't cache a failure - a transient error shouldn't hide the tab until the TTL is up.
      // A 404 resolves rather than rejects, and is cached: a cluster that isn't there won't
      // start existing.
      modeCache.delete(key);

      return undefined;
    });

  modeCache.set(key, { at: Date.now(), promise });

  return promise;
}

export async function isHcpCluster(store: any, cluster: any): Promise<boolean> {
  return await getK3kMode(store, cluster) === MODES.HCP;
}

export function clearK3kModeCache(): void {
  modeCache.clear();
}
