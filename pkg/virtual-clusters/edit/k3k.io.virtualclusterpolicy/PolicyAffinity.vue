<script setup lang="ts">
import NodeAffinity from '@shell/components/form/NodeAffinity';
import PodAffinity from '@shell/components/form/PodAffinity';
import { RcSection } from '@components/RcSection';
import type { AffinityValue } from '../../types/k3k';

const props = defineProps<{
  serverAffinity?: AffinityValue;
  agentAffinity?: AffinityValue;
  mode: string;
}>();

// eslint-disable-next-line func-call-spacing
const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'update:server-affinity', value: AffinityValue): void;
  // eslint-disable-next-line no-unused-vars
  (e: 'update:agent-affinity', value: AffinityValue): void;
}>();

const updateServerNodeAffinity = (nodeAffinity: AffinityValue) => {
  emit('update:server-affinity', {
    ...(props.serverAffinity || {}),
    nodeAffinity
  });
};

const updateServerPodAffinity = (value: { affinity: AffinityValue }) => {
  emit('update:server-affinity', value.affinity);
};

const updateAgentNodeAffinity = (nodeAffinity: AffinityValue) => {
  emit('update:agent-affinity', {
    ...(props.agentAffinity || {}),
    nodeAffinity
  });
};

const updateAgentPodAffinity = (value: { affinity: AffinityValue }) => {
  emit('update:agent-affinity', value.affinity);
};
</script>

<template>
  <div class="gap-md">
    <RcSection
      type="secondary"
      mode="with-header"
      :expandable="true"
      :title="t('k3k.policy.affinity.serverNodeScheduling')"
    >
      <div class="gap-md">
        <NodeAffinity
          :value="serverAffinity?.nodeAffinity || {}"
          :mode="mode"
          @update:value="updateServerNodeAffinity"
        />
        <PodAffinity
          :value="{affinity: serverAffinity}"
          :mode="mode"
          @update="updateServerPodAffinity"
        />
      </div>
    </RcSection>
    <RcSection
      type="secondary"
      mode="with-header"
      :expandable="true"
      :title="t('k3k.policy.affinity.agentNodeScheduling')"
    >
      <div class="gap-md">
        <NodeAffinity
          :value="agentAffinity?.nodeAffinity || {}"
          :mode="mode"
          @update:value="updateAgentNodeAffinity"
        />
        <PodAffinity
          :value="{affinity: agentAffinity}"
          :mode="mode"
          @update="updateAgentPodAffinity"
        />
      </div>
    </RcSection>
  </div>
</template>
