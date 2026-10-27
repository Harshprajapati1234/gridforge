import { TypedEventEmitter } from '@gridforge/shared';
import { GridForgeModule, GridForgeModuleContext, HealthCheckResult, ModuleManifest } from '@gridforge/sdk';
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
    'module:unloaded': {
        moduleId: string;
    };
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
export declare class ModuleHost extends TypedEventEmitter<ModuleHostEvents> {
    private modules;
    private crashTracker;
    private archiveManager;
    private isSafeMode;
    private modulesDir;
    private baseContextFactory;
    private builtInModuleIds;
    private customLogsDir?;
    constructor(options: ModuleHostOptions);
    getModules(): ModuleRecord[];
    getModule(id: string): ModuleRecord | undefined;
    getArchiveManager(): ArchiveManager;
    discoverAndLoadAll(): Promise<void>;
    loadModuleFromDir(dirPath: string): Promise<ModuleRecord | null>;
    activateModule(moduleId: string, timeoutMs?: number): Promise<boolean>;
    deactivateModule(moduleId: string): Promise<boolean>;
    disableModule(moduleId: string, reason?: string): Promise<boolean>;
    enableModule(moduleId: string): Promise<boolean>;
    checkHealth(moduleId: string): Promise<HealthCheckResult>;
    rollbackModule(moduleId: string, targetVersion: string): Promise<boolean>;
    private handleModuleCrash;
    private resolveEntryFile;
    private withTimeout;
}
//# sourceMappingURL=module-host.d.ts.map