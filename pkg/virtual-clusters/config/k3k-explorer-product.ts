
import { K3K } from "../types";
export const  NAME = 'virtualclusters'
//TODO nb why doesnt table-headers import work when building
const STATE = {
  name:      'state',
  labelKey:  'tableHeaders.state',
  sort:      ['stateSort', 'nameSort'],
  value:     'stateDisplay',
  getValue:  (row: any) => row.stateDisplay,
  width:     100,
  default:   'unknown',
  formatter: 'BadgeStateFormatter',
};

const NAME_COL = {
  name:          'name',
  labelKey:      'tableHeaders.name',
  value:         'nameDisplay',
  getValue:      (row: any) => row.nameDisplay,
  sort:          ['nameSort'],
  formatter:     'LinkDetail',
  canBeVariable: true,
};

const AGE = {
  name:      'age',
  labelKey:  'tableHeaders.age',
  value:     'creationTimestamp',
  getValue:  (row: any) => row.creationTimestamp,
  sort:      'creationTimestamp:desc',
  search:    false,
  formatter: 'LiveDate',
  width:     100,
  align:     'left'
};


export function init($plugin:any, store:any) {
  const {
    product,
    configureType,
    virtualType,
    basicType,
    headers
  } = $plugin.DSL(store, NAME);
  
  product({
    label: 'Virtual Clusters',
    inStore:             'cluster',
    inExplorer:          true,
    icon:                'k3k',
    removeable:          false,
    showNamespaceFilter: true
  });


    virtualType({
    label:       'Virtual Clusters',
    icon:        'k3k',
    name:        'virtual-cluster-dashboard',
    namespaced:  false,
    weight:      99,
    route:                  {
      name:   `c-cluster-virtualclusters`,
    },
    overview: true,
    exact:    true,
  });

  basicType(['virtual-cluster-dashboard', K3K.POLICY, K3K.CLUSTER])

  headers(K3K.POLICY, [
    STATE,
    NAME_COL,
    {
      name:          'vcmode',
      labelKey:      'k3k.policy.listView.modeHeader',
      sort:          ['spec.allowedMode'],
      value:         'spec.allowedMode',
    },
        {
      name:          'vcmode',
      labelKey:      'k3k.policy.listView.projectHeader',
      value:         'metadata.annotations',
      formatter:     'PolicyAssignment'
    },
    AGE
  ])

  }