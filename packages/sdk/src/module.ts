import { GridForgeModuleContext } from './context';

export interface HealthCheckResult {
  ok: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export interface GridForgeModule {
  activate(ctx: GridForgeModuleContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
  selfTest?(): Promise<HealthCheckResult> | HealthCheckResult;
}
