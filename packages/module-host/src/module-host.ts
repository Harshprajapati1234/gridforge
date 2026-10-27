import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { TypedEventEmitter } from '@gridforge/shared';
import {
  GridForgeModuleContext,
  HealthCheckResult,
  ModuleManifest
} from '@gridforge/sdk';
import { validateManifest } from './manifest-validator';
import { createGuardedContext } from './permission-guard';
import { CrashTracker } from './crash-tracker';
import { ArchiveManager } from './archive-manager';
import { FileModuleLogger } from './module-logger';
import { WORKER_RUNNER_CODE } from './worker-runner-code';

export type ModuleStatus = 'running' | 'stopped' | 'disabled' | 'error';

export interface ModuleRecord {
  id: string;
  manifest: ModuleManifest;
  dirPath: string;
  entryFile?: string;
  status: ModuleStatus;
  isBuiltIn: boolean;
  errorReason?: string;
  crashCount: number;
  worker?: Worker;
  logger: FileModuleLogger;
  registeredCommands: Set<string>;
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
  'command:registered': {
    moduleId: string;
    commandId: string;
  };
  'command:unregistered': {
    moduleId: string;
    commandId: string;
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

interface WorkerCall {
  resolve: (res: any) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
}

interface WorkerSession {
  worker: Worker;
  pendingCalls: Map<number, WorkerCall>;
  heartbeatTimer?: NodeJS.Timeout;
  lastPongTime: number;
  guardedContext: GridForgeModuleContext;
}

export class ModuleHost extends TypedEventEmitter<ModuleHostEvents> {
  private modules: Map<string, ModuleRecord> = new Map();
  private workerSessions: Map<string, WorkerSession> = new Map();
  private crashTracker = new CrashTracker();
  private archiveManager: ArchiveManager;
  private isSafeMode: boolean;
  private modulesDir: string;
  private baseContextFactory: (moduleId: string) => GridForgeModuleContext;
  private builtInModuleIds: Set<string>;
  private customLogsDir?: string;
  private callCounter = 1;

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
    const dirName = path.basename(dirPath);
    const manifestPath = path.join(dirPath, 'module.json');

    // 1. Check module.json existence
    if (!fs.existsSync(manifestPath)) {
      const errRecord: ModuleRecord = {
        id: dirName,
        manifest: {
          id: dirName,
          name: dirName,
          version: '0.0.0',
          apiVersion: '1',
          description: 'Failed to load module',
          author: 'Unknown',
          requires: { core: '>=1.0.0' },
          permissions: []
        },
        dirPath,
        status: 'error',
        isBuiltIn: this.builtInModuleIds.has(dirName),
        errorReason: `Missing module.json manifest in ${dirPath}`,
        crashCount: 0,
        logger: new FileModuleLogger(dirName, this.customLogsDir),
        registeredCommands: new Set()
      };
      this.modules.set(dirName, errRecord);
      this.emit('module:status-changed', { moduleId: dirName, status: 'error', reason: errRecord.errorReason });
      return errRecord;
    }

    // 2. Read and parse module.json
    let manifestRaw: any;
    try {
      manifestRaw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    } catch (parseErr: any) {
      const errRecord: ModuleRecord = {
        id: dirName,
        manifest: {
          id: dirName,
          name: dirName,
          version: '0.0.0',
          apiVersion: '1',
          description: 'Invalid JSON in module.json',
          author: 'Unknown',
          requires: { core: '>=1.0.0' },
          permissions: []
        },
        dirPath,
        status: 'error',
        isBuiltIn: this.builtInModuleIds.has(dirName),
        errorReason: `Invalid JSON in module.json: ${parseErr?.message}`,
        crashCount: 0,
        logger: new FileModuleLogger(dirName, this.customLogsDir),
        registeredCommands: new Set()
      };
      this.modules.set(dirName, errRecord);
      this.emit('module:status-changed', { moduleId: dirName, status: 'error', reason: errRecord.errorReason });
      return errRecord;
    }

    // 3. Validate manifest schema
    const validation = validateManifest(manifestRaw);
    const modId = manifestRaw.id || dirName;
    if (!validation.valid) {
      const errRecord: ModuleRecord = {
        id: modId,
        manifest: {
          id: modId,
          name: manifestRaw.name || modId,
          version: manifestRaw.version || '0.0.0',
          apiVersion: manifestRaw.apiVersion || '1',
          description: manifestRaw.description || 'Manifest validation failed',
          author: manifestRaw.author || 'Unknown',
          requires: manifestRaw.requires || { core: '>=1.0.0' },
          permissions: []
        },
        dirPath,
        status: 'error',
        isBuiltIn: this.builtInModuleIds.has(modId),
        errorReason: `Manifest validation error: ${validation.errors.join('; ')}`,
        crashCount: 0,
        logger: new FileModuleLogger(modId, this.customLogsDir),
        registeredCommands: new Set()
      };
      this.modules.set(modId, errRecord);
      this.emit('module:status-changed', { moduleId: modId, status: 'error', reason: errRecord.errorReason });
      return errRecord;
    }

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
      logger,
      registeredCommands: new Set()
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

    // Terminate any existing worker session
    await this.terminateWorkerSession(moduleId);

    try {
      const entryFile = this.resolveEntryFile(record.dirPath, record.manifest.main);
      record.entryFile = entryFile;

      const baseContext = this.baseContextFactory(moduleId);
      const guardedContext = createGuardedContext(moduleId, record.manifest.permissions, baseContext);

      const worker = new Worker(WORKER_RUNNER_CODE, {
        eval: true,
        workerData: {
          moduleId,
          entryPath: entryFile,
          permissions: record.manifest.permissions
        }
      });

      const session: WorkerSession = {
        worker,
        pendingCalls: new Map(),
        lastPongTime: Date.now(),
        guardedContext
      };
      this.workerSessions.set(moduleId, session);
      record.worker = worker;

      // Handle worker IPC messages
      worker.on('message', async (msg) => {
        if (!msg || typeof msg !== 'object') return;

        if (msg.type === 'pong') {
          session.lastPongTime = Date.now();
          return;
        }

        if (msg.type === 'log') {
          const fn = (record.logger as any)[msg.level] || record.logger.info;
          fn.call(record.logger, msg.message, ...(msg.meta || []));
          return;
        }

        if (msg.type === 'registerCommand') {
          record.registeredCommands.add(msg.commandId);
          this.emit('command:registered', { moduleId, commandId: msg.commandId });
          return;
        }

        if (msg.type === 'unregisterCommand') {
          record.registeredCommands.delete(msg.commandId);
          this.emit('command:unregistered', { moduleId, commandId: msg.commandId });
          return;
        }

        if (msg.type === 'callHost') {
          await this.handleCallHost(session, msg.callId, msg.service, msg.method, msg.args);
          return;
        }

        if (msg.type === 'activateResult' || msg.type === 'deactivateResult' || msg.type === 'selfTestResult' || msg.type === 'executeCommandResult') {
          const call = session.pendingCalls.get(msg.callId);
          if (call) {
            session.pendingCalls.delete(msg.callId);
            clearTimeout(call.timer);
            if (msg.error || msg.ok === false) {
              call.reject(new Error(msg.error || 'Operation failed'));
            } else {
              call.resolve(msg.result !== undefined ? msg.result : true);
            }
          }
          return;
        }
      });

      worker.on('error', (err) => {
        this.handleModuleCrash(record, `Worker thread error: ${err.message}`);
      });

      worker.on('exit', (code) => {
        if (code !== 0 && record.status === 'running') {
          this.handleModuleCrash(record, `Worker thread exited unexpectedly with code ${code}`);
        }
      });

      // Start watchdog heartbeat (ping every 2s)
      session.heartbeatTimer = setInterval(() => {
        if (Date.now() - session.lastPongTime > 4500) {
          // Unresponsive worker detected by watchdog!
          this.handleModuleCrash(record, 'Module worker became unresponsive (Watchdog timeout)');
          this.terminateWorkerSession(moduleId);
        } else {
          worker.postMessage({ type: 'ping', pingId: Date.now() });
        }
      }, 2000);

      // Call activate in worker
      await this.postCallToWorker(session, 'activate', {}, timeoutMs);

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

    const session = this.workerSessions.get(moduleId);
    if (session) {
      try {
        await this.postCallToWorker(session, 'deactivate', {}, 2000);
      } catch (err) {
        record.logger.error('Error in deactivate call:', err);
      } finally {
        await this.terminateWorkerSession(moduleId);
      }
    }

    record.worker = undefined;
    record.status = 'stopped';
    record.registeredCommands.clear();
    this.emit('module:status-changed', { moduleId, status: 'stopped' });
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

  async executeCommand(moduleId: string, commandId: string, args: unknown[] = [], timeoutMs = 5000): Promise<unknown> {
    const record = this.modules.get(moduleId);
    if (!record || record.status !== 'running') {
      throw new Error(`Module "${moduleId}" is not running.`);
    }

    const session = this.workerSessions.get(moduleId);
    if (!session) {
      throw new Error(`Worker session not found for module "${moduleId}".`);
    }

    return this.postCallToWorker(session, 'executeCommand', { commandId, args }, timeoutMs);
  }

  async checkHealth(moduleId: string): Promise<HealthCheckResult> {
    const record = this.modules.get(moduleId);
    if (!record || record.status !== 'running') {
      return { ok: false, message: 'Module not running' };
    }

    const session = this.workerSessions.get(moduleId);
    if (!session) {
      return { ok: false, message: 'No active worker session' };
    }

    try {
      const res = await this.postCallToWorker(session, 'selfTest', {}, 3000);
      return res as HealthCheckResult;
    } catch (err: any) {
      return { ok: false, message: err?.message || 'Self-test timed out or failed' };
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

  async removeModule(moduleId: string): Promise<boolean> {
    const record = this.modules.get(moduleId);
    if (!record) return false;
    if (record.isBuiltIn) {
      throw new Error(`Cannot remove built-in module "${moduleId}".`);
    }

    await this.deactivateModule(moduleId);
    this.modules.delete(moduleId);

    // Delete folder from disk
    if (fs.existsSync(record.dirPath)) {
      await fs.promises.rm(record.dirPath, { recursive: true, force: true });
    }

    this.emit('module:unloaded', { moduleId });
    return true;
  }

  async installModuleFromPath(sourceDir: string): Promise<ModuleRecord> {
    const manifestPath = path.join(sourceDir, 'module.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No module.json found in ${sourceDir}`);
    }

    const raw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
    const val = validateManifest(raw);
    if (!val.valid) {
      throw new Error(`Manifest invalid: ${val.errors.join(', ')}`);
    }

    const modId = raw.id;
    const destDir = path.join(this.modulesDir, modId);

    // If module already exists, archive existing version first
    const existing = this.modules.get(modId);
    if (existing) {
      await this.archiveManager.archiveVersion(modId, existing.manifest.version, existing.dirPath);
      await this.deactivateModule(modId);
    }

    // Copy new files to modules directory
    await fs.promises.mkdir(destDir, { recursive: true });
    await this.copyDir(sourceDir, destDir);

    // Load and activate
    const loaded = await this.loadModuleFromDir(destDir);
    if (!loaded) throw new Error('Failed to load installed module.');
    return loaded;
  }

  private async handleCallHost(session: WorkerSession, callId: number, service: string, method: string, args: any[]) {
    try {
      const s = (session.guardedContext as any)[service];
      if (!s || typeof s[method] !== 'function') {
        throw new Error(`Unknown service or method: ${service}.${method}`);
      }
      const result = await Promise.resolve(s[method](...(args || [])));
      session.worker.postMessage({ type: 'hostResponse', callId, result });
    } catch (err: any) {
      session.worker.postMessage({ type: 'hostResponse', callId, error: err?.message || String(err) });
    }
  }

  private postCallToWorker(session: WorkerSession, type: string, payload: any, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const callId = this.callCounter++;
      const timer = setTimeout(() => {
        session.pendingCalls.delete(callId);
        reject(new Error(`Operation "${type}" timed out after ${timeoutMs}ms (Watchdog)`));
      }, timeoutMs);

      session.pendingCalls.set(callId, { resolve, reject, timer });
      session.worker.postMessage({ type, callId, ...payload });
    });
  }

  private async terminateWorkerSession(moduleId: string) {
    const session = this.workerSessions.get(moduleId);
    if (session) {
      if (session.heartbeatTimer) clearInterval(session.heartbeatTimer);
      for (const call of session.pendingCalls.values()) {
        clearTimeout(call.timer);
        call.reject(new Error('Module worker terminated'));
      }
      session.pendingCalls.clear();
      await session.worker.terminate().catch(() => {});
      this.workerSessions.delete(moduleId);
    }
  }

  private async handleModuleCrash(record: ModuleRecord, reason: string): Promise<boolean> {
    await this.terminateWorkerSession(record.id);
    record.worker = undefined;
    record.status = 'error';
    record.errorReason = reason;
    record.registeredCommands.clear();
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
      path.join(dirPath, 'dist/index.js'),
      path.join(dirPath, 'index.js')
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    throw new Error(`Entry file not found in ${dirPath} (tried dist/index.js, index.js)`);
  }

  private async copyDir(src: string, dest: string) {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
}
