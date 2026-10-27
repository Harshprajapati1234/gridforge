import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ModuleLogger } from '@gridforge/sdk';

export class FileModuleLogger implements ModuleLogger {
  private logFilePath: string;

  constructor(public readonly moduleId: string, customLogsDir?: string) {
    const baseDir = customLogsDir || path.join(os.homedir(), 'Library', 'Logs', 'GridForge', 'modules');
    fs.mkdirSync(baseDir, { recursive: true });
    this.logFilePath = path.join(baseDir, `${moduleId}.log`);
  }

  getLogPath(): string {
    return this.logFilePath;
  }

  async readRecentLogs(lines = 100): Promise<string> {
    try {
      const content = await fs.promises.readFile(this.logFilePath, 'utf8');
      return content.split('\n').slice(-lines).join('\n');
    } catch {
      return `(No logs recorded yet for module "${this.moduleId}")`;
    }
  }

  private write(level: string, message: string, ...meta: unknown[]): void {
    const ts = new Date().toISOString();
    const metaStr = meta.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    fs.appendFile(this.logFilePath, `[${ts}] [${level.toUpperCase()}] ${message}${metaStr}\n`, () => {});
  }

  info(msg: string, ...m: unknown[]) { this.write('info', msg, ...m); }
  warn(msg: string, ...m: unknown[]) { this.write('warn', msg, ...m); }
  error(msg: string, ...m: unknown[]) { this.write('error', msg, ...m); }
  debug(msg: string, ...m: unknown[]) { this.write('debug', msg, ...m); }
}
