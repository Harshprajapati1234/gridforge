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
exports.ArchiveManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ArchiveManager {
    baseArchiveDir;
    constructor(customArchiveDir) {
        if (customArchiveDir) {
            this.baseArchiveDir = customArchiveDir;
        }
        else {
            this.baseArchiveDir = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge', 'modules-archive');
        }
    }
    async archiveVersion(moduleId, version, sourceDir) {
        const targetDir = path.join(this.baseArchiveDir, moduleId, version);
        await fs.promises.mkdir(targetDir, { recursive: true });
        await this.copyDir(sourceDir, targetDir);
        return targetDir;
    }
    async listArchivedVersions(moduleId) {
        const modDir = path.join(this.baseArchiveDir, moduleId);
        try {
            const entries = await fs.promises.readdir(modDir, { withFileTypes: true });
            return entries.filter((e) => e.isDirectory()).map((e) => e.name);
        }
        catch {
            return [];
        }
    }
    async rollback(moduleId, version, destinationDir) {
        const archiveDir = path.join(this.baseArchiveDir, moduleId, version);
        try {
            await fs.promises.access(archiveDir);
            await fs.promises.rm(destinationDir, { recursive: true, force: true });
            await fs.promises.mkdir(destinationDir, { recursive: true });
            await this.copyDir(archiveDir, destinationDir);
            return true;
        }
        catch {
            return false;
        }
    }
    async copyDir(src, dest) {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src, { withFileTypes: true });
        for (const e of entries) {
            const s = path.join(src, e.name);
            const d = path.join(dest, e.name);
            if (e.isDirectory())
                await this.copyDir(s, d);
            else
                await fs.promises.copyFile(s, d);
        }
    }
}
exports.ArchiveManager = ArchiveManager;
//# sourceMappingURL=archive-manager.js.map