<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { isHcpCluster } from '../utils/hcp';

// Declared even though the content doesn't use it: Tabbed passes `resource` to every
// extension tab component, and without a matching prop Vue would apply it to the root
// element as a stray attribute.
const props = defineProps<{ resource?: any }>();

const store = useStore();
const t = computed(() => store.getters['i18n/t']);

// Defensive only. The tab's `enabled` predicate already keeps this component off the page
// for non-HCP clusters, but on a shell that predates Tab.enabled the tab is shown
// unconditionally, so the content stays gated too. Costs nothing - it hits the same cache
// the predicate populated.
// TODO drop this once the minimum supported shell version has Tab.enabled.
const isHcpMode = ref(false);

watch(() => props.resource, async(resource) => {
  isHcpMode.value = await isHcpCluster(store, resource);
}, { 'immediate': true });
</script>

<template>
  <div v-if="isHcpMode">
    {{ t('k3k.hcp.placeholder') }}
  </div>
</template>
