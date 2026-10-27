"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashTracker = void 0;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_CRASHES = 3;
class CrashTracker {
    crashHistory = new Map();
    recordCrash(moduleId) {
        const now = Date.now();
        const history = (this.crashHistory.get(moduleId) || []).filter((ts) => now - ts < WINDOW_MS);
        history.push(now);
        this.crashHistory.set(moduleId, history);
        return {
            autoDisable: history.length >= MAX_CRASHES,
            count: history.length
        };
    }
    reset(moduleId) {
        this.crashHistory.delete(moduleId);
    }
    getRecentCrashCount(moduleId) {
        const now = Date.now();
        const history = (this.crashHistory.get(moduleId) || []).filter((ts) => now - ts < WINDOW_MS);
        this.crashHistory.set(moduleId, history);
        return history.length;
    }
}
exports.CrashTracker = CrashTracker;
//# sourceMappingURL=crash-tracker.js.map