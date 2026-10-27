export type EventListener<T = unknown> = (data: T) => void | Promise<void>;
export declare class TypedEventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
    private listeners;
    on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): () => void;
    off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void;
    emit<K extends keyof Events>(event: K, data: Events[K]): void;
}
//# sourceMappingURL=emitter.d.ts.map