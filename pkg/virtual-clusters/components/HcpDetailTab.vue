<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { base64Decode } from '@shell/utils/crypto';
import { PARENT_CLUSTER, K3K_NAMESPACE } from '../labels-annotations';
import { RcSection } from '@components/RcSection';
import CopyCode from '@shell/components/CopyCode';
import { LabeledInput } from '@components/Form/LabeledInput';
import Checkbox from '@components/Form/Checkbox/Checkbox';
import KeyValue from '@shell/components/form/KeyValue';
import Taints from '@shell/components/form/Taints';
import { _EDIT } from '@shell/config/query-params';

const KUBE_API_PORT = 6443;
const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];

const props = defineProps<{
  resource: Record<string, any>;
}>();

const store = useStore();
const t = (key: string) => store.getters['i18n/t'](key);

const parentClusterId = computed(() => props.resource?.metadata?.annotations?.[PARENT_CLUSTER] || '');
const targetNamespace = computed(() => props.resource?.metadata?.annotations?.[K3K_NAMESPACE] || '');
const clusterName = computed(() => props.resource?.metadata?.name || '');

const tokenSecretName = computed(() => `k3k-${ clusterName.value }-token`);

const tokenSecret = ref<Record<string, any> | null>(null);
const k3kCluster = ref<Record<string, any> | null>(null);
const services = ref<Record<string, any>[]>([]);
const nodes = ref<Record<string, any>[]>([]);
const loading = ref(false);
const errors = ref<string[]>([]);

const token = computed(() => {
  const encoded = tokenSecret.value?.data?.token;

  return encoded ? base64Decode(encoded) : '';
});

/**
 * The port serving the k3s supervisor, which is what an external agent joins
 * against. Prefer k3k's name for it, and fall back to matching the port itself
 * so a rename doesn't break us. Never match on the service port alone - k3k
 * fronts the supervisor on 443, and the sibling etcd port would rather not be
 * mistaken for it.
 */
function findServerPort(svc: Record<string, any> | null) {
  const ports = svc?.spec?.ports || [];

  return ports.find((p: any) => p.name === 'k3s-server-port') ||
    ports.find((p: any) => p.targetPort === KUBE_API_PORT || p.port === KUBE_API_PORT) ||
    null;
}

const serverService = computed(() => services.value.find((svc) => !!findServerPort(svc)) || null);

const serverPort = computed(() => {
  const port = findServerPort(serverService.value);

  if (serverService.value?.spec?.type === 'NodePort') {
    return port?.nodePort || null;
  }

  return port?.port || null;
});

/**
 * An HCP virtual cluster's apiserver runs inside the host cluster, so the
 * kubeconfig's server URL is in-cluster and unreachable from an external
 * worker. Resolve an externally reachable host instead:
 *
 * 1. A LoadBalancer address, if the cluster is exposed that way.
 * 2. spec.tlsSANs - HCP mode requires at least one non-loopback host the
 *    external workers can reach, and only hosts in the SANs will pass the
 *    agent's TLS verification.
 * 3. A host cluster node's external (then internal) address, as a last resort.
 */
const serverHost = computed(() => {
  const lbIngress = serverService.value?.status?.loadBalancer?.ingress?.[0];

  if (lbIngress?.ip || lbIngress?.hostname) {
    return lbIngress.ip || lbIngress.hostname;
  }

  const san = (k3kCluster.value?.spec?.tlsSANs || []).find((s: string) => s && !LOOPBACK.includes(s));

  if (san) {
    return san;
  }

  const addresses = nodes.value.flatMap((node) => node?.status?.addresses || []);

  return addresses.find((a: any) => a.type === 'ExternalIP')?.address || addresses.find((a: any) => a.type === 'InternalIP')?.address || '';
});

const serverUrl = computed(() => {
  if (!serverHost.value || !serverPort.value) {
    return '';
  }

  return `https://${ serverHost.value }:${ serverPort.value }`;
});

/**
 * The version k3k runs the virtual cluster's control plane at: spec.version if
 * set, otherwise the host cluster's own version, which is what k3k falls back
 * to. Read from a host control plane node, since that is the version k3k sees.
 */
const controlPlaneVersion = computed(() => {
  if (k3kCluster.value?.spec?.version) {
    return k3kCluster.value.spec.version;
  }

  const controlPlane = nodes.value.find((node) => {
    const labels = node?.metadata?.labels || {};

    return 'node-role.kubernetes.io/control-plane' in labels || 'node-role.kubernetes.io/master' in labels;
  });

  return (controlPlane || nodes.value[0])?.status?.nodeInfo?.kubeletVersion || '';
});

/**
 * The k3s version to install on the worker, so it matches the control plane.
 * The installer takes no version from the server it joins, and defaults to
 * latest stable - which would leave the kubelet ahead of the apiserver. Note
 * the cluster resource spells the suffix '-k3s1' while the installer wants
 * '+k3s1'. Only pin a k3s build; a non-k3s host version is not installable by
 * get.k3s.io, so leave it off rather than emit a command that cannot run.
 */
const installVersion = computed(() => {
  const version = controlPlaneVersion.value.replace(/-k3s(\d+)$/, '+k3s$1');

  return version.includes('+k3s') ? version : '';
});

/**
 * Per-node values from the advanced section, appended to the command as k3s
 * agent flags. Everything here is optional and differs per worker.
 */
const editMode = _EDIT;

const nodeName = ref('');
const nodeExternalIp = ref('');
const nodeIp = ref('');
const insecure = ref(false);
const nodeLabels = ref<Record<string, string>>({});
const taints = ref<Record<string, any>[]>([]);

/**
 * The agent flags contributed by the advanced section, one per entry so the
 * template can style each appended flag individually.
 */
const advancedArgs = computed(() => {
  const args: string[] = [];

  if (nodeName.value) {
    args.push(`--node-name ${ nodeName.value }`);
  }

  if (nodeExternalIp.value) {
    args.push(`--node-external-ip ${ nodeExternalIp.value }`);
  }

  if (nodeIp.value) {
    args.push(`--node-ip ${ nodeIp.value }`);
  }

  Object.entries(nodeLabels.value).forEach(([key, value]) => {
    if (key) {
      args.push(`--node-label ${ key }=${ value || '' }`);
    }
  });

  taints.value.forEach((taint) => {
    if (taint?.key) {
      args.push(`--node-taint ${ taint.key }=${ taint.value || '' }:${ taint.effect || 'NoSchedule' }`);
    }
  });

  return args;
});

/**
 * Everything up to the point the advanced flags are appended. Agent flags are
 * passed through the installer with 'sh -s -', so only switch to that form
 * once there is something to pass.
 */
const baseCommand = computed(() => {
  if (!serverUrl.value || !token.value) {
    return '';
  }

  const env = [
    installVersion.value ? `INSTALL_K3S_VERSION=${ installVersion.value }` : '',
    `K3S_URL=${ serverUrl.value }`,
    `K3S_TOKEN=${ token.value }`,
  ].filter((e) => !!e).join(' ');

  const curl = `curl -sfL${ insecure.value ? ' --insecure' : '' }`;

  return `${ curl } https://get.k3s.io | ${ env } sh -${ advancedArgs.value.length ? 's -' : '' }`;
});

async function fetchParentResource(path: string) {
  return store.dispatch('management/request', {
    'url':    `/k8s/clusters/${ parentClusterId.value }/v1/${ path }`,
    'method': 'GET',
  });
}

async function fetchAll() {
  if (!parentClusterId.value || !targetNamespace.value || !clusterName.value) {
    return;
  }

  loading.value = true;
  errors.value = [];

  const requests: any[] = [
    [`secrets/${ targetNamespace.value }/${ tokenSecretName.value }`, (res: any) => (tokenSecret.value = res)],
    [`k3k.io.clusters/${ targetNamespace.value }/${ clusterName.value }`, (res: any) => (k3kCluster.value = res)],
    [`services/${ targetNamespace.value }`, (res: any) => (services.value = res?.data || [])],
    ['nodes', (res: any) => (nodes.value = res?.data || [])],
  ];

  await Promise.all(requests.map(async([path, assign]) => {
    try {
      assign(await fetchParentResource(path));
    } catch (err: any) {
      errors.value.push(err?.message || String(err));
    }
  }));

  loading.value = false;
}

fetchAll();
</script>

<template>
  <div>
    <div
      v-if="errors.length"
      class="text-error mb-20"
    >
      {{ errors.join('. ') }}
    </div>
    <div v-else-if="loading">
      {{ t('generic.loading') }}
    </div>
    <div v-else>
      <RcSection
        type="primary"
        mode="with-header"
        :expandable="false"
        :title="t('k3k.hcp.registration.title')"
      >
        <p class="mb-10 text-muted">
          {{ t('k3k.hcp.registration.description') }}
        </p>
        <!-- 1 span per argument so appended flags can be highlighted -->
        <CopyCode class="registration-command">
          <span>{{ baseCommand }}</span>
          <span
            v-for="(arg, i) in advancedArgs"
            :key="i"
            class="appended-arg"
          >{{ arg }}</span>
        </CopyCode>
      </RcSection>

      <RcSection
        class="mt-20"
        type="primary"
        mode="with-header"
        expandable
        :title="t('k3k.hcp.advanced.title')"
      >
        <p class="mb-20 text-muted">
          {{ t('k3k.hcp.advanced.description') }}
        </p>
        <div class="row mb-20">
          <div class="col span-4">
            <LabeledInput
              v-model:value="nodeName"
              :label="t('k3k.hcp.advanced.nodeName')"
              :mode="editMode"
            />
          </div>
          <div class="col span-4">
            <LabeledInput
              v-model:value="nodeExternalIp"
              :label="t('k3k.hcp.advanced.nodeExternalIp')"
              :mode="editMode"
            />
          </div>
          <div class="col span-4">
            <LabeledInput
              v-model:value="nodeIp"
              :label="t('k3k.hcp.advanced.nodeIp')"
              :mode="editMode"
            />
          </div>
        </div>

        <Checkbox
          v-model:value="insecure"
          class="mb-20"
          :mode="editMode"
          :label="t('k3k.hcp.advanced.insecure')"
        />

        <RcSection
          type="secondary"
          mode="with-header"
          expandable
          :title="t('k3k.hcp.advanced.labels.title')"
        >
          <p class="mb-10 text-muted">
            {{ t('k3k.hcp.advanced.labels.description') }}
          </p>
          <KeyValue
            v-model:value="nodeLabels"
            :mode="editMode"
            :add-label="t('k3k.hcp.advanced.labels.add')"
            :read-allowed="false"
          />
        </RcSection>

        <RcSection
          class="mt-20"
          type="secondary"
          mode="with-header"
          expandable
          :title="t('k3k.hcp.advanced.taints.title')"
        >
          <p class="mb-10 text-muted">
            {{ t('k3k.hcp.advanced.taints.description') }}
          </p>
          <Taints
            v-model:value="taints"
            :mode="editMode"
          />
        </RcSection>
      </RcSection>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.registration-command {
  display: block;
  overflow-wrap: anywhere;

  // The markup supplies no literal spaces between arguments, so space them here.
  span + span {
    margin-left: 0.5ch;
  }
}

// Draw attention to flags the advanced section just appended. inline-block gives
// the line a break opportunity between arguments, which the margin-only spacing
// would not otherwise provide, and nowrap keeps each flag with its value.
.appended-arg {
  background-color: var(--accent-btn);
  border-radius: 2px;
  display: inline-block;
  font-style: italic;
  font-weight: bold;
  padding: 0 2px;
  white-space: nowrap;
}

// Taints renders its own 'Taints' heading, which duplicates the section title.
:deep(.taints .key-value > .clearfix) {
  display: none;
}
</style>
