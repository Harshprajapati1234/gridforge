export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'running' | 'stopped' | 'disabled' | 'error';
  isBuiltIn: boolean;
  permissions: string[];
  errorReason?: string;
  crashCount: number;
}

export interface GridForgeElectronAPI {
  getAppConfig: () => Promise<any>;
  isSafeMode: () => Promise<boolean>;
  getTheme: (id?: string) => Promise<any>;
  listThemes: () => Promise<string[]>;
  listModules: () => Promise<ModuleInfo[]>;
  enableModule: (id: string) => Promise<boolean>;
  disableModule: (id: string, reason?: string) => Promise<boolean>;
  restartModule: (id: string) => Promise<boolean>;
  checkModuleHealth: (id: string) => Promise<{ ok: boolean; message?: string }>;
  rollbackModule: (id: string, version: string) => Promise<boolean>;
  listModuleArchives: (id: string) => Promise<string[]>;
  readModuleLogs: (id: string) => Promise<string>;
  installModuleFromFolder: (folderPath: string) => Promise<boolean>;
  openFileDialog: () => Promise<{ path: string; name: string; data: number[] } | null>;
  saveFileDialog: (defaultName: string, ext: string) => Promise<string | null>;
  writeFile: (filePath: string, data: number[]) => Promise<boolean>;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
}

declare global {
  interface Window { gridForge?: GridForgeElectronAPI; }
}
