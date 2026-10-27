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

export interface ManifestInspectionResult {
  valid: boolean;
  manifest?: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    permissions: string[];
  };
  errors?: string[];
  sourcePath: string;
}

export interface GridForgeElectronAPI {
  getAppConfig: () => Promise<any>;
  isSafeMode: () => Promise<boolean>;
  getTheme: (id?: string) => Promise<any>;
  listThemes: () => Promise<string[]>;

  // Modules
  listModules: () => Promise<ModuleInfo[]>;
  enableModule: (id: string) => Promise<boolean>;
  disableModule: (id: string, reason?: string) => Promise<boolean>;
  restartModule: (id: string) => Promise<boolean>;
  checkModuleHealth: (id: string) => Promise<{ ok: boolean; message?: string }>;
  rollbackModule: (id: string, version: string) => Promise<boolean>;
  removeModule: (id: string) => Promise<boolean>;
  listModuleArchives: (id: string) => Promise<string[]>;
  readModuleLogs: (id: string) => Promise<string>;
  inspectModulePath: (path: string) => Promise<ManifestInspectionResult>;
  installModulePath: (path: string) => Promise<boolean>;
  installModuleFromFolder: (folderPath: string) => Promise<boolean>;
  pickModulePathDialog: () => Promise<string | null>;
  executeModuleCommand: (moduleId: string, commandId: string, ...args: any[]) => Promise<any>;

  // File IO
  openFileDialog: () => Promise<{ path: string; name: string; data: Uint8Array | number[] } | null>;
  saveFileDialog: (defaultName: string, ext: string) => Promise<string | null>;
  writeFile: (filePath: string, data: Uint8Array | number[]) => Promise<boolean>;

  // Bridge
  getBridgePin: () => Promise<{ pin: string; remainingSeconds: number }>;
  generateBridgePin: () => Promise<string>;
  getBridgeStatus: () => Promise<{ isPaired: boolean; clientCount: number }>;
  getBridgeClients: () => Promise<Array<{ clientId: string; extensionId: string; pairedAt: string; lastSeenAt: string }>>;
  revokeBridgeClient: (id: string) => Promise<boolean>;
  revokeAllBridgeTokens: () => Promise<boolean>;

  // IPC communication
  sendRendererResponse: (res: { reqId: number; result?: any; error?: string }) => void;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
}

declare global {
  interface Window { gridForge?: GridForgeElectronAPI; }
}
