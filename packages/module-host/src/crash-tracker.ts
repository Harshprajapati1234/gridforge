const WINDOW_MS = 10 * 60 * 1000;
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
