/**
 * Self-contained Worker script for running GridForge modules in isolated threads.
 * Executed via new Worker(WORKER_RUNNER_CODE, { eval: true, workerData }).
 */
export const WORKER_RUNNER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const path = require('path');

const { moduleId, entryPath, permissions } = workerData;
let moduleInstance = null;
const commandHandlers = new Map();
const pendingCalls = new Map();
let nextCallId = 1;

function callHost(service, method, args) {
  return new Promise((resolve, reject) => {
    const callId = nextCallId++;
    pendingCalls.set(callId, { resolve, reject });
    parentPort.postMessage({ type: 'callHost', callId, service, method, args });
  });
}

// Proxy context passed to module instance
const ctx = {
  moduleId,
  permissions: Object.freeze([...(permissions || [])]),
  commands: {
    registerCommand(id, handler) {
      commandHandlers.set(id, handler);
      parentPort.postMessage({ type: 'registerCommand', commandId: id });
      return () => {
        commandHandlers.delete(id);
        parentPort.postMessage({ type: 'unregisterCommand', commandId: id });
      };
    },
    executeCommand(id, ...args) {
      return callHost('commands', 'executeCommand', [id, ...args]);
    }
  },
  events: {
    on(event, listener) {
      // Event listeners can be dispatched from host
      return () => {};
    },
    emit(event, data) {
      parentPort.postMessage({ type: 'callHost', service: 'events', method: 'emit', args: [event, data] });
    }
  },
  cells: {
    getCell(sheetId, r, c) {
      return callHost('cells', 'getCell', [sheetId, r, c]);
    },
    getRange(sheetId, sr, sc, er, ec) {
      return callHost('cells', 'getRange', [sheetId, sr, sc, er, ec]);
    },
    setCell(sheetId, r, c, value) {
      return callHost('cells', 'setCell', [sheetId, r, c, value]);
    },
    setRange(sheetId, cells) {
      return callHost('cells', 'setRange', [sheetId, cells]);
    }
  },
  selection: {
    getSelection() {
      return callHost('selection', 'getSelection', []);
    }
  },
  ui: {
    registerPanel(panelId, renderer) {
      parentPort.postMessage({ type: 'callHost', service: 'ui', method: 'registerPanel', args: [panelId] });
    },
    showToast(message, type) {
      parentPort.postMessage({ type: 'callHost', service: 'ui', method: 'showToast', args: [message, type] });
    },
    showDialog(opts) {
      return callHost('ui', 'showDialog', [opts]);
    }
  },
  settings: {
    get(key, defaultValue) {
      return callHost('settings', 'get', [key, defaultValue]);
    },
    set(key, value) {
      return callHost('settings', 'set', [key, value]);
    }
  },
  storage: {
    getItem(key) {
      return callHost('storage', 'getItem', [key]);
    },
    setItem(key, value) {
      return callHost('storage', 'setItem', [key, value]);
    },
    removeItem(key) {
      return callHost('storage', 'removeItem', [key]);
    }
  },
  logger: {
    info(msg, ...meta) { parentPort.postMessage({ type: 'log', level: 'info', message: msg, meta }); },
    warn(msg, ...meta) { parentPort.postMessage({ type: 'log', level: 'warn', message: msg, meta }); },
    error(msg, ...meta) { parentPort.postMessage({ type: 'log', level: 'error', message: msg, meta }); },
    debug(msg, ...meta) { parentPort.postMessage({ type: 'log', level: 'debug', message: msg, meta }); }
  },
  theme: {
    getCurrentTheme() { return {}; },
    onThemeChanged() { return () => {}; }
  },
  i18n: {
    t(key) { return key; }
  }
};

parentPort.on('message', async (msg) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'ping') {
    parentPort.postMessage({ type: 'pong', pingId: msg.pingId });
    return;
  }

  if (msg.type === 'hostResponse') {
    const pending = pendingCalls.get(msg.callId);
    if (pending) {
      pendingCalls.delete(msg.callId);
      if (msg.error) pending.reject(new Error(msg.error));
      else pending.resolve(msg.result);
    }
    return;
  }

  if (msg.type === 'activate') {
    try {
      const modExport = require(entryPath);
      moduleInstance = modExport.default || modExport;
      if (typeof moduleInstance.activate === 'function') {
        await Promise.resolve(moduleInstance.activate(ctx));
      }
      parentPort.postMessage({ type: 'activateResult', callId: msg.callId, ok: true });
    } catch (err) {
      parentPort.postMessage({
        type: 'activateResult',
        callId: msg.callId,
        ok: false,
        error: err ? err.stack || err.message : String(err)
      });
    }
    return;
  }

  if (msg.type === 'deactivate') {
    try {
      if (moduleInstance && typeof moduleInstance.deactivate === 'function') {
        await Promise.resolve(moduleInstance.deactivate());
      }
      parentPort.postMessage({ type: 'deactivateResult', callId: msg.callId, ok: true });
    } catch (err) {
      parentPort.postMessage({
        type: 'deactivateResult',
        callId: msg.callId,
        ok: false,
        error: err ? err.message : String(err)
      });
    }
    return;
  }

  if (msg.type === 'selfTest') {
    try {
      let result = { ok: true, message: 'Assumed healthy (no self-test)' };
      if (moduleInstance && typeof moduleInstance.selfTest === 'function') {
        result = await Promise.resolve(moduleInstance.selfTest());
      }
      parentPort.postMessage({ type: 'selfTestResult', callId: msg.callId, result });
    } catch (err) {
      parentPort.postMessage({
        type: 'selfTestResult',
        callId: msg.callId,
        result: { ok: false, message: err ? err.message : 'Self-test exception' }
      });
    }
    return;
  }

  if (msg.type === 'executeCommand') {
    const handler = commandHandlers.get(msg.commandId);
    if (!handler) {
      parentPort.postMessage({
        type: 'executeCommandResult',
        callId: msg.callId,
        error: 'Command not registered in module: ' + msg.commandId
      });
      return;
    }
    try {
      const res = await Promise.resolve(handler(...(msg.args || [])));
      parentPort.postMessage({ type: 'executeCommandResult', callId: msg.callId, result: res });
    } catch (err) {
      parentPort.postMessage({
        type: 'executeCommandResult',
        callId: msg.callId,
        error: err ? err.stack || err.message : String(err)
      });
    }
    return;
  }
});
`;
