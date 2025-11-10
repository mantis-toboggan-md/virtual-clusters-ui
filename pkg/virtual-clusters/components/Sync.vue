<script>
import { _CREATE } from '@shell/config/query-params';

export default {
  name: 'K3kResourceSync',

  emits: ['update:sync'],

  props: {
    mode: {
      type:    String,
      default: _CREATE
    },

    sync: {
      type:    Object,
      default: () => {
        return {};
      }
    }
  },

  computed: {
    ingressesEnabled: {
      get() {
        return this.sync?.ingresses?.enabled || false;
      },
      set(neu) {
        const out = { ...this.sync };

        if (!out.ingresses) {
          out.ingresses = { enabled: neu };
        }
        this.$emit('update:sync', out );
      }
    }
  }
};
</script>

<template>
  <div class="row mb-10">
    <div class="col span-12">
      <h3>{{ t('k3k.policy.synchronization.label') }}</h3>
      <t
        class="text-muted"
        k="k3k.policy.synchronization.tooltip"
        raw
      />
    </div>
  </div>
  <div class="row mb-20">
    <div class="col span-6 vertical-checkboxes">
      <Checkbox
        :value="ingressesEnabled"
        :mode="mode"
        :label="t('k3k.policy.synchronization.ingressCheckbox')"
        @update:value="e=>$emit('update:ingressesEnabled', e)"
      />
      <Checkbox
        :value="priorityClassesEnabled"
        :mode="mode"
        :label="t('k3k.policy.synchronization.priorityClassCheckbox')"
        @update:value="e=>$emit('update:priorityClassesEnabled', e)"
      />
    </div>
  </div>
</template>
