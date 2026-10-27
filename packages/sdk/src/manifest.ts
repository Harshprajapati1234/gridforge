export type ModulePermission =
  | 'cells.read'
  | 'cells.write'
  | 'selection.read'
  | 'bridge'
  | 'storage'
  | 'clipboard'
  | 'network:local'
  | 'network:external'
  | 'network:none'
  | 'fs:dialog';

export interface CommandContribution {
  id: string;
  title: string;
  category?: string;
}

export interface ModuleContributions {
  commands?: CommandContribution[];
  sidePanels?: Array<{ id: string; title: string; side: 'left' | 'right' }>;
}

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  description: string;
  author: string;
  requires: { core: string; modules?: Record<string, string> };
  permissions: ModulePermission[];
  contributes?: ModuleContributions;
  isolation?: 'worker' | 'sandbox';
  main?: string;
}
