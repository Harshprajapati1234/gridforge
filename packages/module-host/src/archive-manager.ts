import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ArchiveManager {
  private baseArchiveDir: string;

  constructor(customArchiveDir?: string) {
    if (customArchiveDir) {
      this.baseArchiveDir = customArchiveDir;
    } else {
      this.baseArchiveDir = path.join(os.homedir(), 'Library', 'Application Support', 'GridForge', 'modules-archive');
    }
  }

  async archiveVersion(moduleId: string, version: string, sourceDir: string): Promise<string> {
    const targetDir = path.join(this.baseArchiveDir, moduleId, version);
    await fs.promises.mkdir(targetDir, { recursive: true });
    await this.copyDir(sourceDir, targetDir);
    return targetDir;
  }

  async listArchivedVersions(moduleId: string): Promise<string[]> {
    const modDir = path.join(this.baseArchiveDir, moduleId);
    try {
      const entries = await fs.promises.readdir(modDir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  async rollback(moduleId: string, version: string, destinationDir: string): Promise<boolean> {
    const archiveDir = path.join(this.baseArchiveDir, moduleId, version);
    try {
      await fs.promises.access(archiveDir);
      await fs.promises.rm(destinationDir, { recursive: true, force: true });
      await fs.promises.mkdir(destinationDir, { recursive: true });
      await this.copyDir(archiveDir, destinationDir);
      return true;
    } catch {
      return false;
    }
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dest, e.name);
      if (e.isDirectory()) await this.copyDir(s, d);
      else await fs.promises.copyFile(s, d);
    }
  }
}
