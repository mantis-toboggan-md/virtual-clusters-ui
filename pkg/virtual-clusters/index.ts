import { importTypes } from '@rancher/auto-import';
import { IPlugin, ModelExtensionConstructor, PanelLocation } from '@shell/core/types';
import { k3kProvisioner } from './provisioner';
import { VClusterModelExtension } from './model-extension/provisioning.cattle.io.cluster';
import virtualClusterRouting from './routes'
import virtualClusterAdminRole from './resources/virtual-cluster-admin-role.json'
import virtualClusterPolicyAdminRole from './resources/virtual-cluster-policy-admin-role.json'
import { MANAGEMENT } from '@shell/config/types';



// Init the package
export default function(plugin: IPlugin): void {
  // Auto-import model, detail, edit from the folders
  importTypes(plugin);

  // Provide plugin metadata from package.json
  plugin.metadata = require('./package.json');

 // Add Vue Routes
  plugin.addRoutes(virtualClusterRouting);

  // Register a model extension for the provisioning model
  plugin.addModelExtension('provisioning.cattle.io.cluster', VClusterModelExtension as unknown as ModelExtensionConstructor);

  plugin.addProduct(require('./config/k3k-management-product'));
  plugin.addProduct(require('./config/k3k-explorer-product'));


  // Register custom provisioner object
  plugin.register('provisioner', k3kProvisioner.ID, k3kProvisioner);

  // Built-in icon
  plugin.metadata.icon = require('./assets/icon-k3k.svg');

//TODO nb only on prime
  plugin.addNavHooks(undefined, undefined, undefined, async(store: any)=>{
    await store.dispatch('management/loadSchemas')
    await store.dispatch('rancher/loadSchemas')

    const roles = await store.dispatch('management/findAll', {type: MANAGEMENT.ROLE_TEMPLATE})
console.log('*** roles ', roles)
    const vcAdminRole = !!roles.filter((r:any)=>r.metadata.labels?.['management.cattle.io/ui-role-name'] === virtualClusterAdminRole.metadata.name)
    console.log('*** found admin role ', vcAdminRole)
    if(!vcAdminRole){
      const newAdminRole = await store.dispatch('management/create', {type: MANAGEMENT.ROLE_TEMPLATE, ...virtualClusterAdminRole})

      await newAdminRole.save()
    }

    const vcPolicyAdminRole = !!roles.filter((r:any)=>r.metadata.labels?.['management.cattle.io/ui-role-name'] === virtualClusterPolicyAdminRole.metadata.name)
    console.log('*** found policy role ', vcPolicyAdminRole)

    if(!vcPolicyAdminRole){
      const newPolicyAdminRole = await store.dispatch('management/create', {type: MANAGEMENT.ROLE_TEMPLATE, ...virtualClusterPolicyAdminRole})

      await newPolicyAdminRole.save()
    }

    // const role = await store.dispatch('management/findLabelSelector', {
    //   type: MANAGEMENT.ROLE_TEMPLATE,
    //   matching: {labelSelector:{ matchLabels: virtualClusterAdminRole.metadata.labels}}
    // })

    // const forUrl = encodeURIComponent("management.cattle.io/ui-role-name=virtual-cluster-admin")
    // // console.log(forUrl)

    // await store.dispatch('management/request', {method: 'GET', url: `/v1/management.cattle.io.roletemplates?labelSelector=${forUrl}`})

    // console.log('*** role(s) found: ', role)

    // const newRole = await store.dispatch('management/create', {type: MANAGEMENT.ROLE_TEMPLATE, ...virtualClusterAdminRole})

    // // await newRole.save()

    // const norman = await newRole.norman;

    // for (const rule of norman.rules) {
    //   if (rule.nonResourceURLs && rule.nonResourceURLs.length) {
    //     delete rule.resources;
    //     delete rule.apiGroups;
    //   } else {
    //     delete rule.nonResourceURLs;
    //   }
    // }
    // norman.labels = newRole.metadata.labels

    // return norman.save();
  })

}
