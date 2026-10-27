import { ModulePermission, GridForgeModuleContext } from '@gridforge/sdk';
export declare class PermissionDeniedError extends Error {
    readonly moduleId: string;
    readonly requiredPermission: ModulePermission;
    constructor(moduleId: string, requiredPermission: ModulePermission);
}
export declare function createGuardedContext(moduleId: string, declaredPermissions: ReadonlyArray<ModulePermission>, baseContext: GridForgeModuleContext): GridForgeModuleContext;
//# sourceMappingURL=permission-guard.d.ts.map