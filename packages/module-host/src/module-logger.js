"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileModuleLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class FileModuleLogger {
    moduleId;
    logFilePath;
    constructor(moduleId, customLogsDir) {
        this.moduleId = moduleId;
        const baseDir = customLogsDir || path.join(os.homedir(), 'Library', 'Logs', 'GridForge', 'modules');
        fs.mkdirSync(baseDir, { recursive: true });
        this.logFilePath = path.join(baseDir, `${moduleId}.log`);
    }
    getLogPath() {
        return this.logFilePath;
    }
    async readRecentLogs(lines = 100) {
        try {
            const content = await fs.promises.readFile(this.logFilePath, 'utf8');
            return content.split('\n').slice(-lines).join('\n');
        }
        catch {
            return `(No logs recorded yet for module "${this.moduleId}")`;
        }
    }
    write(level, message, ...meta) {
        const ts = new Date().toISOString();
        const metaStr = meta.length > 0 ? ` ${JSON.stringify(meta)}` : '';
        fs.appendFile(this.logFilePath, `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}\n`, () => { });
    }
    info(msg, ...m) { this.write('info', msg, ...m); }
    warn(msg, ...m) { this.write('warn', msg, ...m); }
    error(msg, ...m) { this.write('error', msg, ...m); }
    debug(msg, ...m) { this.write('debug', msg, ...m); }
}
exports.FileModuleLogger = FileModuleLogger;
//# sourceMappingURL=module-logger.js.map