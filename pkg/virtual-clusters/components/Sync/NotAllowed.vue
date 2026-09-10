<script>
import { MODES } from '../../utils/shared';

export default {
  name:  'SyncNotAllowed',
  props: {
    mode: {
      type:    String,
      default: MODES.VIRTUAL
    }
  }
};
</script>

<template>
  <div>
    <h4>{{ t('k3k.policy.synchronization.notAllowed.title', {mode: t(`k3k.mode.${mode}.label`)}) }}</h4>
    <t
      class="text-deemphasized"
      raw
      :k="`k3k.policy.synchronization.notAllowed.description.${mode}`"
    />
  </div>
</template>
