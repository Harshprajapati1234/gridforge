import { ModuleLogger } from '@gridforge/sdk';
export declare class FileModuleLogger implements ModuleLogger {
    readonly moduleId: string;
    private logFilePath;
    constructor(moduleId: string, customLogsDir?: string);
    getLogPath(): string;
    readRecentLogs(lines?: number): Promise<string>;
    private write;
    info(msg: string, ...m: unknown[]): void;
    warn(msg: string, ...m: unknown[]): void;
    error(msg: string, ...m: unknown[]): void;
    debug(msg: string, ...m: unknown[]): void;
}
//# sourceMappingURL=module-logger.d.ts.map