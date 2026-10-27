"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedEventEmitter = void 0;
class TypedEventEmitter {
    listeners = new Map();
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
        return () => this.off(event, listener);
    }
    off(event, listener) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(listener);
            if (set.size === 0)
                this.listeners.delete(event);
        }
    }
    emit(event, data) {
        const set = this.listeners.get(event);
        if (set) {
            for (const listener of Array.from(set)) {
                try {
                    listener(data);
                }
                catch (err) {
                    console.error(`[EventEmitter] Error for event "${String(event)}":`, err);
                }
            }
        }
    }
}
exports.TypedEventEmitter = TypedEventEmitter;
//# sourceMappingURL=emitter.js.map