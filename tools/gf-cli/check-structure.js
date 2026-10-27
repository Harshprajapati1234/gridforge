const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
let hasErrors = false;

function error(msg) {
  console.error(`[check:structure:ERROR] ${msg}`);
  hasErrors = true;
}

function success(msg) {
  console.log(`[check:structure:OK] ${msg}`);
}

console.log('[check:structure] Validating GridForge monorepo structure and module isolation rules...\n');

// 1. Validate required architecture directories
const requiredDirs = [
  'apps/desktop',
  'apps/renderer',
  'packages/core',
  'packages/formula',
  'packages/grid',
  'packages/module-host',
  'packages/bridge-service',
  'packages/sdk',
  'packages/shared',
  'packages/ui-kit',
  'ui/icons',
  'ui/fonts',
  'ui/themes'
];

for (const dir of requiredDirs) {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    error(`Missing required architectural directory: ${dir}`);
  }
}
if (!hasErrors) success('Core directory architecture validated.');

// 2. Validate Module Isolation: Modules may ONLY import from '@gridforge/sdk'
const modulesDir = path.join(rootDir, 'modules');
if (fs.existsSync(modulesDir)) {
  const modDirs = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const dirent of modDirs) {
    if (!dirent.isDirectory()) continue;
    const modPath = path.join(modulesDir, dirent.name);

    // Verify manifest
    const manifestPath = path.join(modPath, 'module.json');
    if (!fs.existsSync(manifestPath)) {
      error(`Module ${dirent.name} is missing required manifest "module.json"`);
    } else {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (!manifest.id || !manifest.name || !manifest.version) {
          error(`Module ${dirent.name} module.json is missing id, name, or version`);
        }
        const entryPoint = manifest.entry || manifest.main;
        if (entryPoint !== 'dist/index.js') {
          error(`Module ${dirent.name} entry/main must point to built "dist/index.js", found: ${entryPoint}`);
        }
      } catch (err) {
        error(`Module ${dirent.name} module.json is invalid JSON: ${err.message}`);
      }
    }

    // Prohibit legacy manifest.json
    if (fs.existsSync(path.join(modPath, 'manifest.json'))) {
      error(`Module ${dirent.name} contains deprecated "manifest.json". Only "module.json" is permitted.`);
    }

    // Inspect source code imports in module
    function scanSourceFiles(currentDir) {
      const files = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const f of files) {
        const fPath = path.join(currentDir, f.name);
        if (f.isDirectory()) {
          if (f.name === 'dist' || f.name === 'node_modules') continue;
          scanSourceFiles(fPath);
        } else if (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js')) {
          const content = fs.readFileSync(fPath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            // Match import ... from '...' or require('...')
            const importMatch = /from\s+['"]([^'"]+)['"]/.exec(line);
            const reqMatch = /require\(['"]([^'"]+)['"]\)/.exec(line);
            const rawTarget = importMatch ? importMatch[1] : (reqMatch ? reqMatch[1] : null);

            if (rawTarget) {
              const relPath = path.relative(rootDir, fPath);
              // Allowed: @gridforge/sdk or relative paths within the same module
              if (rawTarget.startsWith('.')) {
                const resolvedTarget = path.resolve(currentDir, rawTarget);
                if (!resolvedTarget.startsWith(modPath)) {
                  error(`Module isolation violation in ${relPath}:${idx + 1} -> cannot import outside module: "${rawTarget}"`);
                }
              } else if (!rawTarget.startsWith('@gridforge/sdk')) {
                error(`Module isolation violation in ${relPath}:${idx + 1} -> modules may ONLY import from "@gridforge/sdk". Found import: "${rawTarget}"`);
              }
            }
          });
        }
      }
    }
    scanSourceFiles(modPath);
  }
}
if (!hasErrors) success('Module isolation rules passed: all modules strictly import only @gridforge/sdk.');

// 3. Verify no committed build outputs in packages/*/src
const packagesDir = path.join(rootDir, 'packages');
if (fs.existsSync(packagesDir)) {
  const pkgs = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const pkg of pkgs) {
    if (!pkg.isDirectory()) continue;
    const srcDir = path.join(packagesDir, pkg.name, 'src');
    if (!fs.existsSync(srcDir)) continue;

    function checkNoArtifacts(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          checkNoArtifacts(full);
        } else {
          if (e.name.endsWith('.d.ts') || e.name.endsWith('.js') || e.name.endsWith('.map')) {
            const rel = path.relative(rootDir, full);
            error(`Unclean repo: compiled artifact committed in source tree: ${rel}`);
          }
        }
      }
    }
    checkNoArtifacts(srcDir);
  }
}
if (!hasErrors) success('No compiled artifacts in source trees.');

if (hasErrors) {
  console.error('\n[check:structure] FAILED: Monorepo structure checks encountered errors.');
  process.exit(1);
} else {
  console.log('\n[check:structure] ALL STRUCTURE AND ISOLATION CHECKS PASSED.');
  process.exit(0);
}
