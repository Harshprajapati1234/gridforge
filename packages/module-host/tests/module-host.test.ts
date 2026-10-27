import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  validateManifest,
  createGuardedContext,
  PermissionDeniedError,
  CrashTracker,
  ArchiveManager,
  ModuleHost
} from '../src';
import { GridForgeModuleContext } from '@gridforge/sdk';

describe('Manifest Validation', () => {
  it('validates a correct manifest cleanly', () => {
    const valid = {
      id: 'my-mod',
      name: 'My Module',
      version: '1.0.0',
      apiVersion: '1',
      description: 'Test module',
      author: 'Tester',
      requires: { core: '>=1.0.0' },
      permissions: ['cells.read', 'cells.write']
    };
    const res = validateManifest(valid);
    expect(res.valid).toBe(true);
  });

  it('rejects invalid IDs and missing required fields', () => {
    const res = validateManifest({ id: 'Invalid ID', version: 'bad' });
    expect(res.valid).toBe(false);
  });
});

describe('Permission Enforcement Guard', () => {
  const createMockContext = (): GridForgeModuleContext => ({
    moduleId: 'test-mod',
    permissions: [],
    commands: { registerCommand: () => () => {}, executeCommand: async () => null },
    events: { on: () => () => {}, emit: () => {} },
    cells: {
      getCell: async () => ({ r: 0, c: 0, v: 'secret' }),
      getRange: async () => [],
      setCell: async () => {},
      setRange: async () => {}
    },
    selection: { getSelection: async () => ({ sheetId: 'S1', activeCell: { r: 0, c: 0 }, ranges: [] }) },
    ui: { registerPanel: () => {}, showToast: () => {}, showDialog: async () => 0 },
    settings: { get: async () => null, set: async () => {} },
    storage: { getItem: async () => 'data', setItem: async () => {}, removeItem: async () => {} },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    theme: { getCurrentTheme: () => ({}), onThemeChanged: () => () => {} },
    i18n: { t: (k) => k }
  });

  it('blocks cell write if module only declared cells.read', async () => {
    const guarded = createGuardedContext('test-mod', ['cells.read'], createMockContext());
    const cell = await guarded.cells.getCell('S1', 0, 0);
    expect(cell?.v).toBe('secret');
    await expect(guarded.cells.setCell('S1', 0, 0, { v: 'hacked' })).rejects.toThrow(PermissionDeniedError);
  });
});

describe('Crash Tracker & Auto-Disable', () => {
  it('triggers auto-disable after 3 crashes', () => {
    const tracker = new CrashTracker();
    tracker.recordCrash('mod-1');
    tracker.recordCrash('mod-1');
    const c3 = tracker.recordCrash('mod-1');
    expect(c3.autoDisable).toBe(true);
  });
});

describe('Archive & Rollback Manager', () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-test-'));
  });
  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('archives and rolls back', async () => {
    const mgr = new ArchiveManager(path.join(tmpDir, 'archive'));
    const modDir = path.join(tmpDir, 'mod');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(path.join(modDir, 'module.json'), JSON.stringify({ version: '1.0.0' }));
    await mgr.archiveVersion('mod', '1.0.0', modDir);

    await fs.promises.writeFile(path.join(modDir, 'module.json'), JSON.stringify({ version: '2.0.0' }));
    const success = await mgr.rollback('mod', '1.0.0', modDir);
    expect(success).toBe(true);

    const restored = JSON.parse(await fs.promises.readFile(path.join(modDir, 'module.json'), 'utf8'));
    expect(restored.version).toBe('1.0.0');
  });
});

describe('ModuleHost Chaos Resilience', () => {
  it('survives an intentional crash during activation in isolated worker', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-chaos-'));
    const modDir = path.join(tmp, 'broken');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(modDir, 'module.json'),
      JSON.stringify({
        id: 'broken',
        name: 'Broken',
        version: '1.0.0',
        apiVersion: '1',
        description: 'Broken',
        author: 'Tester',
        requires: { core: '>=1.0.0' },
        permissions: []
      })
    );
    await fs.promises.writeFile(
      path.join(modDir, 'index.js'),
      'module.exports = { activate: () => { throw new Error("Chaos fatal crash"); } };'
    );

    const host = new ModuleHost({
      modulesDir: tmp,
      baseContextFactory: () => ({} as any)
    });

    await host.discoverAndLoadAll();
    const mod = host.getModule('broken');
    expect(mod?.status).toBe('error');
    expect(mod?.errorReason).toContain('Chaos fatal crash');
  });

  it('terminates a hanging module with an infinite loop without freezing the host', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-hang-'));
    const modDir = path.join(tmp, 'hanging');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(modDir, 'module.json'),
      JSON.stringify({
        id: 'hanging',
        name: 'Hanging',
        version: '1.0.0',
        apiVersion: '1',
        description: 'Hanging',
        author: 'Tester',
        requires: { core: '>=1.0.0' },
        permissions: []
      })
    );
    await fs.promises.writeFile(
      path.join(modDir, 'index.js'),
      'module.exports = { activate: () => { while(true) {} } };'
    );

    const host = new ModuleHost({
      modulesDir: tmp,
      baseContextFactory: () => ({} as any)
    });

    // Module load with short timeout (1000ms)
    const record = await host.loadModuleFromDir(modDir);
    expect(record?.status).toBe('error');
    expect(record?.errorReason).toContain('timed out');
    // Host is still responsive
    expect(host.getModules().length).toBe(1);
  }, 10000);

  it('executes commands across worker thread boundary and writes cells via host context', async () => {
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gf-comm-'));
    const modDir = path.join(tmp, 'worker-writer');
    await fs.promises.mkdir(modDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(modDir, 'module.json'),
      JSON.stringify({
        id: 'worker-writer',
        name: 'Worker Writer',
        version: '1.0.0',
        apiVersion: '1',
        description: 'Worker Writer',
        author: 'Tester',
        requires: { core: '>=1.0.0' },
        permissions: ['cells.write', 'commands']
      })
    );
    await fs.promises.writeFile(
      path.join(modDir, 'index.js'),
      `module.exports = {
        activate(ctx) {
          ctx.commands.registerCommand('test:write', async () => {
            await ctx.cells.setCell('Sheet1', 0, 0, { v: 'Written by worker' });
            return 'OK';
          });
        }
      };`
    );

    let cellWritten: any = null;
    const host = new ModuleHost({
      modulesDir: tmp,
      baseContextFactory: () => ({
        moduleId: 'worker-writer',
        permissions: ['cells.write', 'commands'],
        commands: { registerCommand: () => () => {}, executeCommand: async () => null },
        events: { on: () => () => {}, emit: () => {} },
        cells: {
          getCell: async () => null,
          getRange: async () => [],
          setCell: async (s, r, c, val) => { cellWritten = { s, r, c, val }; },
          setRange: async () => {}
        },
        selection: { getSelection: async () => ({ sheetId: 'Sheet1', activeCell: { r: 0, c: 0 }, ranges: [] }) },
        ui: { registerPanel: () => {}, showToast: () => {}, showDialog: async () => 0 },
        settings: { get: async () => null, set: async () => {} },
        storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
        logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
        theme: { getCurrentTheme: () => ({}), onThemeChanged: () => () => {} },
        i18n: { t: (k) => k }
      })
    });

    await host.discoverAndLoadAll();
    const mod = host.getModule('worker-writer');
    expect(mod?.status).toBe('running');

    const result = await host.executeCommand('worker-writer', 'test:write');
    expect(result).toBe('OK');
    expect(cellWritten).toEqual({
      s: 'Sheet1',
      r: 0,
      c: 0,
      val: { v: 'Written by worker' }
    });

    await host.deactivateModule('worker-writer');
  });
});
