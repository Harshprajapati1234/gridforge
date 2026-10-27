import { ModulePermission } from './manifest';

export interface ModuleLogger {
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
}

export interface CellValue {
  r: number;
  c: number;
  v: string | number | boolean | null;
  f?: string;
  fmt?: string;
  meta?: Record<string, unknown>;
}

export interface GridForgeModuleContext {
  readonly moduleId: string;
  readonly permissions: ReadonlyArray<ModulePermission>;

  commands: {
    registerCommand(id: string, handler: (...args: unknown[]) => unknown): () => void;
    executeCommand<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
  };
  events: {
    on(event: string, listener: (data: unknown) => void): () => void;
    emit(event: string, data: unknown): void;
  };
  cells: {
    getCell(sheetId: string, r: number, c: number): Promise<CellValue | null>;
    getRange(sheetId: string, sr: number, sc: number, er: number, ec: number): Promise<CellValue[][]>;
    setCell(sheetId: string, r: number, c: number, value: Partial<CellValue>): Promise<void>;
    setRange(sheetId: string, cells: CellValue[]): Promise<void>;
  };
  selection: {
    getSelection(): Promise<{ sheetId: string; activeCell: { r: number; c: number }; ranges: any[] }>;
  };
  ui: {
    registerPanel(panelId: string, renderer: (container: HTMLElement) => () => void): void;
    showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    showDialog(opts: { title: string; message: string; buttons: string[] }): Promise<number>;
  };
  settings: {
    get<T = unknown>(key: string, defaultValue?: T): Promise<T>;
    set<T = unknown>(key: string, value: T): Promise<void>;
  };
  storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  logger: ModuleLogger;
  theme: {
    getCurrentTheme(): Record<string, unknown>;
    onThemeChanged(callback: (theme: Record<string, unknown>) => void): () => void;
  };
  i18n: {
    t(key: string, params?: Record<string, string | number>): string;
  };
}
