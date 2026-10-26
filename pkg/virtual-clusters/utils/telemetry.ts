import { CAPI } from '@shell/config/types';
import { TelemetryParams } from '@shell/core/types';
import { K3K } from '../types';
import { MODES } from './shared';
import { PROVIDER, K3K_MODE } from '../labels-annotations';

export const TELEMETRY_PARAMS = {
  CLUSTER_COUNT: 'vc-cluster-count',
  MODE_SHARED:   'vc-mode-shared',
  MODE_VIRTUAL:  'vc-mode-virtual',
  MODE_UNKNOWN:  'vc-mode-unknown',
  POLICY_COUNT:  'vc-policy-count',
};

// the telemetry function must be synchronous: only read lists the store already holds
// a param is omitted, not sent as 0, when its list is not loaded
function loaded(getters: any, store: string, type: string): any[] | undefined {
  if (getters[`${ store }/haveAll`]?.(type)) {
    return getters[`${ store }/all`](type);
  }

  return undefined;
}

export function virtualClusterTelemetry(getters: any): TelemetryParams {
  const params: TelemetryParams = {};
  const provClusters = loaded(getters, 'management', CAPI.RANCHER_CLUSTER);

  if (provClusters) {
    const virtualClusters = provClusters.filter((c: any) => c.metadata?.annotations?.[PROVIDER] === 'k3k');
    const modeCount = (mode?: string) => virtualClusters.filter((c: any) => c.metadata?.annotations?.[K3K_MODE] === mode).length;

    const shared = modeCount(MODES.SHARED);
    const virtual = modeCount(MODES.VIRTUAL);

    params[TELEMETRY_PARAMS.CLUSTER_COUNT] = virtualClusters.length;
    params[TELEMETRY_PARAMS.MODE_SHARED] = shared;
    params[TELEMETRY_PARAMS.MODE_VIRTUAL] = virtual;
    // clusters created before the mode annotation was added
    params[TELEMETRY_PARAMS.MODE_UNKNOWN] = virtualClusters.length - shared - virtual;
  }

  // policies are cluster-scoped resources in each host cluster
  // only the currently selected cluster's policies can be in the store
  const policies = loaded(getters, 'cluster', K3K.POLICY);

  if (policies) {
    params[TELEMETRY_PARAMS.POLICY_COUNT] = policies.length;
  }

  return params;
}
