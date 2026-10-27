"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionDeniedError = void 0;
exports.createGuardedContext = createGuardedContext;
class PermissionDeniedError extends Error {
    moduleId;
    requiredPermission;
    constructor(moduleId, requiredPermission) {
        super(`Permission denied: Module "${moduleId}" requires permission "${requiredPermission}".`);
        this.moduleId = moduleId;
        this.requiredPermission = requiredPermission;
        this.name = 'PermissionDeniedError';
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
function createGuardedContext(moduleId, declaredPermissions, baseContext) {
    const has = (p) => declaredPermissions.includes(p);
    return {
        ...baseContext,
        moduleId,
        permissions: declaredPermissions,
        cells: {
            getCell: async (s, r, c) => {
                if (!has('cells.read'))
                    throw new PermissionDeniedError(moduleId, 'cells.read');
                return baseContext.cells.getCell(s, r, c);
            },
            getRange: async (s, sr, sc, er, ec) => {
                if (!has('cells.read'))
                    throw new PermissionDeniedError(moduleId, 'cells.read');
                return baseContext.cells.getRange(s, sr, sc, er, ec);
            },
            setCell: async (s, r, c, val) => {
                if (!has('cells.write'))
                    throw new PermissionDeniedError(moduleId, 'cells.write');
                return baseContext.cells.setCell(s, r, c, val);
            },
            setRange: async (s, cells) => {
                if (!has('cells.write'))
                    throw new PermissionDeniedError(moduleId, 'cells.write');
                return baseContext.cells.setRange(s, cells);
            }
        },
        selection: {
            getSelection: async () => {
                if (!has('selection.read'))
                    throw new PermissionDeniedError(moduleId, 'selection.read');
                return baseContext.selection.getSelection();
            }
        },
        storage: {
            getItem: async (k) => {
                if (!has('storage'))
                    throw new PermissionDeniedError(moduleId, 'storage');
                return baseContext.storage.getItem(k);
            },
            setItem: async (k, v) => {
                if (!has('storage'))
                    throw new PermissionDeniedError(moduleId, 'storage');
                return baseContext.storage.setItem(k, v);
            },
            removeItem: async (k) => {
                if (!has('storage'))
                    throw new PermissionDeniedError(moduleId, 'storage');
                return baseContext.storage.removeItem(k);
            }
        }
    };
}
//# sourceMappingURL=permission-guard.js.map