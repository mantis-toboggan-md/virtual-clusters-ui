<script>
import { _CREATE } from '@shell/config/query-params';
import ArrayList from '@shell/components/form/ArrayList';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput.vue';
import RadioButton from '@components/Form/Radio/RadioButton.vue';
import KeyValue from '@shell/components/form/KeyValue.vue';
import { RcSection } from '@components/RcSection';
import cloneDeep from 'lodash/cloneDeep';
import { MODES } from '../Mode.vue';

export default {
  'name': 'K3kClusterNetworking',

  'emits': ['update:clusterCIDR', 'update:serviceCIDR', 'update:clusterDNS', 'update:tlsSANs', 'update:expose'],

  'components': {
    LabeledInput,
    ArrayList,
    RadioButton,
    KeyValue,
    RcSection
  },

  'props': {
    'mode': {
      'type':    String,
      'default': _CREATE
    },
    'clusterCIDR': {
      'type':    String,
      'default': ''
    },
    'serviceCIDR': {
      'type':    String,
      'default': ''
    },
    'clusterDNS': {
      'type':    String,
      'default': ''
    },
    'tlsSANs': {
      'type':    Array,
      'default': () => []
    },
    'expose': {
      'type':    Object,
      'default': () => {
        return {};
      },
      'virtualClusterMode': {
        'type':    String,
        'default': MODES.SHARED
      }
    },
    'rules': {
      'type':    Object,
      'default': () => {}
    },
  },

  data() {
    let exposeMode;
    const exposeModes = {
      'INGRESS':       'ingress',
      'LOAD_BALANCER': 'loadbalancer',
      'NODE_PORT':     'nodePort',
      'NONE':          'none'
    };
    // expose can have one of ingress, loadbalancer, or node port defined
    const { ingress, loadbalancer, nodePort } = this.expose;

    if (ingress && ingress.ingressClassName) {
      exposeMode = exposeModes.INGRESS;
    } else if (loadbalancer && (loadbalancer.serverPort || loadbalancer.etcdPort)) {
      exposeMode = exposeModes.LOAD_BALANCER;
    } else if (nodePort && ((nodePort.serverPort >= 30000 && nodePort.serverPort <= 32767) || (nodePort.etcdPort >= 30000 && nodePort.etcdPort <= 32767)) ) {
      exposeMode = exposeModes.NODE_PORT;
    } else {
      exposeMode = exposeModes.NONE;
    }

    return {
      exposeModes,
      exposeMode
    };
  },

  'watch': {
    exposeMode(neu) {
      const out = cloneDeep(this.expose || {});

      if (neu !== this.exposeModes.NONE && !out[neu]) {
        out[neu] = {};
      }
      switch (neu) {
      case this.exposeModes.INGRESS:
        delete out.loadbalancer;
        delete out.nodePort;
        break;
      case this.exposeModes.LOAD_BALANCER:
        delete out.ingress;
        delete out.nodePort;
        break;
      case this.exposeModes.NODE_PORT:
        delete out.loadbalancer;
        delete out.ingress;
        break;
      default:
        delete out.loadbalancer;
        delete out.ingress;
        delete out.nodePort;
      }
      this.$emit('update:expose', out);
    }
  },

  'computed': {
    isShared(){
      return this.virtualClusterMode === MODES.SHARED;
    }
  }

};
</script>

<template>
  <div class="rc-content">
    <RcSection
      type="secondary"
      mode="with-header"
      :expandable="true"
      :expanded="true"
      :title="t('k3k.networking.addresses.label')"
    >
      <div class="rc-content">
        <div class="rc-row half">
          <LabeledInput
            :value="clusterCIDR"
            label-key="k3k.clusterCIDR.label"
            placeholder-key="k3k.clusterCIDR.placeholder"
            :mode="mode"
            @update:value="e=>$emit('update:clusterCIDR', e)"
          />
        </div>
        <div class="rc-row">
          <div>
            <LabeledInput
              :value="serviceCIDR"
              label-key="k3k.serviceCIDR.label"
              placeholder-key="k3k.serviceCIDR.placeholder"
              :mode="mode"
              @update:value="e=>$emit('update:serviceCIDR', e)"
            />
            <t
              v-if="isShared"
              k="k3k.serviceCIDR.tooltip"
              class="text-label"
            />
          </div>
          <LabeledInput
            :value="clusterDNS"
            label-key="k3k.clusterDNS.label"
            placeholder-key="k3k.clusterDNS.placeholder"
            :mode="mode"
            @update:value="e=>$emit('update:clusterDNS', e)"
          />
        </div>
        <div class="rc-row">
        </div>
      </div>
    </RcSection>

    <RcSection
      type="secondary"
      mode="with-header"
      :expandable="true"
      :expanded="true"
      :title="t('k3k.tlsSANs.label')"
    >
      <div class="rc-row">
        <ArrayList
          :value="tlsSANs"
          :protip="false"
          :mode="mode"
          :initial-empty-row="true"
          :rules="rules.tlsSANs || []"
          :required="rules.tlsSANs && rules.tlsSANs.length"
          @update:value="e=>$emit('update:tlsSANs', e)"
        />
      </div>
    </RcSection>

    <!-- EXPOSE -->
    <RcSection
      type="secondary"
      mode="with-header"
      :expandable="true"
      :expanded="true"
      :title="t('k3k.expose.label')"
    >
      <div class="rc-content">
        <t
          class="text-label"
          raw
          k="k3k.expose.description"
        />
        <div>
          <div class="mmb-3">
            <RadioButton
              v-model:value="exposeMode"
              :val="exposeModes.NONE"
              :label="t('k3k.expose.notExposed.label')"
            />
          </div>

          <div class="mmb-3">
            <RadioButton
              v-model:value="exposeMode"
              :val="exposeModes.INGRESS"
              :label="t('k3k.expose.ingress.label')"
            />
          </div>
          <div
            v-if="expose.ingress"
          >
            <RcSection
              type="secondary"
              mode="no-header"
              :title="t('k3k.expose.ingress.label')"
            >
              <div class="rc-content">
                <div class="rc-row half">
                  <div>
                    <LabeledInput
                      v-model:value="expose.ingress.ingressClassName"
                      label-key="k3k.expose.ingress.ingressClassName.label"
                      :mode="mode"
                    />
                    <div class="mmt-1">
                      <t
                        k="k3k.expose.ingress.ingressClassName.description"
                        class="text-label"
                        raw
                      />
                    </div>
                  </div>
                </div>
                <div class="rc-row">
                  <KeyValue
                    v-model:value="expose.ingress.annotations"
                    :mode="mode"
                    :add-label="t('k3k.expose.ingress.annotations.add')"
                    :read-allowed="false"
                    add-icon="icon-plus"
                    use-rc-button
                  >
                    <template #title>
                      <h3 class="mb-0">
                        {{ t('k3k.expose.ingress.annotations.label') }}
                      </h3>
                    </template>
                  </KeyValue>
                </div>
              </div>
            </RcSection>
          </div>

          <div class="mmb-3">
            <RadioButton
              v-model:value="exposeMode"
              :label="t('k3k.expose.loadbalancer.label')"
              :val="exposeModes.LOAD_BALANCER"
            />
          </div>
          <div
            v-if="expose.loadbalancer"
          >
            <RcSection
              type="secondary"
              mode="no-header"
              :title="t('k3k.expose.loadbalancer.label')"
            >
              <div class="rc-content">
                <div class="rc-row">
                  <LabeledInput
                    v-model:value.number="expose.loadbalancer.serverPort"
                    type="number"
                    label-key="k3k.expose.loadbalancer.serverPort.label"
                    :placeholder="t('k3k.expose.loadbalancer.serverPort.placeholder')"
                    :mode="mode"
                  />
                  <LabeledInput
                    v-model:value.number="expose.loadbalancer.etcdPort"
                    type="number"
                    label-key="k3k.expose.loadbalancer.etcdPort.label"
                    :placeholder="t('k3k.expose.loadbalancer.etcdPort.placeholder')"
                    :mode="mode"
                  />
                </div>
                <t
                  class="text-label"
                  raw
                  k="k3k.expose.loadbalancer.description"
                />
              </div>
            </RcSection>
          </div>

          <div class="mmb-3">
            <RadioButton
              v-model:value="exposeMode"
              :label="t('k3k.expose.nodePort.label')"
              :val="exposeModes.NODE_PORT"
            />
          </div>
          <div
            v-if="expose.nodePort"
          >
            <RcSection
              type="secondary"
              mode="no-header"
              :title="t('k3k.expose.nodePort.label')"
            >
              <div class="rc-content">
                <div class="rc-row">
                  <div>
                    <LabeledInput
                      v-model:value.number="expose.nodePort.serverPort"
                      type="number"
                      label-key="k3k.expose.loadbalancer.serverPort.label"
                      :placeholder="t('k3k.expose.nodePort.serverPort.placeholder')"
                      :mode="mode"
                    />
                    <t
                      raw
                      k="k3k.expose.nodePort.description"
                      class="text-label"
                    />
                  </div>
                  <LabeledInput
                    v-model:value.number="expose.nodePort.etcdPort"
                    type="number"
                    label-key="k3k.expose.loadbalancer.etcdPort.label"
                    :placeholder="t('k3k.expose.nodePort.serverPort.placeholder')"
                    :mode="mode"
                  />
                </div>
              </div>
            </RcSection>
          </div>
        </div>
      </div>
    </RcSection>
  </div>
</template>
