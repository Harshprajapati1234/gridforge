import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"

files = {}

# 1. pnpm-workspace.yaml
files["pnpm-workspace.yaml"] = """packages:
  - 'apps/*'
  - 'packages/*'
  - 'modules/*'
  - 'tools/*'
"""

# 2. package.json
files["package.json"] = json.dumps({
  "name": "gridforge-monorepo",
  "version": "1.0.0",
  "private": True,
  "description": "GridForge - Free, modular, Excel-style spreadsheet app for macOS",
  "scripts": {
    "dev": "vite --config apps/renderer/vite.config.ts",
    "dev:electron": "electron apps/desktop/dist/main.js",
    "build:packages": "tsc -b packages/*/tsconfig.json",
    "build:desktop": "tsc -p apps/desktop/tsconfig.json",
    "build:renderer": "vite build --config apps/renderer/vite.config.ts",
    "start": "pnpm build:desktop && electron apps/desktop/dist/main.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:structure": "node tools/gf-cli/check-structure.js"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.5"
  }
}, indent=2)

# 3. tsconfig.base.json
files["tsconfig.base.json"] = json.dumps({
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": True,
    "skipLibCheck": True,
    "esModuleInterop": True,
    "allowSyntheticDefaultImports": True,
    "resolveJsonModule": True,
    "isolatedModules": True,
    "declaration": True,
    "declarationMap": True,
    "sourceMap": True,
    "baseUrl": ".",
    "paths": {
      "@gridforge/shared": ["packages/shared/src/index.ts"],
      "@gridforge/sdk": ["packages/sdk/src/index.ts"],
      "@gridforge/core": ["packages/core/src/index.ts"],
      "@gridforge/ui-kit": ["packages/ui-kit/src/index.ts"],
      "@gridforge/module-host": ["packages/module-host/src/index.ts"],
      "@gridforge/formula": ["packages/formula/src/index.ts"],
      "@gridforge/grid": ["packages/grid/src/index.ts"],
      "@gridforge/bridge": ["packages/bridge/src/index.ts"]
    }
  }
}, indent=2)

# 4. ui/tokens.schema.json
files["ui/tokens.schema.json"] = json.dumps({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GridForgeThemeTokens",
  "type": "object",
  "required": ["id", "name", "type", "colors", "typography", "elevation", "borders"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "type": { "type": "string", "enum": ["light", "dark"] },
    "colors": { "type": "object" },
    "typography": { "type": "object" },
    "borders": { "type": "object" },
    "elevation": { "type": "object" }
  }
}, indent=2)

# 5. ui/themes/light.json
files["ui/themes/light.json"] = json.dumps({
  "id": "light",
  "name": "Light Default",
  "type": "light",
  "colors": {
    "surfaceBackground": "#f8fafc",
    "surfacePanel": "#ffffff",
    "surfaceHeader": "#f1f5f9",
    "surfaceHover": "#f1f5f9",
    "surfaceActive": "#e2e8f0",
    "surfaceSelected": "#e0f2fe",
    "borderMuted": "#f1f5f9",
    "borderDefault": "#cbd5e1",
    "borderFocus": "#0284c7",
    "textPrimary": "#0f172a",
    "textSecondary": "#475569",
    "textMuted": "#94a3b8",
    "textInverse": "#ffffff",
    "accentPrimary": "#0284c7",
    "accentHover": "#0369a1",
    "accentActive": "#075985",
    "accentMuted": "#e0f2fe",
    "statusSuccess": "#16a34a",
    "statusWarning": "#d97706",
    "statusError": "#dc2626",
    "statusInfo": "#2563eb",
    "gridLine": "#e2e8f0",
    "gridHeaderBg": "#f8fafc",
    "gridHeaderText": "#475569",
    "gridSelectionBorder": "#0284c7",
    "gridSelectionBackground": "rgba(2, 132, 199, 0.12)"
  },
  "typography": {
    "fontFamilyUi": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "fontFamilyCell": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyMono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    "fontSizeXs": "11px",
    "fontSizeSm": "12px",
    "fontSizeMd": "13px",
    "fontSizeLg": "15px",
    "fontSizeXl": "18px"
  },
  "borders": {
    "radiusSm": "4px",
    "radiusMd": "6px",
    "radiusLg": "10px",
    "widthDefault": "1px"
  },
  "elevation": {
    "shadowSm": "0 1px 2px rgba(0, 0, 0, 0.05)",
    "shadowMd": "0 4px 6px -1px rgba(0, 0, 0, 0.08)",
    "shadowLg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
  }
}, indent=2)

# 6. ui/themes/dark.json
files["ui/themes/dark.json"] = json.dumps({
  "id": "dark",
  "name": "Dark Default",
  "type": "dark",
  "colors": {
    "surfaceBackground": "#0f172a",
    "surfacePanel": "#1e293b",
    "surfaceHeader": "#1e293b",
    "surfaceHover": "#334155",
    "surfaceActive": "#475569",
    "surfaceSelected": "#1e3a5f",
    "borderMuted": "#334155",
    "borderDefault": "#475569",
    "borderFocus": "#38bdf8",
    "textPrimary": "#f8fafc",
    "textSecondary": "#94a3b8",
    "textMuted": "#64748b",
    "textInverse": "#0f172a",
    "accentPrimary": "#38bdf8",
    "accentHover": "#0284c7",
    "accentActive": "#0369a1",
    "accentMuted": "#1e293b",
    "statusSuccess": "#22c55e",
    "statusWarning": "#f59e0b",
    "statusError": "#ef4444",
    "statusInfo": "#38bdf8",
    "gridLine": "#334155",
    "gridHeaderBg": "#1e293b",
    "gridHeaderText": "#94a3b8",
    "gridSelectionBorder": "#38bdf8",
    "gridSelectionBackground": "rgba(56, 189, 248, 0.18)"
  },
  "typography": {
    "fontFamilyUi": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    "fontFamilyCell": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyMono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    "fontSizeXs": "11px",
    "fontSizeSm": "12px",
    "fontSizeMd": "13px",
    "fontSizeLg": "15px",
    "fontSizeXl": "18px"
  },
  "borders": {
    "radiusSm": "4px",
    "radiusMd": "6px",
    "radiusLg": "10px",
    "widthDefault": "1px"
  },
  "elevation": {
    "shadowSm": "0 1px 2px rgba(0, 0, 0, 0.4)",
    "shadowMd": "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
    "shadowLg": "0 10px 15px -3px rgba(0, 0, 0, 0.6)"
  }
}, indent=2)

# 7. ui/themes/high-contrast.json
files["ui/themes/high-contrast.json"] = json.dumps({
  "id": "high-contrast",
  "name": "High Contrast",
  "type": "dark",
  "colors": {
    "surfaceBackground": "#000000",
    "surfacePanel": "#000000",
    "surfaceHeader": "#121212",
    "surfaceHover": "#222222",
    "surfaceActive": "#333333",
    "surfaceSelected": "#003366",
    "borderMuted": "#444444",
    "borderDefault": "#ffffff",
    "borderFocus": "#ffff00",
    "textPrimary": "#ffffff",
    "textSecondary": "#dddddd",
    "textMuted": "#aaaaaa",
    "textInverse": "#000000",
    "accentPrimary": "#ffff00",
    "accentHover": "#ffff55",
    "accentActive": "#cccc00",
    "accentMuted": "#333300",
    "statusSuccess": "#00ff66",
    "statusWarning": "#ffaa00",
    "statusError": "#ff3333",
    "statusInfo": "#33ccff",
    "gridLine": "#666666",
    "gridHeaderBg": "#111111",
    "gridHeaderText": "#ffffff",
    "gridSelectionBorder": "#ffff00",
    "gridSelectionBackground": "rgba(255, 255, 0, 0.3)"
  },
  "typography": {
    "fontFamilyUi": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyCell": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyMono": "ui-monospace, monospace"
  },
  "borders": {
    "radiusSm": "2px",
    "radiusMd": "4px",
    "radiusLg": "6px",
    "widthDefault": "2px"
  },
  "elevation": {
    "shadowSm": "none",
    "shadowMd": "none",
    "shadowLg": "none"
  }
}, indent=2)

# 8. ui/themes/_template.json
files["ui/themes/_template.json"] = json.dumps({
  "id": "custom-theme",
  "name": "My Custom Theme",
  "type": "light",
  "colors": {
    "surfaceBackground": "#ffffff",
    "surfacePanel": "#ffffff",
    "surfaceHeader": "#f8fafc",
    "surfaceHover": "#f1f5f9",
    "surfaceActive": "#e2e8f0",
    "surfaceSelected": "#e0f2fe",
    "borderMuted": "#f1f5f9",
    "borderDefault": "#cbd5e1",
    "borderFocus": "#0284c7",
    "textPrimary": "#0f172a",
    "textSecondary": "#475569",
    "textMuted": "#94a3b8",
    "textInverse": "#ffffff",
    "accentPrimary": "#0284c7",
    "accentHover": "#0369a1",
    "accentActive": "#075985",
    "accentMuted": "#e0f2fe",
    "statusSuccess": "#16a34a",
    "statusWarning": "#d97706",
    "statusError": "#dc2626",
    "statusInfo": "#2563eb",
    "gridLine": "#e2e8f0",
    "gridHeaderBg": "#f8fafc",
    "gridHeaderText": "#475569",
    "gridSelectionBorder": "#0284c7",
    "gridSelectionBackground": "rgba(2, 132, 199, 0.12)"
  },
  "typography": {
    "fontFamilyUi": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyCell": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "fontFamilyMono": "ui-monospace, monospace"
  },
  "borders": {
    "radiusSm": "4px",
    "radiusMd": "6px",
    "radiusLg": "10px",
    "widthDefault": "1px"
  },
  "elevation": {
    "shadowSm": "0 1px 2px rgba(0,0,0,0.05)",
    "shadowMd": "0 4px 6px -1px rgba(0,0,0,0.08)",
    "shadowLg": "0 10px 15px -3px rgba(0,0,0,0.1)"
  }
}, indent=2)

# 9. ui/layout.json
files["ui/layout.json"] = json.dumps({
  "comfortable": {
    "rowHeight": 26,
    "colWidth": 100,
    "headerHeight": 28,
    "rowHeaderWidth": 46,
    "toolbarHeight": 44,
    "formulaBarHeight": 34,
    "statusBarHeight": 26,
    "sheetTabBarHeight": 32,
    "sidePanelWidth": 320
  },
  "compact": {
    "rowHeight": 21,
    "colWidth": 80,
    "headerHeight": 24,
    "rowHeaderWidth": 40,
    "toolbarHeight": 38,
    "formulaBarHeight": 30,
    "statusBarHeight": 22,
    "sheetTabBarHeight": 28,
    "sidePanelWidth": 280
  }
}, indent=2)

# 10. ui/fonts/fonts.json
files["ui/fonts/fonts.json"] = json.dumps({
  "ui": {
    "family": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "weights": [400, 500, 600, 700]
  },
  "cell": {
    "family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    "weights": [400, 600]
  },
  "mono": {
    "family": "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    "weights": [400, 500]
  }
}, indent=2)

# 11. ui/strings/en.json
files["ui/strings/en.json"] = json.dumps({
  "app": {
    "title": "GridForge",
    "ready": "Ready",
    "safeMode": "Safe Mode Active"
  },
  "modules": {
    "title": "Modules",
    "description": "Extend GridForge safely with isolated, hot-swappable plugins.",
    "statusRunning": "Running",
    "statusStopped": "Stopped",
    "statusDisabled": "Disabled",
    "statusError": "Error"
  }
}, indent=2)

# 12. ui/README.md
files["ui/README.md"] = """# Changing the Look of GridForge

Everything that controls how GridForge looks lives in this `ui/` folder. You do not need to touch any code to customize colors, fonts, or icons.

## Themes
- `ui/themes/light.json`
- `ui/themes/dark.json`
- `ui/themes/high-contrast.json`
- `ui/themes/_template.json`

## App Icons
- `ui/app-icon/AppIcon.icns`, `app-icon.svg`, and PNGs.
"""

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully wrote {len(files)} base files.")
