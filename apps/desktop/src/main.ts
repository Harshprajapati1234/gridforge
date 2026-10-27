import { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ModuleHost, validateManifest } from '@gridforge/module-host';
import { BridgeServer } from '@gridforge/bridge-service';

let mainWindow: BrowserWindow | null = null;
let moduleHost: ModuleHost | null = null;
let bridgeServer: BridgeServer | null = null;

const VALID_THEMES = ['light', 'dark', 'high-contrast'] as const;
const allowedSavePaths = new Set<string>();

const rootDir = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '../../..');
const uiDir = path.join(rootDir, 'ui');
const modulesDir = path.join(rootDir, 'modules');
const isSafeMode = process.argv.includes('--safe-mode');

let appConfig = { appName: 'GridForge', version: '1.0.0', defaultTheme: 'light', builtInModules: ['hello-world', 'chaos-tester', 'flipkart-links'] };
try {
  const p = path.join(rootDir, 'app.config.json');
  if (fs.existsSync(p)) appConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch {}

// Persistent Module Storage & Settings Directories
const appSupportDir = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge');
const moduleStorageDir = path.join(appSupportDir, 'module-storage');
const moduleSettingsDir = path.join(appSupportDir, 'module-settings');
const userModulesDir = path.join(appSupportDir, 'user-modules');
try {
  fs.mkdirSync(moduleStorageDir, { recursive: true });
  fs.mkdirSync(moduleSettingsDir, { recursive: true });
  fs.mkdirSync(userModulesDir, { recursive: true });
} catch {}

function readJsonFile(filePath: string): Record<string, any> {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
  } catch {
    return {};
  }
}

function writeJsonFile(filePath: string, data: Record<string, any>) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Failed to write JSON file ${filePath}:`, err);
  }
}

// Request / Response dispatcher for main-to-renderer synchronous RPC
let nextRequestId = 1;
const pendingRendererRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();

function requestRenderer(action: string, payload: any, timeoutMs = 6000): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return reject(new Error('Main window not available'));
    }
    const reqId = nextRequestId++;
    const timer = setTimeout(() => {
      pendingRendererRequests.delete(reqId);
      reject(new Error(`Renderer request "${action}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingRendererRequests.set(reqId, { resolve, reject, timer });
    mainWindow.webContents.send('host:request', { reqId, action, payload });
  });
}

ipcMain.on('renderer:response', (_e, { reqId, result, error }) => {
  const pending = pendingRendererRequests.get(reqId);
  if (pending) {
    pendingRendererRequests.delete(reqId);
    clearTimeout(pending.timer);
    if (error) pending.reject(new Error(error));
    else pending.resolve(result);
  }
});

function createBaseModuleContext(moduleId: string): any {
  return {
    moduleId,
    permissions: [],
    commands: {
      registerCommand: (id: string) => {
        mainWindow?.webContents.send('commands:registered', { id, moduleId });
        return () => {
          mainWindow?.webContents.send('commands:unregistered', { id, moduleId });
        };
      },
      executeCommand: async (id: string, ...args: any[]) => {
        return moduleHost?.executeCommand(moduleId, id, args);
      }
    },
    events: {
      on: () => () => {},
      emit: (event: string, data: any) => {
        mainWindow?.webContents.send('host:event', { event, data, moduleId });
      }
    },
    cells: {
      getCell: async (sheetId: string, r: number, c: number) => {
        return requestRenderer('cells:get-cell', { sheetId, r, c });
      },
      getRange: async (sheetId: string, sr: number, sc: number, er: number, ec: number) => {
        return requestRenderer('cells:get-range', { sheetId, sr, sc, er, ec });
      },
      setCell: async (sheetId: string, r: number, c: number, value: any) => {
        return requestRenderer('cells:set-cell', { sheetId, r, c, value });
      },
      setRange: async (sheetId: string, cells: any[]) => {
        return requestRenderer('cells:set-range', { sheetId, cells });
      }
    },
    selection: {
      getSelection: async () => {
        return requestRenderer('selection:get-selection', {});
      }
    },
    ui: {
      registerPanel: (panelId: string) => {
        mainWindow?.webContents.send('ui:register-panel', { panelId, moduleId });
      },
      showToast: (message: string, type?: string) => {
        mainWindow?.webContents.send('ui:show-toast', { message, type: type || 'info' });
      },
      showDialog: async (opts: { title: string; message: string; buttons: string[] }) => {
        if (!mainWindow) return 0;
        const res = await dialog.showMessageBox(mainWindow, {
          title: opts.title,
          message: opts.message,
          buttons: opts.buttons
        });
        return res.response;
      }
    },
    settings: {
      get: async (key: string, defaultValue?: any) => {
        const p = path.join(moduleSettingsDir, `${moduleId}.json`);
        const store = readJsonFile(p);
        return store[key] !== undefined ? store[key] : defaultValue;
      },
      set: async (key: string, value: any) => {
        const p = path.join(moduleSettingsDir, `${moduleId}.json`);
        const store = readJsonFile(p);
        store[key] = value;
        writeJsonFile(p, store);
      }
    },
    storage: {
      getItem: async (key: string) => {
        const p = path.join(moduleStorageDir, `${moduleId}.json`);
        const store = readJsonFile(p);
        return store[key] !== undefined ? String(store[key]) : null;
      },
      setItem: async (key: string, value: string) => {
        const p = path.join(moduleStorageDir, `${moduleId}.json`);
        const store = readJsonFile(p);
        store[key] = value;
        writeJsonFile(p, store);
      },
      removeItem: async (key: string) => {
        const p = path.join(moduleStorageDir, `${moduleId}.json`);
        const store = readJsonFile(p);
        delete store[key];
        writeJsonFile(p, store);
      }
    },
    logger: {
      info: (...args: any[]) => console.log(`[Module:${moduleId}]`, ...args),
      warn: (...args: any[]) => console.warn(`[Module:${moduleId}]`, ...args),
      error: (...args: any[]) => console.error(`[Module:${moduleId}]`, ...args),
      debug: (...args: any[]) => console.debug(`[Module:${moduleId}]`, ...args)
    },
    theme: {
      getCurrentTheme: () => ({ id: appConfig.defaultTheme }),
      onThemeChanged: () => () => {}
    },
    i18n: {
      t: (k: string) => k
    }
  };
}

async function createWindow() {
  const iconPath = path.join(uiDir, 'app-icon', 'AppIcon.icns');
  const pngIcon = path.join(uiDir, 'app-icon', 'png', 'icon-512.png');

  if (process.platform === 'darwin' && app.dock) {
    if (fs.existsSync(pngIcon)) {
      try {
        app.dock.setIcon(pngIcon);
      } catch {}
    }
  }

  // Content-Security-Policy setup
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' ws://127.0.0.1:47831 http://127.0.0.1:47831 ws: http:;"
        ]
      }
    });
  });

  mainWindow = new BrowserWindow({
    title: appConfig.appName,
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    icon: fs.existsSync(iconPath) ? iconPath : (fs.existsSync(pngIcon) ? pngIcon : undefined),
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Intercept window.open (e.g., cell hyperlinks) and open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  // Note: bridgeServer is started once at app-level in app.whenReady()
  moduleHost = new ModuleHost({
    modulesDir,
    isSafeMode,
    builtInModuleIds: appConfig.builtInModules,
    baseContextFactory: createBaseModuleContext
  });

  moduleHost.on('module:crashed', (e) => mainWindow?.webContents.send('module:crashed', e));
  moduleHost.on('module:status-changed', (e) => mainWindow?.webContents.send('module:status-changed', e));
  moduleHost.on('module:loaded', (e) => mainWindow?.webContents.send('module:loaded', e));
  moduleHost.on('module:unloaded', (e) => mainWindow?.webContents.send('module:unloaded', e));
  moduleHost.on('command:registered', (e) => mainWindow?.webContents.send('commands:registered', e));
  moduleHost.on('command:unregistered', (e) => mainWindow?.webContents.send('commands:unregistered', e));

  await moduleHost.discoverAndLoadAll();

  const dist = path.join(rootDir, 'apps/renderer/dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(dist)) {
    mainWindow.loadFile(dist);
  } else {
    mainWindow.loadURL('http://localhost:5173').catch(() => {});
  }
}

// App IPC Handlers
ipcMain.handle('app:get-config', () => appConfig);
ipcMain.handle('app:is-safe-mode', () => isSafeMode);
ipcMain.handle('theme:get', (_e, id?: string) => {
  const themeId = id || appConfig.defaultTheme || 'light';
  if (!VALID_THEMES.includes(themeId as any)) {
    throw new Error(`Invalid theme requested: "${id}". Allowed themes: ${VALID_THEMES.join(', ')}`);
  }
  const themeFile = path.join(uiDir, 'themes', `${themeId}.json`);
  return fs.existsSync(themeFile) ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : null;
});
ipcMain.handle('theme:list', () => [...VALID_THEMES]);

// Modules IPC Handlers
ipcMain.handle('modules:list', () => {
  if (!moduleHost) return [];
  return moduleHost.getModules().map((m) => ({
    id: m.id,
    name: m.manifest.name,
    version: m.manifest.version,
    description: m.manifest.description,
    author: m.manifest.author,
    status: m.status,
    isBuiltIn: m.isBuiltIn,
    permissions: m.manifest.permissions,
    errorReason: m.errorReason,
    crashCount: m.crashCount
  }));
});
ipcMain.handle('modules:enable', (_e, id) => moduleHost?.enableModule(id));
ipcMain.handle('modules:disable', (_e, id, r) => moduleHost?.disableModule(id, r));
ipcMain.handle('modules:restart', async (_e, id) => {
  await moduleHost?.deactivateModule(id);
  return moduleHost?.activateModule(id);
});
ipcMain.handle('modules:check-health', (_e, id) => moduleHost?.checkHealth(id));
ipcMain.handle('modules:rollback', (_e, id, v) => moduleHost?.rollbackModule(id, v));
ipcMain.handle('modules:remove', (_e, id) => moduleHost?.removeModule(id));
ipcMain.handle('modules:list-archives', (_e, id) => moduleHost?.getArchiveManager().listArchivedVersions(id));
ipcMain.handle('modules:read-logs', (_e, id) => moduleHost?.getModule(id)?.logger.readRecentLogs(100) || '');
ipcMain.handle('modules:execute-command', (_e, moduleId, commandId, ...args) =>
  moduleHost?.executeCommand(moduleId, commandId, args)
);

ipcMain.handle('dialog:pick-module', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Module Folder (containing module.json)'
  });
  return (!res.canceled && res.filePaths.length > 0) ? res.filePaths[0] : null;
});

ipcMain.handle('modules:inspect-path', async (_e, targetPath: string) => {
  const manifestPath = path.join(targetPath, 'module.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, errors: ['Selected folder does not contain a module.json file.'], sourcePath: targetPath };
  }
  try {
    const raw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    const val = validateManifest(raw);
    return {
      valid: val.valid,
      manifest: val.valid ? raw : undefined,
      errors: val.errors,
      sourcePath: targetPath
    };
  } catch (err: any) {
    return { valid: false, errors: [`Failed to parse module.json: ${err.message}`], sourcePath: targetPath };
  }
});

ipcMain.handle('modules:install-path', async (_e, targetPath: string) => {
  if (!moduleHost) return false;
  try {
    await moduleHost.installModuleFromPath(targetPath);
    return true;
  } catch (err: any) {
    console.error('Failed to install module:', err);
    throw err;
  }
});

// Bridge IPC handlers
ipcMain.handle('bridge:get-pin', () => bridgeServer?.getCurrentPin() || { pin: '------', remainingSeconds: 0 });
ipcMain.handle('bridge:generate-pin', () => bridgeServer?.generateNewPin() || '------');
ipcMain.handle('bridge:get-status', () => ({
  isPaired: bridgeServer?.isPaired() || false,
  clientCount: bridgeServer?.getConnectedClientsCount() || 0
}));
ipcMain.handle('bridge:get-clients', () => bridgeServer?.getConnectedClients() || []);
ipcMain.handle('bridge:revoke-client', (_e, id) => bridgeServer?.revokeClient(id) || false);
ipcMain.handle('bridge:revoke-all', () => {
  bridgeServer?.revokeAllTokens();
  return true;
});

// File IO handlers
ipcMain.handle('file:open-dialog', async () => {
  if (!mainWindow) return null;
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Spreadsheets', extensions: ['xlsx', 'csv', 'tsv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const filePath = res.filePaths[0];
  allowedSavePaths.add(filePath);
  const buffer = fs.readFileSync(filePath);
  return { path: filePath, name: path.basename(filePath), data: new Uint8Array(buffer) };
});

ipcMain.handle('file:save-dialog', async (_e, defaultName: string, ext: string) => {
  if (!mainWindow) return null;
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
  if (!res.canceled && res.filePath) {
    allowedSavePaths.add(res.filePath);
    return res.filePath;
  }
  return null;
});

ipcMain.handle('file:write-file', async (_e, filePath: string, data: Uint8Array | number[]) => {
  if (!allowedSavePaths.has(filePath)) {
    throw new Error(`Write denied: path "${filePath}" was not selected via Save or Open dialog in this session.`);
  }
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  fs.writeFileSync(filePath, buf);
  return true;
});

app.whenReady().then(async () => {
  app.setName(appConfig.appName);
  if (app.setAboutPanelOptions) {
    const iconPath = path.join(uiDir, 'app-icon', 'png', 'icon-512.png');
    app.setAboutPanelOptions({
      applicationName: appConfig.appName,
      applicationVersion: appConfig.version,
      copyright: 'Copyright © 2026 ' + appConfig.appName,
      credits: 'Free, modular, Excel-style spreadsheet application for macOS',
      iconPath: fs.existsSync(iconPath) ? iconPath : undefined
    });
  }

  const isMac = process.platform === 'darwin';
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: appConfig.appName,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [])
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  try {
    bridgeServer = new BridgeServer(47831);
    await bridgeServer.start();
    console.log('[BridgeServer] Listening on 127.0.0.1:47831');
    bridgeServer.on('sku:result', (res: any) => mainWindow?.webContents.send('bridge:sku-result', res));
    bridgeServer.on('paired', () => mainWindow?.webContents.send('bridge:status-updated'));
    bridgeServer.on('client:connected', () => mainWindow?.webContents.send('bridge:status-updated'));
    bridgeServer.on('client:disconnected', () => mainWindow?.webContents.send('bridge:status-updated'));
    bridgeServer.on('client:revoked', () => mainWindow?.webContents.send('bridge:status-updated'));
  } catch (err) {
    console.warn('[BridgeServer] Could not start bridge server:', err);
  }

  await createWindow();
});

app.on('before-quit', async () => {
  if (bridgeServer) await bridgeServer.stop();
});
