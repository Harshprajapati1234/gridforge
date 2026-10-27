import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED = [
  'module:crashed',
  'module:status-changed',
  'module:loaded',
  'bridge:sku-result',
  'bridge:status-updated'
] as const;

contextBridge.exposeInMainWorld('gridForge', {
  getAppConfig: () => ipcRenderer.invoke('app:get-config'),
  isSafeMode: () => ipcRenderer.invoke('app:is-safe-mode'),
  getTheme: (id?: string) => ipcRenderer.invoke('theme:get', id),
  listThemes: () => ipcRenderer.invoke('theme:list'),
  listModules: () => ipcRenderer.invoke('modules:list'),
  enableModule: (id: string) => ipcRenderer.invoke('modules:enable', id),
  disableModule: (id: string, r?: string) => ipcRenderer.invoke('modules:disable', id, r),
  restartModule: (id: string) => ipcRenderer.invoke('modules:restart', id),
  checkModuleHealth: (id: string) => ipcRenderer.invoke('modules:check-health', id),
  rollbackModule: (id: string, v: string) => ipcRenderer.invoke('modules:rollback', id, v),
  listModuleArchives: (id: string) => ipcRenderer.invoke('modules:list-archives', id),
  readModuleLogs: (id: string) => ipcRenderer.invoke('modules:read-logs', id),
  installModuleFromFolder: (p: string) => ipcRenderer.invoke('modules:install-folder', p),
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  saveFileDialog: (defaultName: string, ext: string) => ipcRenderer.invoke('file:save-dialog', defaultName, ext),
  writeFile: (filePath: string, data: number[]) => ipcRenderer.invoke('file:write-file', filePath, data),

  // Chrome Extension Bridge
  getBridgePin: () => ipcRenderer.invoke('bridge:get-pin'),
  generateBridgePin: () => ipcRenderer.invoke('bridge:generate-pin'),
  getBridgeStatus: () => ipcRenderer.invoke('bridge:get-status'),

  on: (ch: string, cb: (...a: any[]) => void) => {
    if (ALLOWED.includes(ch as any)) {
      const sub = (_: any, ...a: any[]) => cb(...a);
      ipcRenderer.on(ch, sub);
      return () => ipcRenderer.removeListener(ch, sub);
    }
    return () => {};
  }
});
