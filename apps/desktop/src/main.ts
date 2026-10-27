import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ModuleHost } from '@gridforge/module-host';
import { BridgeServer } from '@gridforge/bridge-service';

let mainWindow: BrowserWindow | null = null;
let moduleHost: ModuleHost | null = null;
let bridgeServer: BridgeServer | null = null;

const rootDir = app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '../../..');
const uiDir = path.join(rootDir, 'ui');
const modulesDir = path.join(rootDir, 'modules');
const isSafeMode = process.argv.includes('--safe-mode');

let appConfig = { appName: 'GridForge', version: '1.0.0', defaultTheme: 'light', builtInModules: ['hello-world', 'flipkart-links'] };
try {
  const p = path.join(rootDir, 'app.config.json');
  if (fs.existsSync(p)) appConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch {}

function createBaseModuleContext(moduleId: string): any {
  return {
    moduleId,
    permissions: [],
    commands: { registerCommand: () => () => {}, executeCommand: async () => null },
    events: { on: () => () => {}, emit: () => {} },
    cells: { getCell: async () => null, getRange: async () => [], setCell: async () => {}, setRange: async () => {} },
    selection: { getSelection: async () => ({ sheetId: 'Sheet1', activeCell: { r: 0, c: 0 }, ranges: [] }) },
    ui: { registerPanel: () => {}, showToast: () => {}, showDialog: async () => 0 },
    settings: { get: async () => null, set: async () => {} },
    storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    logger: { info: console.log, warn: console.warn, error: console.error, debug: console.debug },
    theme: { getCurrentTheme: () => ({ id: appConfig.defaultTheme }), onThemeChanged: () => () => {} },
    i18n: { t: (k: string) => k }
  };
}

async function createWindow() {
  const iconPath = path.join(uiDir, 'app-icon', 'AppIcon.icns');
  const pngIcon = path.join(uiDir, 'app-icon', 'png', '512x512.png');

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
      nodeIntegration: false
    }
  });

  // Start Chrome Extension Bridge Server (127.0.0.1:47831)
  try {
    bridgeServer = new BridgeServer(47831);
    await bridgeServer.start();
    console.log('[BridgeServer] Listening on 127.0.0.1:47831');

    bridgeServer.on('sku:result', (res) => mainWindow?.webContents.send('bridge:sku-result', res));
    bridgeServer.on('paired', () => mainWindow?.webContents.send('bridge:status-updated'));
    bridgeServer.on('client:connected', () => mainWindow?.webContents.send('bridge:status-updated'));
    bridgeServer.on('client:disconnected', () => mainWindow?.webContents.send('bridge:status-updated'));
  } catch (err) {
    console.warn('[BridgeServer] Could not start bridge server:', err);
  }

  moduleHost = new ModuleHost({
    modulesDir,
    isSafeMode,
    builtInModuleIds: appConfig.builtInModules,
    baseContextFactory: createBaseModuleContext
  });

  moduleHost.on('module:crashed', (e) => mainWindow?.webContents.send('module:crashed', e));
  moduleHost.on('module:status-changed', (e) => mainWindow?.webContents.send('module:status-changed', e));

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

ipcMain.handle('app:get-config', () => appConfig);
ipcMain.handle('app:is-safe-mode', () => isSafeMode);
ipcMain.handle('theme:get', (_e, id?: string) => {
  const themeFile = path.join(uiDir, 'themes', `${id || appConfig.defaultTheme}.json`);
  return fs.existsSync(themeFile) ? JSON.parse(fs.readFileSync(themeFile, 'utf8')) : null;
});
ipcMain.handle('theme:list', () => ['light', 'dark', 'high-contrast']);

ipcMain.handle('modules:list', () => {
  if (!moduleHost) return [];
  return moduleHost.getModules().map((m) => ({
    id: m.id, name: m.manifest.name, version: m.manifest.version,
    description: m.manifest.description, author: m.manifest.author,
    status: m.status, isBuiltIn: m.isBuiltIn, permissions: m.manifest.permissions,
    errorReason: m.errorReason, crashCount: m.crashCount
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
ipcMain.handle('modules:list-archives', (_e, id) => moduleHost?.getArchiveManager().listArchivedVersions(id));
ipcMain.handle('modules:read-logs', (_e, id) => moduleHost?.getModule(id)?.logger.readRecentLogs(100) || '');
ipcMain.handle('modules:install-folder', async (_e, p) => (await moduleHost?.loadModuleFromDir(p)) !== null);

// Bridge IPC handlers
ipcMain.handle('bridge:get-pin', () => bridgeServer?.getCurrentPin() || { pin: '------', remainingSeconds: 0 });
ipcMain.handle('bridge:generate-pin', () => bridgeServer?.generateNewPin() || '------');
ipcMain.handle('bridge:get-status', () => ({
  isPaired: bridgeServer?.isPaired() || false,
  clientCount: bridgeServer?.getConnectedClientsCount() || 0
}));

// File IO handlers
ipcMain.handle('file:open-dialog', async () => {
  if (!mainWindow) return null;
  const { dialog } = await import('electron');
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Spreadsheets', extensions: ['xlsx', 'csv', 'tsv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const filePath = res.filePaths[0];
  const buffer = fs.readFileSync(filePath);
  return { path: filePath, name: path.basename(filePath), data: Array.from(buffer) };
});

ipcMain.handle('file:save-dialog', async (_e, defaultName: string, ext: string) => {
  if (!mainWindow) return null;
  const { dialog } = await import('electron');
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
  });
  return res.canceled ? null : res.filePath;
});

ipcMain.handle('file:write-file', async (_e, filePath: string, data: number[]) => {
  fs.writeFileSync(filePath, Buffer.from(data));
  return true;
});

app.whenReady().then(createWindow);

app.on('before-quit', async () => {
  if (bridgeServer) await bridgeServer.stop();
});
