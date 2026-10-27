import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"
files = {}

# --- packages/shared ---
files["packages/shared/package.json"] = json.dumps({
  "name": "@gridforge/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}, indent=2)

files["packages/shared/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/shared/src/emitter.ts"] = """export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

export class TypedEventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<keyof Events, Set<EventListener<any>>> = new Map();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of Array.from(set)) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventEmitter] Error for event "${String(event)}":`, err);
        }
      }
    }
  }
}
"""

files["packages/shared/src/uuid.ts"] = """export function generateId(prefix = 'gf'): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}
"""

files["packages/shared/src/tokens.ts"] = """export interface GridForgeTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  colors: Record<string, string>;
  typography: Record<string, string>;
  borders: Record<string, string>;
  elevation: Record<string, string>;
}

export function applyThemeToDocument(theme: GridForgeTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([k, v]) => {
    root.style.setProperty(`--gf-color-${kebab(k)}`, v);
  });
  Object.entries(theme.typography).forEach(([k, v]) => {
    root.style.setProperty(`--gf-font-${kebab(k)}`, v);
  });
  Object.entries(theme.borders).forEach(([k, v]) => {
    root.style.setProperty(`--gf-border-${kebab(k)}`, v);
  });
  Object.entries(theme.elevation).forEach(([k, v]) => {
    root.style.setProperty(`--gf-elevation-${kebab(k)}`, v);
  });
  root.setAttribute('data-theme-type', theme.type);
  root.setAttribute('data-theme-id', theme.id);
}

function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
"""

files["packages/shared/src/index.ts"] = """export * from './emitter';
export * from './uuid';
export * from './tokens';
"""

# --- packages/sdk ---
files["packages/sdk/package.json"] = json.dumps({
  "name": "@gridforge/sdk",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}, indent=2)

files["packages/sdk/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/sdk/src/manifest.ts"] = """export type ModulePermission =
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
"""

files["packages/sdk/src/context.ts"] = """import { ModulePermission } from './manifest';

export interface ModuleLogger {
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
}

export interface CellValue {
  r: number;
  c: number;
  v: string | number | boolean | null;
  f?: string;
  fmt?: string;
  meta?: Record<string, unknown>;
}

export interface GridForgeModuleContext {
  readonly moduleId: string;
  readonly permissions: ReadonlyArray<ModulePermission>;

  commands: {
    registerCommand(id: string, handler: (...args: unknown[]) => unknown): () => void;
    executeCommand<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
  };
  events: {
    on(event: string, listener: (data: unknown) => void): () => void;
    emit(event: string, data: unknown): void;
  };
  cells: {
    getCell(sheetId: string, r: number, c: number): Promise<CellValue | null>;
    getRange(sheetId: string, sr: number, sc: number, er: number, ec: number): Promise<CellValue[][]>;
    setCell(sheetId: string, r: number, c: number, value: Partial<CellValue>): Promise<void>;
    setRange(sheetId: string, cells: CellValue[]): Promise<void>;
  };
  selection: {
    getSelection(): Promise<{ sheetId: string; activeCell: { r: number; c: number }; ranges: any[] }>;
  };
  ui: {
    registerPanel(panelId: string, renderer: (container: HTMLElement) => () => void): void;
    showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    showDialog(opts: { title: string; message: string; buttons: string[] }): Promise<number>;
  };
  settings: {
    get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
    set<T = unknown>(key: string, value: T): Promise<void>;
  };
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  logger: ModuleLogger;
  theme: {
    getCurrentTheme(): Record<string, unknown>;
    onThemeChanged(callback: (theme: Record<string, unknown>) => void): () => void;
  };
  i18n: {
    t(key: string, params?: Record<string, string | number>): string;
  };
}
"""

files["packages/sdk/src/module.ts"] = """import { GridForgeModuleContext } from './context';

export interface HealthCheckResult {
  ok: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface GridForgeModule {
  activate(ctx: GridForgeModuleContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
  selfTest?(): Promise<HealthCheckResult> | HealthCheckResult;
}
"""

files["packages/sdk/src/index.ts"] = """export * from './manifest';
export * from './context';
export * from './module';
"""

# --- packages/module-host ---
files["packages/module-host/package.json"] = json.dumps({
  "name": "@gridforge/module-host",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@gridforge/sdk": "workspace:*",
    "@gridforge/shared": "workspace:*"
  }
}, indent=2)

files["packages/module-host/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/module-host/src/manifest-validator.ts"] = """import { ModuleManifest, ModulePermission } from '@gridforge/sdk';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_PERMISSIONS: ModulePermission[] = [
  'cells.read', 'cells.write', 'selection.read', 'bridge',
  'storage', 'clipboard', 'network:local', 'network:external',
  'network:none', 'fs:dialog'
];

export function validateManifest(manifest: unknown): ValidationResult {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a JSON object.'] };
  }
  const m = manifest as Partial<ModuleManifest>;
  if (!m.id || typeof m.id !== 'string' || !/^[a-z0-9-_]+$/.test(m.id)) {
    errors.push('Module id is required and must only contain lowercase alphanumeric, hyphen, or underscore.');
  }
  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    errors.push('Module name is required.');
  }
  if (!m.version || typeof m.version !== 'string' || !/^\\d+\\.\\d+\\.\\d+/.test(m.version)) {
    errors.push('Module version must follow semver.');
  }
  if (!m.apiVersion || typeof m.apiVersion !== 'string') {
    errors.push('Module apiVersion is required.');
  }
  if (!m.requires || typeof m.requires !== 'object' || !m.requires.core) {
    errors.push('requires.core is required.');
  }
  if (!Array.isArray(m.permissions)) {
    errors.push('Module permissions must be an array.');
  } else {
    for (const p of m.permissions) {
      if (!VALID_PERMISSIONS.includes(p as ModulePermission)) {
        errors.push(`Unknown permission: "${p}".`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
"""

files["packages/module-host/src/permission-guard.ts"] = """import { ModulePermission, GridForgeModuleContext } from '@gridforge/sdk';

export class PermissionDeniedError extends Error {
  constructor(public readonly moduleId: string, public readonly requiredPermission: ModulePermission) {
    super(`Permission denied: Module "${moduleId}" requires permission "${requiredPermission}".`);
    this.name = 'PermissionDeniedError';
  }
}

export function createGuardedContext(
  moduleId: string,
  declaredPermissions: ReadonlyArray<ModulePermission>,
  baseContext: GridForgeModuleContext
): GridForgeModuleContext {
  const has = (p: ModulePermission) => declaredPermissions.includes(p);

  return {
    ...baseContext,
    moduleId,
    permissions: declaredPermissions,
    cells: {
      getCell: async (s, r, c) => {
        if (!has('cells.read')) throw new PermissionDeniedError(moduleId, 'cells.read');
        return baseContext.cells.getCell(s, r, c);
      },
      getRange: async (s, sr, sc, er, ec) => {
        if (!has('cells.read')) throw new PermissionDeniedError(moduleId, 'cells.read');
        return baseContext.cells.getRange(s, sr, sc, er, ec);
      },
      setCell: async (s, r, c, val) => {
        if (!has('cells.write')) throw new PermissionDeniedError(moduleId, 'cells.write');
        return baseContext.cells.setCell(s, r, c, val);
      },
      setRange: async (s, cells) => {
        if (!has('cells.write')) throw new PermissionDeniedError(moduleId, 'cells.write');
        return baseContext.cells.setRange(s, cells);
      }
    },
    selection: {
      getSelection: async () => {
        if (!has('selection.read')) throw new PermissionDeniedError(moduleId, 'selection.read');
        return baseContext.selection.getSelection();
      }
    },
    storage: {
      getItem: async (k) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.getItem(k);
      },
      setItem: async (k, v) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.setItem(k, v);
      },
      removeItem: async (k) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.removeItem(k);
      }
    }
  };
}
"""

files["packages/module-host/src/crash-tracker.ts"] = """const WINDOW_MS = 10 * 60 * 1000;
const MAX_CRASHES = 3;

export class CrashTracker {
  private crashHistory: Map<string, number[]> = new Map();

  recordCrash(moduleId: string): { autoDisable: boolean; count: number } {
    const now = Date.now();
    const history = (this.crashHistory.get(moduleId) || []).filter(
      (ts) => now - ts < WINDOW_MS
    );
    history.push(now);
    this.crashHistory.set(moduleId, history);
    return {
      autoDisable: history.length >= MAX_CRASHES,
      count: history.length
    };
  }

  reset(moduleId: string): void {
    this.crashHistory.delete(moduleId);
  }

  getRecentCrashCount(moduleId: string): number {
    const now = Date.now();
    const history = (this.crashHistory.get(moduleId) || []).filter(
      (ts) => now - ts < WINDOW_MS
    );
    this.crashHistory.set(moduleId, history);
    return history.length;
  }
}
"""

files["packages/module-host/src/archive-manager.ts"] = """import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ArchiveManager {
  private baseArchiveDir: string;

  constructor(customArchiveDir?: string) {
    if (customArchiveDir) {
      this.baseArchiveDir = customArchiveDir;
    } else {
      this.baseArchiveDir = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge', 'modules-archive');
    }
  }

  async archiveVersion(moduleId: string, version: string, sourceDir: string): Promise<string> {
    const targetDir = path.join(this.baseArchiveDir, moduleId, version);
    await fs.promises.mkdir(targetDir, { recursive: true });
    await this.copyDir(sourceDir, targetDir);
    return targetDir;
  }

  async listArchivedVersions(moduleId: string): Promise<string[]> {
    const modDir = path.join(this.baseArchiveDir, moduleId);
    try {
      const entries = await fs.promises.readdir(modDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  async rollback(moduleId: string, version: string, destinationDir: string): Promise<boolean> {
    const archiveDir = path.join(this.baseArchiveDir, moduleId, version);
    try {
      await fs.promises.access(archiveDir);
      await fs.promises.rm(destinationDir, { recursive: true, force: true });
      await fs.promises.mkdir(destinationDir, { recursive: true });
      await this.copyDir(archiveDir, destinationDir);
      return true;
    } catch {
      return false;
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dest, e.name);
      if (e.isDirectory()) await this.copyDir(s, d);
      else await fs.promises.copyFile(s, d);
    }
  }
}
"""

files["packages/module-host/src/module-logger.ts"] = """import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ModuleLogger } from '@gridforge/sdk';

export class FileModuleLogger implements ModuleLogger {
  private logFilePath: string;

  constructor(public readonly moduleId: string, customLogsDir?: string) {
    const baseDir = customLogsDir || path.join(os.homedir(), 'Library', 'Logs', 'GridForge', 'modules');
    fs.mkdirSync(baseDir, { recursive: true });
    this.logFilePath = path.join(baseDir, `${moduleId}.log`);
  }

  getLogPath(): string {
    return this.logFilePath;
  }

  async readRecentLogs(lines = 100): Promise<string> {
    try {
      const content = await fs.promises.readFile(this.logFilePath, 'utf8');
      return content.split('\\n').slice(-lines).join('\\n');
    } catch {
      return `(No logs recorded yet for module "${this.moduleId}")`;
    }
  }

  private write(level: string, message: string, ...meta: unknown[]): void {
    const ts = new Date().toISOString();
    const metaStr = meta.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    fs.appendFile(this.logFilePath, `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}\\n`, () => {});
  }

  info(msg: string, ...m: unknown[]) { this.write('info', msg, ...m); }
  warn(msg: string, ...m: unknown[]) { this.write('warn', msg, ...m); }
  error(msg: string, ...m: unknown[]) { this.write('error', msg, ...m); }
  debug(msg: string, ...m: unknown[]) { this.write('debug', msg, ...m); }
}
"""

files["packages/module-host/src/module-host.ts"] = """import * as fs from 'fs';
import * as path from 'path';
import { TypedEventEmitter } from '@gridforge/shared';
import {
  GridForgeModule,
  GridForgeModuleContext,
  HealthCheckResult,
  ModuleManifest
} from '@gridforge/sdk';
import { validateManifest } from './manifest-validator';
import { createGuardedContext } from './permission-guard';
import { CrashTracker } from './crash-tracker';
import { ArchiveManager } from './archive-manager';
import { FileModuleLogger } from './module-logger';

export type ModuleStatus = 'running' | 'stopped' | 'disabled' | 'error';

export interface ModuleRecord {
  id: string;
  manifest: ModuleManifest;
  dirPath: string;
  status: ModuleStatus;
  isBuiltIn: boolean;
  errorReason?: string;
  crashCount: number;
  instance?: GridForgeModule;
  logger: FileModuleLogger;
}

export interface ModuleHostEvents {
  'module:loaded': ModuleRecord;
  'module:unloaded': { moduleId: string };
  'module:crashed': {
    moduleId: string;
    moduleName: string;
    reason: string;
    autoDisabled: boolean;
    canRollback: boolean;
  };
  'module:status-changed': {
    moduleId: string;
    status: ModuleStatus;
    reason?: string;
  };
}

export interface ModuleHostOptions {
  modulesDir: string;
  isSafeMode?: boolean;
  baseContextFactory: (moduleId: string) => GridForgeModuleContext;
  customArchiveDir?: string;
  customLogsDir?: string;
  builtInModuleIds?: string[];
}

export class ModuleHost extends TypedEventEmitter<ModuleHostEvents> {
  private modules: Map<string, ModuleRecord> = new Map();
  private crashTracker = new CrashTracker();
  private archiveManager: ArchiveManager;
  private isSafeMode: boolean;
  private modulesDir: string;
  private baseContextFactory: (moduleId: string) => GridForgeModuleContext;
  private builtInModuleIds: Set<string>;
  private customLogsDir?: string;

  constructor(options: ModuleHostOptions) {
    super();
    this.modulesDir = options.modulesDir;
    this.isSafeMode = !!options.isSafeMode;
    this.baseContextFactory = options.baseContextFactory;
    this.archiveManager = new ArchiveManager(options.customArchiveDir);
    this.customLogsDir = options.customLogsDir;
    this.builtInModuleIds = new Set(options.builtInModuleIds || []);
  }

  getModules(): ModuleRecord[] {
    return Array.from(this.modules.values());
  }

  getModule(id: string): ModuleRecord | undefined {
    return this.modules.get(id);
  }

  getArchiveManager(): ArchiveManager {
    return this.archiveManager;
  }

  async discoverAndLoadAll(): Promise<void> {
    if (!fs.existsSync(this.modulesDir)) {
      await fs.promises.mkdir(this.modulesDir, { recursive: true });
    }
    const entries = await fs.promises.readdir(this.modulesDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        await this.loadModuleFromDir(path.join(this.modulesDir, e.name));
      }
    }
  }

  async loadModuleFromDir(dirPath: string): Promise<ModuleRecord | null> {
    const manifestPath = path.join(dirPath, 'module.json');
    if (!fs.existsSync(manifestPath)) return null;

    let manifestRaw: unknown;
    try {
      manifestRaw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    } catch {
      return null;
    }

    const validation = validateManifest(manifestRaw);
    if (!validation.valid) return null;

    const manifest = manifestRaw as ModuleManifest;
    const isBuiltIn = this.builtInModuleIds.has(manifest.id);
    const logger = new FileModuleLogger(manifest.id, this.customLogsDir);

    const record: ModuleRecord = {
      id: manifest.id,
      manifest,
      dirPath,
      status: 'stopped',
      isBuiltIn,
      crashCount: this.crashTracker.getRecentCrashCount(manifest.id),
      logger
    };

    this.modules.set(manifest.id, record);

    if (this.isSafeMode && !isBuiltIn) {
      record.status = 'disabled';
      record.errorReason = 'Disabled by Safe Mode';
      this.emit('module:status-changed', { moduleId: manifest.id, status: 'disabled', reason: record.errorReason });
      return record;
    }

    await this.activateModule(manifest.id);
    this.emit('module:loaded', record);
    return record;
  }

  async activateModule(moduleId: string, timeoutMs = 4000): Promise<boolean> {
    const record = this.modules.get(moduleId);
    if (!record || record.status === 'disabled') return false;

    try {
      const entryFile = this.resolveEntryFile(record.dirPath, record.manifest.main);
      const modExport = await this.withTimeout(import(entryFile), timeoutMs, 'Load timeout');
      const instance: GridForgeModule = modExport.default || modExport;

      if (typeof instance.activate !== 'function') {
        throw new Error('Module entry file does not export activate()');
      }

      const guardedCtx = createGuardedContext(moduleId, record.manifest.permissions, this.baseContextFactory(moduleId));
      await this.withTimeout(Promise.resolve(instance.activate(guardedCtx)), timeoutMs, 'Activation timeout');

      record.instance = instance;
      record.status = 'running';
      record.errorReason = undefined;
      this.emit('module:status-changed', { moduleId, status: 'running' });
      return true;
    } catch (err: any) {
      return this.handleModuleCrash(record, err?.message || String(err));
    }
  }

  async deactivateModule(moduleId: string): Promise<boolean> {
    const record = this.modules.get(moduleId);
    if (!record) return true;
    try {
      if (record.instance?.deactivate) {
        await Promise.resolve(record.instance.deactivate());
      }
    } catch (err) {
      record.logger.error('Error deactivating:', err);
    } finally {
      record.instance = undefined;
      record.status = 'stopped';
      this.emit('module:status-changed', { moduleId, status: 'stopped' });
    }
    return true;
  }

  async disableModule(moduleId: string, reason = 'Disabled by user'): Promise<boolean> {
    await this.deactivateModule(moduleId);
    const record = this.modules.get(moduleId);
    if (record) {
      record.status = 'disabled';
      record.errorReason = reason;
      this.emit('module:status-changed', { moduleId, status: 'disabled', reason });
    }
    return true;
  }

  async enableModule(moduleId: string): Promise<boolean> {
    const record = this.modules.get(moduleId);
    if (!record) return false;
    record.status = 'stopped';
    record.errorReason = undefined;
    this.crashTracker.reset(moduleId);
    return this.activateModule(moduleId);
  }

  async checkHealth(moduleId: string): Promise<HealthCheckResult> {
    const record = this.modules.get(moduleId);
    if (!record || !record.instance) return { ok: false, message: 'Module not running' };
    if (!record.instance.selfTest) return { ok: true, message: 'Assumed healthy (no self-test)' };
    try {
      return await Promise.resolve(record.instance.selfTest());
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Self-test threw exception' };
    }
  }

  async rollbackModule(moduleId: string, targetVersion: string): Promise<boolean> {
    const record = this.modules.get(moduleId);
    if (!record) return false;
    await this.deactivateModule(moduleId);
    const restored = await this.archiveManager.rollback(moduleId, targetVersion, record.dirPath);
    if (!restored) return false;
    this.crashTracker.reset(moduleId);
    return (await this.loadModuleFromDir(record.dirPath)) !== null;
  }

  private async handleModuleCrash(record: ModuleRecord, reason: string): Promise<boolean> {
    record.instance = undefined;
    record.status = 'error';
    record.errorReason = reason;
    record.logger.error(`Module crashed: ${reason}`);

    const { autoDisable, count } = this.crashTracker.recordCrash(record.id);
    record.crashCount = count;

    if (autoDisable) {
      record.status = 'disabled';
      record.errorReason = `Auto-disabled after ${count} crashes in 10 minutes: ${reason}`;
    }

    const archivedVersions = await this.archiveManager.listArchivedVersions(record.id);
    this.emit('module:crashed', {
      moduleId: record.id,
      moduleName: record.manifest.name,
      reason,
      autoDisabled: autoDisable,
      canRollback: archivedVersions.length > 0
    });
    this.emit('module:status-changed', { moduleId: record.id, status: record.status, reason: record.errorReason });
    return false;
  }

  private resolveEntryFile(dirPath: string, mainField?: string): string {
    const candidates = [
      mainField ? path.join(dirPath, mainField) : null,
      path.join(dirPath, 'index.ts'),
      path.join(dirPath, 'index.js')
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    throw new Error(`Entry file not found in ${dirPath}`);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
      promise.then((res) => { clearTimeout(timer); resolve(res); })
             .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }
}
"""

files["packages/module-host/src/index.ts"] = """export * from './manifest-validator';
export * from './permission-guard';
export * from './crash-tracker';
export * from './archive-manager';
export * from './module-logger';
export * from './module-host';
"""

# Test suite for module-host
files["packages/module-host/tests/module-host.test.ts"] = """import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  validateManifest,
  createGuardedContext,
  PermissionDeniedError,
  CrashTracker,
  ArchiveManager,
  ModuleHost
} from '../src';
import { GridForgeModuleContext } from '@gridforge/sdk';

describe('Manifest Validation', () => {
  it('validates a correct manifest cleanly', () => {
    const valid = {
      id: 'my-mod',
      name: 'My Module',
      version: '1.0.0',
      apiVersion: '1',
      description: 'Test module',
      author: 'Tester',
      requires: { core: '>=1.0.0' },
      permissions: ['cells.read', 'cells.write']
    };
    const res = validateManifest(valid);
    expect(res.valid).toBe(true);
  });

  it('rejects invalid IDs and missing required fields', () => {
    const res = validateManifest({ id: 'Invalid ID', version: 'bad' });
    expect(res.valid).toBe(false);
  });
});

describe('Permission Enforcement Guard', () => {
  const createMockContext = (): GridForgeModuleContext => ({
    moduleId: 'test-mod',
    permissions: [],
    commands: { registerCommand: () => () => {}, executeCommand: async () => null },
    events: { on: () => () => {}, emit: () => {} },
    cells: {
      getCell: async () => ({ r: 0, c: 0, v: 'secret' }),
      getRange: async () => [],
      setCell: async () => {},
      setRange: async () => {}
    },
    selection: { getSelection: async () => ({ sheetId: 'S1', activeCell: { r: 0, c: 0 }, ranges: [] }) },
    ui: { registerPanel: () => {}, showToast: () => {}, showDialog: async () => 0 },
    settings: { get: async () => null, set: async () => {} },
    storage: { getItem: async () => 'data', setItem: async () => {}, removeItem: async () => {} },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    theme: { getCurrentTheme: () => ({}), onThemeChanged: () => () => {} },
    i18n: { t: (k) => k }
  });

  it('blocks cell write if module only declared cells.read', async () => {
    const guarded = createGuardedContext('test-mod', ['cells.read'], createMockContext());
    const cell = await guarded.cells.getCell('S1', 0, 0);
    expect(cell?.v).toBe('secret');
    await expect(guarded.cells.setCell('S1', 0, 0, { v: 'hacked' })).rejects.toThrow(PermissionDeniedError);
  });
});

describe('Crash Tracker & Auto-Disable', () => {
  it('triggers auto-disable after 3 crashes', () => {
    const tracker = new CrashTracker();
    tracker.recordCrash('mod-1');
    tracker.recordCrash('mod-1');
    const c3 = tracker.recordCrash('mod-1');
    expect(c3.autoDisable).toBe(true);
  });
});

describe('Archive & Rollback Manager', () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-test-'));
  });
  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('archives and rolls back', async () => {
    const mgr = new ArchiveManager(path.join(tmpDir, 'archive'));
    const modDir = path.join(tmpDir, 'mod');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(path.join(modDir, 'module.json'), JSON.stringify({ version: '1.0.0' }));
    await mgr.archiveVersion('mod', '1.0.0', modDir);

    await fs.promises.writeFile(path.join(modDir, 'module.json'), JSON.stringify({ version: '2.0.0' }));
    const success = await mgr.rollback('mod', '1.0.0', modDir);
    expect(success).toBe(true);

    const restored = JSON.parse(await fs.promises.readFile(path.join(modDir, 'module.json'), 'utf8'));
    expect(restored.version).toBe('1.0.0');
  });
});

describe('ModuleHost Chaos Resilience', () => {
  it('survives an intentional crash during activation', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-chaos-'));
    const modDir = path.join(tmp, 'broken');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(modDir, 'module.json'),
      JSON.stringify({
        id: 'broken',
        name: 'Broken',
        version: '1.0.0',
        apiVersion: '1',
        description: 'Broken',
        author: 'Tester',
        requires: { core: '>=1.0.0' },
        permissions: []
      })
    );
    await fs.promises.writeFile(
      path.join(modDir, 'index.js'),
      'module.exports = { activate: () => { throw new Error("Chaos fatal crash"); } };'
    );

    const host = new ModuleHost({
      modulesDir: tmp,
      baseContextFactory: (id) => ({} as any)
    });

    await host.discoverAndLoadAll();
    const mod = host.getModule('broken');
    expect(mod?.status).toBe('error');
    expect(mod?.errorReason).toContain('Chaos fatal crash');
  });
});
"""

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully wrote {len(files)} package and test files.")
