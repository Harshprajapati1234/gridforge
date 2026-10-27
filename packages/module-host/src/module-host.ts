import * as fs from 'fs';
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
