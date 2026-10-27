import { ModulePermission, GridForgeModuleContext } from '@gridforge/sdk';

export class PermissionDeniedError extends Error {
  constructor(public readonly moduleId: string, public readonly requiredPermission: ModulePermission) {
    super(`Permission denied: Module "${moduleId}" requires permission "${requiredPermission}".`);
    this.name = 'PermissionDeniedError';
  }
}

export function createGuardedContext(
  moduleId: string,
  declaredPermissions: ReadonlyArray<ModulePermission>,
  baseContext: GridForgeModuleContext
): GridForgeModuleContext {
  const has = (p: ModulePermission) => declaredPermissions.includes(p);

  return {
    ...baseContext,
    moduleId,
    permissions: declaredPermissions,
    commands: {
      registerCommand: (id, handler) => {
        if (!has('commands')) throw new PermissionDeniedError(moduleId, 'commands');
        return baseContext.commands.registerCommand(id, handler);
      },
      executeCommand: async (id, ...args) => {
        if (!has('commands')) throw new PermissionDeniedError(moduleId, 'commands');
        return baseContext.commands.executeCommand(id, ...args);
      }
    },
    events: {
      on: (event, listener) => {
        if (!has('events')) throw new PermissionDeniedError(moduleId, 'events');
        return baseContext.events.on(event, listener);
      },
      emit: (event, data) => {
        if (!has('events')) throw new PermissionDeniedError(moduleId, 'events');
        baseContext.events.emit(event, data);
      }
    },
    cells: {
      getCell: async (s, r, c) => {
        if (!has('cells.read')) throw new PermissionDeniedError(moduleId, 'cells.read');
        return baseContext.cells.getCell(s, r, c);
      },
      getRange: async (s, sr, sc, er, ec) => {
        if (!has('cells.read')) throw new PermissionDeniedError(moduleId, 'cells.read');
        return baseContext.cells.getRange(s, sr, sc, er, ec);
      },
      setCell: async (s, r, c, val) => {
        if (!has('cells.write')) throw new PermissionDeniedError(moduleId, 'cells.write');
        return baseContext.cells.setCell(s, r, c, val);
      },
      setRange: async (s, cells) => {
        if (!has('cells.write')) throw new PermissionDeniedError(moduleId, 'cells.write');
        return baseContext.cells.setRange(s, cells);
      }
    },
    selection: {
      getSelection: async () => {
        if (!has('selection.read')) throw new PermissionDeniedError(moduleId, 'selection.read');
        return baseContext.selection.getSelection();
      }
    },
    ui: {
      registerPanel: (panelId, renderer) => {
        if (!has('ui')) throw new PermissionDeniedError(moduleId, 'ui');
        baseContext.ui.registerPanel(panelId, renderer);
      },
      showToast: (message, type) => {
        if (!has('ui')) throw new PermissionDeniedError(moduleId, 'ui');
        baseContext.ui.showToast(message, type);
      },
      showDialog: async (opts) => {
        if (!has('ui')) throw new PermissionDeniedError(moduleId, 'ui');
        return baseContext.ui.showDialog(opts);
      }
    },
    settings: {
      get: async (k, def) => {
        if (!has('settings')) throw new PermissionDeniedError(moduleId, 'settings');
        return baseContext.settings.get(k, def);
      },
      set: async (k, v) => {
        if (!has('settings')) throw new PermissionDeniedError(moduleId, 'settings');
        return baseContext.settings.set(k, v);
      }
    },
    storage: {
      getItem: async (k) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.getItem(k);
      },
      setItem: async (k, v) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.setItem(k, v);
      },
      removeItem: async (k) => {
        if (!has('storage')) throw new PermissionDeniedError(moduleId, 'storage');
        return baseContext.storage.removeItem(k);
      }
    }
  };
}
