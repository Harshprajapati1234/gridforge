# GridForge Changelog

## [Batch 1] - Make the Module System Real (2026-10-27)

### Added
- **Worker Thread Isolation**: Each module now runs in its own isolated Node `Worker` thread (`node:worker_threads`), preventing infinite loops, memory leaks, or unhandled exceptions from hanging or crashing the main app or renderer.
- **Worker Watchdog & Heartbeat**: Real-time heartbeat (ping every 2s, timeout after 4.5s) and per-call timeout (4s for activation, 5s for command execution). Unresponsive or hanging workers are terminated cleanly.
- **Real Working Context RPC**: Wired module context services (`cells.getCell`, `cells.setCell`, `cells.setRange`, `cells.getRange`, `selection.getSelection`) directly to the active `WorkbookModel` and `CommandBus` via main-to-renderer RPC. Cell mutations execute through `SetCellContentCommand`, record on the undo/redo stack, trigger formula dependency recalculation, and refresh the canvas grid.
- **Persistent Storage & Settings**: Modules have isolated persistent JSON storage and settings stored in `~/Library/Application Support/GridForge/module-storage/<moduleId>.json` and `~/Library/Application Support/GridForge/module-settings/<moduleId>.json`.
- **Permission Enforcement**: Fully aligned permission types across SDK (`manifest.ts`), validator (`manifest-validator.ts`), and guard (`permission-guard.ts`). Explicitly guarded `events`, `commands`, `ui`, `settings`, `storage`, `cells.read`, `cells.write`, and `selection.read`.
- **Manifest Error Reporting**: Corrupt, missing, or invalid `module.json` manifests are no longer silently skipped; `loadModuleFromDir` produces clear human-readable error records displayed with badges and error text in the Module Manager UI.
- **Module Manager Actions**: Added "Install Module" (with permission inspection dialog), "Update", "Remove" (deletes folder from disk for user modules), "Check Health", "Rollback", and "Show Logs".
- **Module Compilation Pipeline**: Built `tools/build/build-modules.js` to compile module TypeScript source (`index.ts`) into `dist/index.js`. Removed rogue compiled `.js`, `.d.ts`, `.map` files from source directories and updated `.gitignore`.
- **Unit Testing**: Added isolated worker chaos tests in `packages/module-host/tests/module-host.test.ts` proving that hanging modules (infinite loops) and throwing modules are terminated without impacting the host, and that module commands write to cells across worker thread boundaries.

## [Batch 2] - Replace the Fake Flipkart Module (2026-10-27)

### Removed
- **Invented / Fake Flipkart Data**: Completely deleted mocked strings (`Flipkart Verified: <sku>`), fabricated CDN URLs (`.../sku-<row>.jpeg`), and synthetic pricing calculations from `modules/flipkart-links` and `App.tsx`.

### Added
- **Real Bridge Job Execution**: Reads SKUs from active selection or user-configured row range; dispatches real bridge job (`BridgeJob`) to connected Chrome extensions via `queueJob`.
- **Live Extension Result Processing**: Listens for real-time `bridge:sku-result` events; writes product hyperlinks, image thumbnails, titles, or `"NOT FOUND: <reason>"` / `"ERROR: <reason>"` into user-chosen output columns via transaction commands.
- **Flipkart Automation Modal**: Built [FlipkartModal.tsx](file:///Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge/apps/renderer/src/components/FlipkartModal.tsx) with live extension connection check, SKU column picker, target column pickers, "Don't overwrite existing links" option, progress bar (`X / Y SKUs`), Cancel button, and "Retry Failed" action.
- **Offline / Disconnected Safety**: If no Chrome extension is paired or connected on loopback, the modal alerts the user and refuses to write any data to the active sheet.

## [Batch 3] - Bridge Security Hardening (2026-10-27)

### Security Fixes
- **Authentication Bypass Resolved**: All endpoints except `/ping` and `/pair` now strictly require a valid Bearer token, even before any extension is paired.
- **WebSocket Authentication & Origin Validation**: WebSocket handshake verifies pairing token (via query param `?token=` or Authorization header) and validates `Origin` against paired `chrome-extension://<id>` identifiers. Messages from unauthorized sockets are discarded.
- **CORS Hardening**: Removed wild-card `Access-Control-Allow-Origin: *`. Headers are restricted to paired `chrome-extension://` origins.
- **PIN Brute-Force Protection**: Added 5-attempt limit with 60-second lockout and automatic PIN rotation upon lockout. Implemented constant-time PIN comparison using `crypto.timingSafeEqual`.
- **Token Hashing & Client Revocation**: Pairing tokens are hashed using SHA-256 before storage in `bridge-paired.json`. Added client tracking with individual client revocation (`revokeClient(id)`) and full revocation (`revokeAllTokens()`).
- **Frame Parser & Validation**: Hardened WebSocket parser to handle fragmented and multi-chunk frames; added payload schema validation and 2MB request body size limits.

## [Batch 4] - Electron Main-Process Safety (2026-10-27)

### Security Fixes
- **File Write Path Restriction**: Maintained session-scoped `allowedSavePaths: Set<string>` populated by Save/Open dialogs. Rejected `file:write-file` for any path not explicitly selected by the user.
- **Path Traversal Sanitization**: Restricted `theme:get` strictly to `VALID_THEMES` (`['light', 'dark', 'high-contrast']`), preventing `../` directory traversal.
- **Zero-Copy Uint8Array IPC**: Replaced `number[]` (`Array.from(buffer)`) with typed `Uint8Array` for `file:open-dialog` and `file:write-file`, preventing huge memory spikes and JSON serialization overhead for large spreadsheets.
- **Electron Sandbox & CSP**: Enabled `sandbox: true` in `webPreferences`. Added strict Content-Security-Policy headers restricting scripts, styles, and socket connections.
- **Safe Window Open Handler**: Configured `mainWindow.webContents.setWindowOpenHandler` to intercept external URLs (`http://`, `https://`) and open them safely in the user's default macOS browser via `shell.openExternal`, denying arbitrary electron window creation.
- **App-Level Bridge Lifecycle**: Initialized bridge server once at the application lifecycle (`app.whenReady()`), preventing duplicate server startups across window creations.

## [Batch 5] - Excel-Like Grid Experience (2026-10-27)

### Added
- **Multi-Cell Range & Drag Selection**: Full Excel-like drag selection across cells, Shift+Click range expansion, whole column selection (clicking header), whole row selection (clicking row number), and Cmd+A / Ctrl+A select-all with corner triangle indicator.
- **Fill Handle & Autofill**: Draggable fill handle square (6x6) at the bottom-right corner of the active selection. Dragging reveals dashed green preview boundary; releasing autofills formulas (with relative reference adjustments), numeric progressions, or values.
- **Column & Row Resize Dragging**: Dynamic dividers on column and row header boundaries (`col-resize` and `row-resize` cursor) allowing interactive resizing of column widths and row heights.
- **Layout-Accurate In-Cell Editor**: Replaced hardcoded multiples (`46 + c*100`, `26 + r*24`) with dynamic `getCellRect(r, c)` calculations derived from accumulated column widths and row heights, accounting for hidden rows, scroll offsets, and frozen panes.
- **Frozen Pane Rendering**: Frozen rows and columns remain stationary during scrolling, with distinct 2px boundary divider lines.
- **Merged Cells & Hidden Rows**: Merged cells are rendered once with full spanning dimensions; hidden rows are skipped cleanly without rendering artifacts.
- **Wrapped Text & Number Formatting**: Added `formatCellValue` engine supporting currencies (`$`, `₹`, `€`), percentages (`0.0%`), comma grouping (`#,##0.00`), and dates (`YYYY-MM-DD`). Wrapped text renders multiple lines with word wrapping.
- **Bounded Scrolling & Native Scrollbars**: Scroll values are clamped to total content dimensions. Added interactive vertical and horizontal scrollbars with draggable thumbs.
- **Keyboard Navigation**: Full support for Arrow keys, Shift+Arrows (range expansion), Cmd+Arrows (edge jumping), Tab/Shift+Tab, Enter/Shift+Enter, Home/End, Cmd+Home, F2 (edit active cell), Delete/Backspace (clear range), and immediate typing activation.
- **Formula Bar Enhancements**: Live reference syntax highlighting with distinct colors for cell references, plus F4 shortcut to cycle cell references between relative and absolute (`A1` -> `$A$1` -> `A$1` -> `$A1` -> `A1`).

## [Batch 6] - Native Mac Spreadsheet Look & Feel (2026-10-27)

### Added
- **Mac Ribbon Toolbar**: Replaced flat text buttons with a 4-tab ribbon (Home, Insert, Data, View) with grouped tools, labels, and responsive overflow handling (collapses into "More" menu on narrow windows).
- **SVG Icon Library**: Created 32 custom SVG icons in `ui/icons/` and rendered via type-safe `Icon.tsx` component.
- **Dynamic Design Tokens in Canvas**: CanvasGrid reads theme tokens directly via `getThemeTokens()`, dynamically synchronizing colors (grid lines, header bg/text, selection, scrollbars, text) when switching between light and dark themes.
- **Bundled Fonts**: Downloaded and bundled Inter (`Regular`, `SemiBold`, `Bold`) and JetBrains Mono (`Regular`, `Medium`) into `ui/fonts/`, declared `@font-face` rules in `index.css`, and configured Vite to package them.
- **macOS Native Integration**: Set application name, About box with version, credits, and icon (`ui/app-icon/png/icon-512.png`), plus standard macOS Application Menu in `apps/desktop/src/main.ts`.

## [Batch 7] - Files and Formulas Correctness (2026-10-27)

### Fixed & Enhanced
- **8-Digit ARGB Hex Export / Import**: Fixed ExcelJS color serialization in `XlsxHandler`. Colors are exported with 8-digit ARGB (`FF` + RRGGBB) required by Microsoft Excel, and imported back into `#RRGGBB` hex strings.
- **Full XLSX Roundtrip Fidelity**: Export and import now faithfully preserve cell values, formulas, number formats, column widths, row heights, merged cell ranges, text colors, background colors, alignments, and freeze panes.
- **Roundtrip Test Suite**: Added `packages/core/tests/xlsx-roundtrip.test.ts` verifying 1:1 roundtrip fidelity for formatting, formulas, merges, colors, and dimensions.
- **Unsupported Features Reporting**: Added inspection on XLSX import for features not yet supported by GridForge (VBA macros, pivot tables, drawings/charts, slicers, sparklines). Displayed via a modal dialog in `App.tsx` detailing omitted items to safeguard workbook integrity.
- **Excel-Compliant Formula Engine Comparisons**:
  - Implemented case-insensitive text comparisons (`"a" = "A"` evaluates to `TRUE`).
  - Implemented Excel's strict type hierarchy in comparisons (`Number < String < Boolean`). Any number is strictly less than any text (`1000 < "a"` is `TRUE`).
  - Blank / empty cells: Coerced to `0` in arithmetic operations (`+`, `-`, `*`, `/`, `^`, unary `-`) and to `""` in string concatenation (`&`). In equality comparisons, empty cells match `0` and `""`.
  - Implemented Excel-compliant `AND` and `OR` functions: ignore empty cells and range text; return `#VALUE!` only when no logical values or numbers exist in the input; propagate errors cleanly.
  - Implemented Excel mathematical semantics for `ROUND` (half-up in magnitude) and `MOD` (`n - d * INT(n / d)`).
- **≥300-Case Excel Formula Test Suite**: Added `packages/formula/tests/excel-formula-suite.test.ts` with 345 real Excel verification test cases covering arithmetic, case-insensitive string equality, type hierarchy, blank cell semantics, math/trig, statistical reductions, text, logic, lookup/reference, date/time, matrix utilities, financial formulas, and error propagation with a 100% pass rate.
- **Performance Benchmarks**: Measured and reported real-world performance metrics in `docs/PERFORMANCE.md`:
  - Open 100k rows: 168.90 ms (~592k rows/sec, 61.19 MB heap).
  - Virtual scroll 1M rows: 279.13 µs / frame (~3,583 FPS virtual rendering throughput).
  - Batch paste 50k cells: 9.56 ms (~5.2M cells/sec).
  - Recalculate 100k formulas: 21.07 ms (~4.7M evaluations/sec).

## [Batch 8] - Repo Hygiene and Monorepo Architecture (2026-10-27)

### Fixed & Cleaned
- **Regenerated `pnpm-lock.yaml`**: Updated dependencies including `@gridforge/shared` workspace reference in `bridge-service`. Verified clean installation with `pnpm install --frozen-lockfile`.
- **Removed Code Generator Scripts**: Deleted `tools/write_*.py` generator scripts (`write_part1.py`, `write_part2.py`, `write_part3.py`, `write_phase2.py`, `write_phase2_ui.py`, `write_formula_engine.py`, `write_formula_tests.py`).
- **Cleaned Source Directories**: Removed all committed `.js`, `.d.ts`, `.js.map`, and `.d.ts.map` files from `packages/*/src/` and `modules/*`. Updated `.gitignore` to prevent any compilation artifacts outside `dist/`.
- **Fast Dev Commands**: Added `"dev:fast"` and `"start:fast"` to root `package.json` to launch the app instantly without rebuilding packages every launch.
- **Renderer Code Splitting**: Configured Rollup `manualChunks` in `apps/renderer/vite.config.ts`, splitting `exceljs` (~938 kB) and `react-vendor` (~141 kB) out of the main application bundle (`index.js` reduced from 1.28 MB to 194 kB with zero build warnings).
- **Enforced Monorepo Structure Rules**: Implemented strict module isolation linter and architecture checker in `tools/gf-cli/check-structure.js`. Verified that modules only import from `@gridforge/sdk`, manifests point to built `dist/index.js`, and source trees remain clean. `pnpm check:structure` passes 100%.

