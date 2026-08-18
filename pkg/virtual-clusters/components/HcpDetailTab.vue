<script>
import { mapGetters } from 'vuex';
import { PROVIDER, PARENT_CLUSTER, K3K_NAMESPACE } from '../labels-annotations';
import { MODES } from '../utils/shared';

export default {
  'name': 'HcpDetailTab',

  'props': {
    'resource': {
      'type':     Object,
      'required': true,
    },
  },

  async fetch() {
    const annotations = this.resource?.metadata?.annotations || {};

    if (annotations[PROVIDER] !== 'k3k') {
      return;
    }

    const namespace = annotations[K3K_NAMESPACE] || '';
    const name = this.resource.metadata?.name;
    const parentClusterId = annotations[PARENT_CLUSTER] || '';

    if (!namespace || !name || !parentClusterId) {
      return;
    }

    try {
      const k3kCluster = await this.$store.dispatch('management/request', {
        'url':    `/k8s/clusters/${ parentClusterId }/v1/k3k.io.clusters/${ namespace }/${ name }`,
        'method': 'GET',
      });

      this.isHcpMode = k3kCluster?.spec?.mode === MODES.HCP;
    } catch (e) {
      this.isHcpMode = false;
    }
  },

  data() {
    return { 'isHcpMode': false };
  },

  'computed': {
    ...mapGetters({ 't': 'i18n/t' }),
  },
};
</script>

<template>
  <div v-if="isHcpMode">
    {{ t('k3k.hcp.placeholder') }}
  </div>
</template>
