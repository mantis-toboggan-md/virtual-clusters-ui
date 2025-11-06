import { importTypes } from '@rancher/auto-import';
import { IPlugin, ModelExtensionConstructor, PanelLocation } from '@shell/core/types';
import { k3kProvisioner } from './provisioner';
import { VClusterModelExtension } from './model-extension/provisioning.cattle.io.cluster';
import virtualClusterRouting from './routes'
import { SCHEMA, RBAC, MANAGEMENT, NORMAN } from '@shell/config/types';
import virtualClusterAdminRole from './resources/virtualClusterAdmin.json';
// import virtualClusterPolicyAdminRole from './resources/virtualClusterPolicyAdmin.json';

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

  // use on login hook to install k3k global roles if not present already
  plugin.addNavHooks(undefined, undefined, undefined,
     async(store: any) => {
        let normanRoleSchema: any;
        // try {
          await store.dispatch('management/loadSchemas', true);
          await store.dispatch('rancher/loadSchemas', true);

          // normanRoleSchema = await store.dispatch('rancher/find', {type: SCHEMA, id: NORMAN.ROLE_TEMPLATE})

        // } catch(e) {
        //   console.log('** nav hook failed to find schemas')
        //   console.error(e)
        // }

      // if(normanRoleSchema && (normanRoleSchema.collectionMethods || []).includes((m: string)=>m.toLowerCase() === 'post')){
          console.log('*** looking for k3k admin role')
          try{

           const existingRole = await store.dispatch('management/findLabelSelector', {
              type: MANAGEMENT.ROLE_TEMPLATE,
              matching: {
                labelSelector: {
                  matchLabels: virtualClusterAdminRole.metadata.labels
                  }
                } 
              })

            // const existingRole = await store.dispatch('management/findMatching', {
            //   type: MANAGEMENT.ROLE_TEMPLATE,
            //   selector: virtualClusterAdminRole.metadata.labels
            //   })
          
          console.log('*** found matching roles: ', existingRole?.length)

          }catch (e) {
            // const newK3kAdminRole = await store.dispatch('management/create',  {type: MANAGEMENT.ROLE_TEMPLATE, ...virtualClusterAdminRole})
            // newK3kAdminRole.save()
          }

                      const newK3kAdminRole = await store.dispatch('management/create',  {type: MANAGEMENT.ROLE_TEMPLATE, ...virtualClusterAdminRole})
            newK3kAdminRole.save()


      // }


    }
  );

}
