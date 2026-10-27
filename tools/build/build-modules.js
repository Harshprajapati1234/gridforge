const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '../..');
const modulesDir = path.join(rootDir, 'modules');

function buildModuleDir(modDir) {
  const tsEntry = path.join(modDir, 'index.ts');
  if (!fs.existsSync(tsEntry)) return;

  const distDir = path.join(modDir, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const code = fs.readFileSync(tsEntry, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  });

  const outPath = path.join(distDir, 'index.js');
  fs.writeFileSync(outPath, result.outputText, 'utf8');
  console.log(`[build:modules] Built ${path.basename(modDir)} -> dist/index.js`);
}

function buildAll() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (targetDir) {
    buildModuleDir(targetDir);
    return;
  }

  if (!fs.existsSync(modulesDir)) return;
  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      buildModuleDir(path.join(modulesDir, e.name));
    }
  }
}

buildAll();
