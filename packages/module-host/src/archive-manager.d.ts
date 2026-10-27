export declare class ArchiveManager {
    private baseArchiveDir;
    constructor(customArchiveDir?: string);
    archiveVersion(moduleId: string, version: string, sourceDir: string): Promise<string>;
    listArchivedVersions(moduleId: string): Promise<string[]>;
    rollback(moduleId: string, version: string, destinationDir: string): Promise<boolean>;
    private copyDir;
}
//# sourceMappingURL=archive-manager.d.ts.map