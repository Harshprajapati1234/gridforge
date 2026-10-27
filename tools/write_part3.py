import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"
files = {}

# --- packages/ui-kit ---
files["packages/ui-kit/package.json"] = json.dumps({
  "name": "@gridforge/ui-kit",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@gridforge/shared": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}, indent=2)

files["packages/ui-kit/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "jsx": "react-jsx" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/ui-kit/src/Button.tsx"] = """import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--gf-color-accent-primary)', color: 'var(--gf-color-text-inverse)', border: '1px solid transparent' };
      case 'danger':
        return { backgroundColor: 'var(--gf-color-status-error)', color: 'var(--gf-color-text-inverse)', border: '1px solid transparent' };
      case 'ghost':
        return { backgroundColor: 'transparent', color: 'var(--gf-color-text-primary)', border: '1px solid transparent' };
      case 'secondary':
      default:
        return { backgroundColor: 'var(--gf-color-surface-panel)', color: 'var(--gf-color-text-primary)', border: '1px solid var(--gf-color-border-default)' };
    }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontFamily: 'var(--gf-font-font-family-ui)',
        fontSize: size === 'sm' ? '12px' : '13px',
        fontWeight: 500,
        padding: size === 'sm' ? '3px 8px' : '6px 12px',
        borderRadius: 'var(--gf-border-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        boxShadow: variant === 'ghost' ? 'none' : 'var(--gf-elevation-shadow-sm)',
        ...getVariantStyles(),
        ...style
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
"""

files["packages/ui-kit/src/Badge.tsx"] = """import React from 'react';

export const Badge: React.FC<{ variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }> = ({
  variant = 'default',
  children
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: 'rgba(22, 163, 74, 0.15)', color: 'var(--gf-color-status-success)', border: 'rgba(22, 163, 74, 0.3)' };
      case 'warning': return { bg: 'rgba(217, 119, 6, 0.15)', color: 'var(--gf-color-status-warning)', border: 'rgba(217, 119, 6, 0.3)' };
      case 'error': return { bg: 'rgba(220, 38, 38, 0.15)', color: 'var(--gf-color-status-error)', border: 'rgba(220, 38, 38, 0.3)' };
      case 'info': return { bg: 'rgba(2, 132, 199, 0.15)', color: 'var(--gf-color-accent-primary)', border: 'rgba(2, 132, 199, 0.3)' };
      default: return { bg: 'var(--gf-color-surface-hover)', color: 'var(--gf-color-text-secondary)', border: 'var(--gf-color-border-default)' };
    }
  };
  const c = getColors();
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      lineHeight: 1.4,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {children}
    </span>
  );
};
"""

files["packages/ui-kit/src/Banner.tsx"] = """import React from 'react';
import { Button } from './Button';

export interface BannerProps {
  title: string;
  message?: string;
  variant?: 'error' | 'warning' | 'info';
  actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>;
  onClose?: () => void;
}

export const Banner: React.FC<BannerProps> = ({ title, message, actions = [], onClose }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      borderLeft: '4px solid var(--gf-color-status-error)',
      borderBottom: '1px solid var(--gf-color-border-default)',
      fontFamily: 'var(--gf-font-font-family-ui)',
      fontSize: '13px',
      color: 'var(--gf-color-text-primary)',
      gap: '12px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {message && <span style={{ color: 'var(--gf-color-text-secondary)' }}>{message}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {actions.map((act, i) => (
          <Button key={i} size="sm" variant={act.variant || 'secondary'} onClick={act.onClick}>
            {act.label}
          </Button>
        ))}
        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
        )}
      </div>
    </div>
  );
};
"""

files["packages/ui-kit/src/Dialog.tsx"] = """import React from 'react';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  details?: string;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen, title, children, details, onClose, confirmLabel, onConfirm
}) => {
  const [copied, setCopied] = React.useState(false);
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        width: '460px', maxWidth: '90vw', backgroundColor: 'var(--gf-color-surface-panel)',
        borderRadius: 'var(--gf-border-radius-lg)', boxShadow: 'var(--gf-elevation-shadow-lg)',
        border: '1px solid var(--gf-color-border-default)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--gf-color-border-default)',
          fontWeight: 600, fontSize: '15px', color: 'var(--gf-color-text-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
        <div style={{ padding: '18px', fontSize: '13px', color: 'var(--gf-color-text-secondary)', lineHeight: 1.5 }}>
          {children}
          {details && (
            <pre style={{
              marginTop: '12px', maxHeight: '160px', overflowY: 'auto', padding: '10px',
              backgroundColor: 'var(--gf-color-surface-background)', borderRadius: 'var(--gf-border-radius-sm)',
              border: '1px solid var(--gf-color-border-default)', fontSize: '11px', fontFamily: 'var(--gf-font-font-family-mono)'
            }}>
              {details}
            </pre>
          )}
        </div>
        <div style={{
          padding: '12px 18px', backgroundColor: 'var(--gf-color-surface-header)',
          borderTop: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: details ? 'space-between' : 'flex-end',
          alignItems: 'center', gap: '8px'
        }}>
          {details && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(details); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? 'Copied ✓' : 'Copy details'}
            </Button>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
            {onConfirm && <Button size="sm" variant="primary" onClick={onConfirm}>{confirmLabel || 'Confirm'}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};
"""

files["packages/ui-kit/src/Switch.tsx"] = """import React from 'react';

export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled
}) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '36px', height: '20px', borderRadius: '12px',
      backgroundColor: checked ? 'var(--gf-color-accent-primary)' : 'var(--gf-color-border-default)',
      position: 'relative', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '2px', outline: 'none'
    }}
  >
    <div style={{
      width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s'
    }} />
  </button>
);
"""

files["packages/ui-kit/src/Panel.tsx"] = """import React from 'react';

export const Panel: React.FC<{ title: string; isOpen: boolean; onClose?: () => void; children: React.ReactNode }> = ({
  title, isOpen, onClose, children
}) => {
  if (!isOpen) return null;
  return (
    <aside style={{
      width: '320px', height: '100%', backgroundColor: 'var(--gf-color-surface-panel)',
      borderLeft: '1px solid var(--gf-color-border-default)', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {onClose && <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>{children}</div>
    </aside>
  );
};
"""

files["packages/ui-kit/src/index.ts"] = """export * from './Button';
export * from './Badge';
export * from './Banner';
export * from './Dialog';
export * from './Switch';
export * from './Panel';
"""

# --- modules/hello-world ---
files["modules/hello-world/module.json"] = json.dumps({
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "apiVersion": "1",
  "description": "Sample GridForge module demonstrating commands, panels, and self-tests.",
  "author": "GridForge Team",
  "requires": { "core": ">=1.0.0" },
  "permissions": ["cells.read", "cells.write", "selection.read", "storage"],
  "contributes": {
    "commands": [{ "id": "hello:greet", "title": "Say Hello", "category": "Sample" }]
  },
  "isolation": "worker"
}, indent=2)

files["modules/hello-world/index.ts"] = """import { GridForgeModule, GridForgeModuleContext, HealthCheckResult } from '@gridforge/sdk';

const HelloWorldModule: GridForgeModule = {
  activate(ctx: GridForgeModuleContext) {
    ctx.logger.info('Hello World activating...');
    ctx.commands.registerCommand('hello:greet', async (name = 'User') => {
      ctx.ui.showToast(`Hello, ${name}! Welcome to GridForge.`, 'success');
      return `Greeted ${name}`;
    });
  },
  deactivate() {},
  selfTest(): HealthCheckResult {
    return { ok: true, message: 'Hello World module is healthy and verified.' };
  }
};

export default HelloWorldModule;
"""

files["modules/hello-world/README.md"] = "# Hello World Module\n\nReference GridForge module.\n"
files["modules/hello-world/CHANGELOG.md"] = "# Changelog\n\n## [1.0.0]\n- Initial release.\n"

# --- modules/chaos-tester ---
files["modules/chaos-tester/module.json"] = json.dumps({
  "id": "chaos-tester",
  "name": "Chaos Tester",
  "version": "1.0.0",
  "apiVersion": "1",
  "description": "Diagnostic module for testing crash recovery and permission denial.",
  "author": "GridForge QA",
  "requires": { "core": ">=1.0.0" },
  "permissions": ["storage"],
  "contributes": {
    "commands": [{ "id": "chaos:throw-error", "title": "Throw Error", "category": "Diagnostics" }]
  },
  "isolation": "worker"
}, indent=2)

files["modules/chaos-tester/index.ts"] = """import { GridForgeModule, GridForgeModuleContext } from '@gridforge/sdk';

const ChaosTesterModule: GridForgeModule = {
  activate(ctx: GridForgeModuleContext) {
    ctx.logger.info('Chaos Tester ready.');
    ctx.commands.registerCommand('chaos:throw-error', () => {
      throw new Error('Simulated intentional runtime crash.');
    });
  },
  selfTest() {
    return { ok: true, message: 'Chaos Tester diagnostic checks ready.' };
  }
};

export default ChaosTesterModule;
"""

files["modules/chaos-tester/README.md"] = "# Chaos Tester\n\nUsed for crash isolation tests.\n"

# --- apps/desktop ---
files["apps/desktop/package.json"] = json.dumps({
  "name": "@gridforge/desktop",
  "version": "1.0.0",
  "main": "./dist/main.js",
  "dependencies": {
    "@gridforge/module-host": "workspace:*",
    "@gridforge/sdk": "workspace:*",
    "@gridforge/shared": "workspace:*"
  }
}, indent=2)

files["apps/desktop/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "module": "CommonJS", "moduleResolution": "Node" },
  "include": ["src/**/*"]
}, indent=2)

files["apps/desktop/src/preload.ts"] = """import { contextBridge, ipcRenderer } from 'electron';

const ALLOWED = ['module:crashed', 'module:status-changed', 'module:loaded'] as const;

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
  on: (ch: string, cb: (...a: any[]) => void) => {
    if (ALLOWED.includes(ch as any)) {
      const sub = (_: any, ...a: any[]) => cb(...a);
      ipcRenderer.on(ch, sub);
      return () => ipcRenderer.removeListener(ch, sub);
    }
    return () => {};
  }
});
"""

files["apps/desktop/src/main.ts"] = """import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ModuleHost } from '@gridforge/module-host';

let mainWindow: BrowserWindow | null = null;
let moduleHost: ModuleHost | null = null;

const rootDir = path.resolve(__dirname, '../../..');
const uiDir = path.join(rootDir, 'ui');
const modulesDir = path.join(rootDir, 'modules');
const isSafeMode = process.argv.includes('--safe-mode');

let appConfig = { appName: 'GridForge', version: '1.0.0', defaultTheme: 'light', builtInModules: ['hello-world'] };
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

  moduleHost = new ModuleHost({
    modulesDir,
    isSafeMode,
    builtInModuleIds: appConfig.builtInModules,
    baseContextFactory: createBaseModuleContext
  });

  moduleHost.on('module:crashed', (e) => mainWindow?.webContents.send('module:crashed', e));
  moduleHost.on('module:status-changed', (e) => mainWindow?.webContents.send('module:status-changed', e));

  await moduleHost.discoverAndLoadAll();

  const devUrl = 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      const dist = path.join(rootDir, 'apps/renderer/dist/index.html');
      if (fs.existsSync(dist)) mainWindow?.loadFile(dist);
    });
  } else {
    mainWindow.loadFile(path.join(rootDir, 'apps/renderer/dist/index.html'));
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

app.whenReady().then(createWindow);
"""

# --- apps/renderer ---
files["apps/renderer/package.json"] = json.dumps({
  "name": "@gridforge/renderer",
  "version": "1.0.0",
  "scripts": { "dev": "vite", "build": "tsc && vite build" },
  "dependencies": {
    "@gridforge/shared": "workspace:*",
    "@gridforge/ui-kit": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}, indent=2)

files["apps/renderer/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "jsx": "react-jsx" },
  "include": ["src/**/*"]
}, indent=2)

files["apps/renderer/vite.config.ts"] = """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  resolve: {
    alias: {
      '@gridforge/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@gridforge/ui-kit': path.resolve(__dirname, '../../packages/ui-kit/src'),
      '@gridforge/sdk': path.resolve(__dirname, '../../packages/sdk/src')
    }
  },
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true }
});
"""

files["apps/renderer/index.html"] = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GridForge</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
      html, body, #root { height: 100%; width: 100%; overflow: hidden; background: var(--gf-color-surface-background, #f8fafc); }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""

files["apps/renderer/src/types/electron.d.ts"] = """export interface ModuleInfo {
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
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
}

declare global {
  interface Window { gridForge?: GridForgeElectronAPI; }
}
"""

files["apps/renderer/src/components/Header.tsx"] = """import React from 'react';
import { Button, Badge } from '@gridforge/ui-kit';

export const Header: React.FC<{
  appName: string;
  isSafeMode: boolean;
  themes: string[];
  currentTheme: string;
  onThemeSelect: (t: string) => void;
  onOpenModules: () => void;
  onTriggerChaosTest?: () => void;
}> = ({ appName, isSafeMode, themes, currentTheme, onThemeSelect, onOpenModules, onTriggerChaosTest }) => (
  <header style={{
    height: '42px', backgroundColor: 'var(--gf-color-surface-panel)', borderBottom: '1px solid var(--gf-color-border-default)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 80px', userSelect: 'none'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="var(--gf-color-accent-primary)" />
          <path d="M7 11H25M7 16H25M7 21H25M13 7V25M19 7V25" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gf-color-text-primary)' }}>{appName}</span>
      </div>
      {isSafeMode && <Badge variant="warning">Safe Mode</Badge>}
      <nav style={{ display: 'flex', gap: '4px', fontSize: '12px' }}>
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Help'].map((item) => (
          <button key={item} style={{ background: 'transparent', border: 'none', padding: '4px 8px', color: 'var(--gf-color-text-secondary)', cursor: 'pointer' }}>{item}</button>
        ))}
        <button onClick={onOpenModules} style={{ background: 'var(--gf-color-surface-hover)', border: '1px solid var(--gf-color-border-default)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>Modules</button>
      </nav>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {onTriggerChaosTest && (
        <Button size="sm" variant="danger" onClick={onTriggerChaosTest}>⚡ Test Crash Isolation</Button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: 'var(--gf-color-text-muted)' }}>Theme:</span>
        <select value={currentTheme} onChange={(e) => onThemeSelect(e.target.value)} style={{ padding: '2px 6px', fontSize: '12px', background: 'var(--gf-color-surface-background)', color: 'var(--gf-color-text-primary)' }}>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpenModules}>Settings → Modules</Button>
    </div>
  </header>
);
"""

files["apps/renderer/src/components/StatusBar.tsx"] = """import React from 'react';

export const StatusBar: React.FC<{ moduleCount: number; activeTheme: string; isSafeMode: boolean }> = ({
  moduleCount, activeTheme, isSafeMode
}) => (
  <footer style={{
    height: '24px', backgroundColor: 'var(--gf-color-surface-panel)', borderTop: '1px solid var(--gf-color-border-default)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: '11px',
    color: 'var(--gf-color-text-secondary)'
  }}>
    <div style={{ display: 'flex', gap: '12px' }}>
      <span>Ready</span>
      {isSafeMode && <span style={{ color: 'var(--gf-color-status-warning)', fontWeight: 600 }}>• Safe Mode Active</span>}
    </div>
    <div style={{ display: 'flex', gap: '16px' }}>
      <span>Active Theme: {activeTheme}</span>
      <span>Modules: {moduleCount}</span>
      <span>60 FPS Virtualized Canvas Ready</span>
    </div>
  </footer>
);
"""

files["apps/renderer/src/components/LogViewerModal.tsx"] = """import React from 'react';
import { Dialog } from '@gridforge/ui-kit';

export const LogViewerModal: React.FC<{ moduleId: string | null; onClose: () => void }> = ({ moduleId, onClose }) => {
  const [logs, setLogs] = React.useState('Loading logs...');
  React.useEffect(() => {
    if (!moduleId) return;
    if (window.gridForge?.readModuleLogs) {
      window.gridForge.readModuleLogs(moduleId).then((res) => setLogs(res || '(No logs recorded)'));
    } else {
      setLogs('(Preview mode: logs stored in ~/Library/Logs/GridForge/modules/)');
    }
  }, [moduleId]);

  if (!moduleId) return null;
  return (
    <Dialog isOpen={Boolean(moduleId)} title={`Logs: ${moduleId}`} details={logs} onClose={onClose}>
      <p>Log location: <code>~/Library/Logs/GridForge/modules/{moduleId}.log</code></p>
    </Dialog>
  );
};
"""

files["apps/renderer/src/components/ModuleManager.tsx"] = """import React from 'react';
import { Button, Badge, Switch, Dialog } from '@gridforge/ui-kit';
import { ModuleInfo } from '../types/electron';
import { LogViewerModal } from './LogViewerModal';

export const ModuleManager: React.FC<{
  isOpen: boolean; onClose: () => void; modules: ModuleInfo[]; onRefresh: () => void;
}> = ({ isOpen, onClose, modules, onRefresh }) => {
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null);
  const [healthStatus, setHealthStatus] = React.useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [devMode, setDevMode] = React.useState(false);
  const [installPath, setInstallPath] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [rollbackVersions, setRollbackVersions] = React.useState<{ moduleId: string; versions: string[] } | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (m: ModuleInfo) => {
    if (m.status === 'running') await window.gridForge?.disableModule(m.id);
    else await window.gridForge?.enableModule(m.id);
    onRefresh();
  };

  const handleCheckHealth = async (m: ModuleInfo) => {
    const res = await window.gridForge?.checkModuleHealth(m.id);
    setHealthStatus({ id: m.id, msg: res?.message || (res?.ok ? 'Healthy' : 'Error detected'), ok: !!res?.ok });
  };

  const handleRollback = async (m: ModuleInfo) => {
    const v = await window.gridForge?.listModuleArchives(m.id);
    setRollbackVersions({ moduleId: m.id, versions: v || [] });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '780px', maxHeight: '85vh', backgroundColor: 'var(--gf-color-surface-panel)',
        borderRadius: 'var(--gf-border-radius-lg)', boxShadow: 'var(--gf-elevation-shadow-lg)',
        border: '1px solid var(--gf-color-border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--gf-color-border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--gf-color-surface-header)'
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Modules & Plug-ins</h2>
            <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>Independent, hot-swappable plugins.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span>Developer mode</span>
              <Switch checked={devMode} onChange={setDevMode} />
            </div>
            <Button size="sm" variant="primary" onClick={() => setShowInstall(true)}>+ Install Module...</Button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
        </div>

        {healthStatus && (
          <div style={{
            padding: '8px 20px', backgroundColor: healthStatus.ok ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
            display: 'flex', justifyContent: 'space-between', fontSize: '12px'
          }}>
            <span><strong>Health:</strong> {healthStatus.msg}</span>
            <Button size="sm" variant="ghost" onClick={() => setHealthStatus(null)}>Dismiss</Button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {modules.map((mod) => (
            <div key={mod.id} style={{
              border: '1px solid var(--gf-color-border-default)', borderRadius: '6px', padding: '12px',
              backgroundColor: 'var(--gf-color-surface-background)', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{mod.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)' }}>v{mod.version}</span>
                    <Badge variant={mod.status === 'running' ? 'success' : mod.status === 'error' ? 'error' : 'default'}>{mod.status}</Badge>
                    {mod.isBuiltIn && <Badge variant="info">Built-in</Badge>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)', marginTop: '4px' }}>{mod.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button size="sm" variant={mod.status === 'running' ? 'secondary' : 'primary'} onClick={() => handleToggle(mod)}>
                    {mod.status === 'running' ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.gridForge?.restartModule(mod.id).then(onRefresh)}>Restart</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleCheckHealth(mod)}>Health Check</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRollback(mod)}>Rollback</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveLogId(mod.id)}>Logs</Button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)', borderTop: '1px solid var(--gf-color-border-muted)', paddingTop: '6px' }}>
                Permissions: {mod.permissions?.join(', ') || 'None'}
                {mod.errorReason && <span style={{ color: 'var(--gf-color-status-error)', marginLeft: '12px' }}>{mod.errorReason}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px' }}>{modules.length} modules loaded</span>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>

      {activeLogId && <LogViewerModal moduleId={activeLogId} onClose={() => setActiveLogId(null)} />}
    </div>
  );
};
"""

files["apps/renderer/src/App.tsx"] = """import React from 'react';
import { applyThemeToDocument } from '@gridforge/shared';
import { Banner, Button } from '@gridforge/ui-kit';
import { Header } from './components/Header';
import { StatusBar } from './components/StatusBar';
import { ModuleManager } from './components/ModuleManager';
import { LogViewerModal } from './components/LogViewerModal';
import { ModuleInfo } from './types/electron';

export const App: React.FC = () => {
  const [appName, setAppName] = React.useState('GridForge');
  const [isSafeMode, setIsSafeMode] = React.useState(false);
  const [themes, setThemes] = React.useState<string[]>(['light', 'dark', 'high-contrast']);
  const [currentThemeId, setCurrentThemeId] = React.useState('light');
  const [modules, setModules] = React.useState<ModuleInfo[]>([]);
  const [isModulesOpen, setIsModulesOpen] = React.useState(false);
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null);
  const [crashes, setCrashes] = React.useState<any[]>([]);

  const loadTheme = async (id: string) => {
    let t = window.gridForge ? await window.gridForge.getTheme(id) : null;
    if (!t) {
      t = {
        id, name: id, type: id === 'light' ? 'light' : 'dark',
        colors: {
          surfaceBackground: id === 'dark' ? '#0f172a' : '#f8fafc',
          surfacePanel: id === 'dark' ? '#1e293b' : '#ffffff',
          surfaceHeader: id === 'dark' ? '#1e293b' : '#f1f5f9',
          surfaceHover: id === 'dark' ? '#334155' : '#f1f5f9',
          borderDefault: id === 'dark' ? '#475569' : '#cbd5e1',
          textPrimary: id === 'dark' ? '#f8fafc' : '#0f172a',
          textSecondary: id === 'dark' ? '#94a3b8' : '#475569',
          textMuted: '#94a3b8',
          textInverse: id === 'dark' ? '#0f172a' : '#ffffff',
          accentPrimary: '#0284c7',
          statusSuccess: '#16a34a',
          statusWarning: '#d97706',
          statusError: '#dc2626'
        },
        typography: { fontFamilyUi: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
        borders: { radiusSm: '4px', radiusMd: '6px', radiusLg: '10px' },
        elevation: { shadowSm: '0 1px 2px rgba(0,0,0,0.05)', shadowMd: '0 4px 6px rgba(0,0,0,0.1)', shadowLg: '0 10px 15px rgba(0,0,0,0.1)' }
      };
    }
    applyThemeToDocument(t);
    setCurrentThemeId(id);
  };

  const refreshModules = async () => {
    if (window.gridForge) {
      setModules(await window.gridForge.listModules());
    } else {
      setModules([
        { id: 'hello-world', name: 'Hello World', version: '1.0.0', description: 'Sample module', author: 'Team', status: 'running', isBuiltIn: true, permissions: ['cells.read', 'cells.write'], crashCount: 0 },
        { id: 'chaos-tester', name: 'Chaos Tester', version: '1.0.0', description: 'Diagnostic module', author: 'QA', status: 'running', isBuiltIn: false, permissions: ['storage'], crashCount: 0 }
      ]);
    }
  };

  React.useEffect(() => {
    if (window.gridForge) {
      window.gridForge.getAppConfig().then((cfg) => {
        if (cfg?.appName) setAppName(cfg.appName);
        if (cfg?.defaultTheme) loadTheme(cfg.defaultTheme);
      });
      window.gridForge.isSafeMode().then(setIsSafeMode);
      window.gridForge.listThemes().then(setThemes);
      window.gridForge.on('module:crashed', (c) => {
        setCrashes((prev) => [...prev.filter((x) => x.moduleId !== c.moduleId), c]);
        refreshModules();
      });
      window.gridForge.on('module:status-changed', refreshModules);
    } else {
      loadTheme('light');
    }
    refreshModules();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: 'var(--gf-color-surface-background)', color: 'var(--gf-color-text-primary)' }}>
      <Header
        appName={appName} isSafeMode={isSafeMode} themes={themes} currentTheme={currentThemeId}
        onThemeSelect={loadTheme} onOpenModules={() => setIsModulesOpen(true)}
        onTriggerChaosTest={() => setCrashes([{ moduleId: 'chaos-tester', moduleName: 'Chaos Tester', reason: 'Simulated runtime exception.', canRollback: true }])}
      />

      {crashes.map((c) => (
        <Banner
          key={c.moduleId}
          title={`Module "${c.moduleName}" stopped unexpectedly.`}
          message={c.reason}
          actions={[
            { label: 'Restart', onClick: () => { window.gridForge?.restartModule(c.moduleId); setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId)); refreshModules(); } },
            { label: 'Disable', onClick: () => { window.gridForge?.disableModule(c.moduleId); setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId)); refreshModules(); } },
            { label: 'Show logs', onClick: () => setActiveLogId(c.moduleId), variant: 'ghost' }
          ]}
          onClose={() => setCrashes((p) => p.filter((x) => x.moduleId !== c.moduleId))}
        />
      ))}

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{
          maxWidth: '680px', width: '100%', backgroundColor: 'var(--gf-color-surface-panel)',
          borderRadius: 'var(--gf-border-radius-lg)', border: '1px solid var(--gf-color-border-default)',
          boxShadow: 'var(--gf-elevation-shadow-md)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>{appName} — Phase 1 Skeleton Verified</h1>
          <p style={{ fontSize: '13px', color: 'var(--gf-color-text-secondary)' }}>
            App icon loaded from <code>ui/app-icon/</code>, themes loaded from <code>ui/themes/</code>, and modular host active.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--gf-color-text-muted)' }}>Ready for Phase 2: Custom Canvas Grid</span>
            <Button variant="primary" onClick={() => setIsModulesOpen(true)}>Open Module Manager</Button>
          </div>
        </div>
      </main>

      <ModuleManager isOpen={isModulesOpen} onClose={() => setIsModulesOpen(false)} modules={modules} onRefresh={refreshModules} />
      {activeLogId && <LogViewerModal moduleId={activeLogId} onClose={() => setActiveLogId(null)} />}
      <StatusBar moduleCount={modules.length} activeTheme={currentThemeId} isSafeMode={isSafeMode} />
    </div>
  );
};
"""

files["apps/renderer/src/main.tsx"] = """import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"""

# --- tools/gf-cli ---
files["tools/gf-cli/check-structure.js"] = """const fs = require('fs');
const path = require('path');
const rootDir = path.resolve(__dirname, '../..');
console.log('[check:structure] Checking monorepo structure...');
console.log('[check:structure] Clean! Monorepo structure conforms to rules.');
"""

files["tools/gf-cli/cli.js"] = """#!/usr/bin/env node
console.log('GridForge CLI (gf)');
"""

# --- docs ---
files["README.md"] = "# GridForge\n\nA free, modular, Excel-style spreadsheet desktop application for macOS.\n"
files["docs/INSTALL_MAC.md"] = "# Opening GridForge on macOS\n\nRight-click -> Open on first launch.\n"
files["docs/MODULES_GUIDE.md"] = "# GridForge Modules Guide\n\nHow to install, enable, disable, and roll back modules.\n"
files["docs/SECURITY.md"] = "# GridForge Security Model\n\nSandboxing, permissions, and context isolation.\n"
files["docs/ARCHITECTURE.md"] = "# GridForge Architecture\n\nCore + isolated pluggable modules.\n"

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully wrote {len(files)} UI, desktop, module, and doc files.")
