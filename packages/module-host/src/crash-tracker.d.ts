export declare class CrashTracker {
    private crashHistory;
    recordCrash(moduleId: string): {
        autoDisable: boolean;
        count: number;
    };
    reset(moduleId: string): void;
    getRecentCrashCount(moduleId: string): number;
}
//# sourceMappingURL=crash-tracker.d.ts.map