// Ambient declarations previously picked up from `@rancher/shell/types/rancher`.
//
// That file also declares `@shell/config/version` with only a subset of its real
// exports. Because ambient declarations shadow the real module, any shell source
// importing the other members (`isRancherPrime`, `setVersionData`,
// `setKubeVersionData`) fails to type check. We therefore drop `"rancher"` from
// `compilerOptions.types` and re-declare only the part we actually need here.
declare module '@rancher/auto-import' {
  export function importTypes(ext: any): void;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<{}, {}, any>;

  export default component;
}
