"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleHost = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const shared_1 = require("@gridforge/shared");
const manifest_validator_1 = require("./manifest-validator");
const permission_guard_1 = require("./permission-guard");
const crash_tracker_1 = require("./crash-tracker");
const archive_manager_1 = require("./archive-manager");
const module_logger_1 = require("./module-logger");
class ModuleHost extends shared_1.TypedEventEmitter {
    modules = new Map();
    crashTracker = new crash_tracker_1.CrashTracker();
    archiveManager;
    isSafeMode;
    modulesDir;
    baseContextFactory;
    builtInModuleIds;
    customLogsDir;
    constructor(options) {
        super();
        this.modulesDir = options.modulesDir;
        this.isSafeMode = !!options.isSafeMode;
        this.baseContextFactory = options.baseContextFactory;
        this.archiveManager = new archive_manager_1.ArchiveManager(options.customArchiveDir);
        this.customLogsDir = options.customLogsDir;
        this.builtInModuleIds = new Set(options.builtInModuleIds || []);
    }
    getModules() {
        return Array.from(this.modules.values());
    }
    getModule(id) {
        return this.modules.get(id);
    }
    getArchiveManager() {
        return this.archiveManager;
    }
    async discoverAndLoadAll() {
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
    async loadModuleFromDir(dirPath) {
        const manifestPath = path.join(dirPath, 'module.json');
        if (!fs.existsSync(manifestPath))
            return null;
        let manifestRaw;
        try {
            manifestRaw = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
        }
        catch {
            return null;
        }
        const validation = (0, manifest_validator_1.validateManifest)(manifestRaw);
        if (!validation.valid)
            return null;
        const manifest = manifestRaw;
        const isBuiltIn = this.builtInModuleIds.has(manifest.id);
        const logger = new module_logger_1.FileModuleLogger(manifest.id, this.customLogsDir);
        const record = {
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
    async activateModule(moduleId, timeoutMs = 4000) {
        const record = this.modules.get(moduleId);
        if (!record || record.status === 'disabled')
            return false;
        try {
            const entryFile = this.resolveEntryFile(record.dirPath, record.manifest.main);
            const modExport = await this.withTimeout(Promise.resolve(`${entryFile}`).then(s => __importStar(require(s))), timeoutMs, 'Load timeout');
            const instance = modExport.default || modExport;
            if (typeof instance.activate !== 'function') {
                throw new Error('Module entry file does not export activate()');
            }
            const guardedCtx = (0, permission_guard_1.createGuardedContext)(moduleId, record.manifest.permissions, this.baseContextFactory(moduleId));
            await this.withTimeout(Promise.resolve(instance.activate(guardedCtx)), timeoutMs, 'Activation timeout');
            record.instance = instance;
            record.status = 'running';
            record.errorReason = undefined;
            this.emit('module:status-changed', { moduleId, status: 'running' });
            return true;
        }
        catch (err) {
            return this.handleModuleCrash(record, err?.message || String(err));
        }
    }
    async deactivateModule(moduleId) {
        const record = this.modules.get(moduleId);
        if (!record)
            return true;
        try {
            if (record.instance?.deactivate) {
                await Promise.resolve(record.instance.deactivate());
            }
        }
        catch (err) {
            record.logger.error('Error deactivating:', err);
        }
        finally {
            record.instance = undefined;
            record.status = 'stopped';
            this.emit('module:status-changed', { moduleId, status: 'stopped' });
        }
        return true;
    }
    async disableModule(moduleId, reason = 'Disabled by user') {
        await this.deactivateModule(moduleId);
        const record = this.modules.get(moduleId);
        if (record) {
            record.status = 'disabled';
            record.errorReason = reason;
            this.emit('module:status-changed', { moduleId, status: 'disabled', reason });
        }
        return true;
    }
    async enableModule(moduleId) {
        const record = this.modules.get(moduleId);
        if (!record)
            return false;
        record.status = 'stopped';
        record.errorReason = undefined;
        this.crashTracker.reset(moduleId);
        return this.activateModule(moduleId);
    }
    async checkHealth(moduleId) {
        const record = this.modules.get(moduleId);
        if (!record || !record.instance)
            return { ok: false, message: 'Module not running' };
        if (!record.instance.selfTest)
            return { ok: true, message: 'Assumed healthy (no self-test)' };
        try {
            return await Promise.resolve(record.instance.selfTest());
        }
        catch (err) {
            return { ok: false, message: err?.message || 'Self-test threw exception' };
        }
    }
    async rollbackModule(moduleId, targetVersion) {
        const record = this.modules.get(moduleId);
        if (!record)
            return false;
        await this.deactivateModule(moduleId);
        const restored = await this.archiveManager.rollback(moduleId, targetVersion, record.dirPath);
        if (!restored)
            return false;
        this.crashTracker.reset(moduleId);
        return (await this.loadModuleFromDir(record.dirPath)) !== null;
    }
    async handleModuleCrash(record, reason) {
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
    resolveEntryFile(dirPath, mainField) {
        const candidates = [
            mainField ? path.join(dirPath, mainField) : null,
            path.join(dirPath, 'index.ts'),
            path.join(dirPath, 'index.js')
        ].filter(Boolean);
        for (const c of candidates) {
            if (fs.existsSync(c))
                return c;
        }
        throw new Error(`Entry file not found in ${dirPath}`);
    }
    withTimeout(promise, timeoutMs, timeoutMsg) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
            promise.then((res) => { clearTimeout(timer); resolve(res); })
                .catch((err) => { clearTimeout(timer); reject(err); });
        });
    }
}
exports.ModuleHost = ModuleHost;
//# sourceMappingURL=module-host.js.map