export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

export class TypedEventEmitter<Events = any> {
  private listeners: Map<keyof Events, Set<EventListener<any>>> = new Map();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of Array.from(set)) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventEmitter] Error for event "${String(event)}":`, err);
        }
      }
    }
  }
}
