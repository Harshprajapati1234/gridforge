import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED = [
  'module:crashed',
  'module:status-changed',
  'module:loaded',
  'module:unloaded',
  'bridge:sku-result',
  'bridge:status-updated',
  'host:request',
  'ui:show-toast',
  'commands:registered',
  'commands:unregistered',
  'host:event'
] as const;

contextBridge.exposeInMainWorld('gridForge', {
  getAppConfig: () => ipcRenderer.invoke('app:get-config'),
  isSafeMode: () => ipcRenderer.invoke('app:is-safe-mode'),
  getTheme: (id?: string) => ipcRenderer.invoke('theme:get', id),
  listThemes: () => ipcRenderer.invoke('theme:list'),

  // Modules API
  listModules: () => ipcRenderer.invoke('modules:list'),
  enableModule: (id: string) => ipcRenderer.invoke('modules:enable', id),
  disableModule: (id: string, r?: string) => ipcRenderer.invoke('modules:disable', id, r),
  restartModule: (id: string) => ipcRenderer.invoke('modules:restart', id),
  checkModuleHealth: (id: string) => ipcRenderer.invoke('modules:check-health', id),
  rollbackModule: (id: string, v: string) => ipcRenderer.invoke('modules:rollback', id, v),
  removeModule: (id: string) => ipcRenderer.invoke('modules:remove', id),
  listModuleArchives: (id: string) => ipcRenderer.invoke('modules:list-archives', id),
  readModuleLogs: (id: string) => ipcRenderer.invoke('modules:read-logs', id),
  inspectModulePath: (p: string) => ipcRenderer.invoke('modules:inspect-path', p),
  installModulePath: (p: string) => ipcRenderer.invoke('modules:install-path', p),
  installModuleFromFolder: (p: string) => ipcRenderer.invoke('modules:install-path', p),
  pickModulePathDialog: () => ipcRenderer.invoke('dialog:pick-module'),
  executeModuleCommand: (moduleId: string, commandId: string, ...args: any[]) =>
    ipcRenderer.invoke('modules:execute-command', moduleId, commandId, ...args),

  // File IO
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  saveFileDialog: (defaultName: string, ext: string) => ipcRenderer.invoke('file:save-dialog', defaultName, ext),
  writeFile: (filePath: string, data: Uint8Array | number[]) => ipcRenderer.invoke('file:write-file', filePath, data),

  // Chrome Extension Bridge
  getBridgePin: () => ipcRenderer.invoke('bridge:get-pin'),
  generateBridgePin: () => ipcRenderer.invoke('bridge:generate-pin'),
  getBridgeStatus: () => ipcRenderer.invoke('bridge:get-status'),
  getBridgeClients: () => ipcRenderer.invoke('bridge:get-clients'),
  revokeBridgeClient: (id: string) => ipcRenderer.invoke('bridge:revoke-client', id),
  revokeAllBridgeTokens: () => ipcRenderer.invoke('bridge:revoke-all'),

  // Renderer-host request response
  sendRendererResponse: (res: { reqId: number; result?: any; error?: string }) =>
    ipcRenderer.send('renderer:response', res),

  on: (ch: string, cb: (...a: any[]) => void) => {
    if (ALLOWED.includes(ch as any)) {
      const sub = (_: any, ...a: any[]) => cb(...a);
      ipcRenderer.on(ch, sub);
      return () => ipcRenderer.removeListener(ch, sub);
    }
    return () => {};
  }
});
