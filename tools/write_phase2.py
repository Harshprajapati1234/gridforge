import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"
files = {}

# ==========================================
# 1. packages/core
# ==========================================
files["packages/core/package.json"] = json.dumps({
  "name": "@gridforge/core",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@gridforge/shared": "workspace:*",
    "@gridforge/sdk": "workspace:*",
    "exceljs": "^4.4.0"
  }
}, indent=2)

files["packages/core/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/core/src/model/cell.ts"] = """export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string; // hex color e.g. #000000
  bgColor?: string; // hex color e.g. #ffffff
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  wrapText?: boolean;
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    color?: string;
  };
}

export interface CellData {
  r: number; // 0-indexed row
  c: number; // 0-indexed col
  v: string | number | boolean | null; // evaluated / display value
  f?: string; // formula starting with '=' or plain formula text
  fmt?: string; // format pattern, e.g. '0.00%', '₹#,##0.00', 'yyyy-mm-dd'
  style?: CellStyle;
  hyperlink?: string;
  meta?: Record<string, unknown>;
}

export function cellAddress(r: number, c: number): string {
  let colStr = '';
  let tempCol = c;
  while (tempCol >= 0) {
    colStr = String.fromCharCode((tempCol % 26) + 65) + colStr;
    tempCol = Math.floor(tempCol / 26) - 1;
  }
  return `${colStr}${r + 1}`;
}

export function parseAddress(addr: string): { r: number; c: number } | null {
  const match = /^([A-Z]+)(\\d+)$/i.exec(addr.trim());
  if (!match) return null;
  const colStr = match[1].toUpperCase();
  let c = 0;
  for (let i = 0; i < colStr.length; i++) {
    c = c * 26 + (colStr.charCodeAt(i) - 64);
  }
  const r = parseInt(match[2], 10) - 1;
  return { r, c: c - 1 };
}
"""

files["packages/core/src/model/sheet.ts"] = """import { CellData, cellAddress } from './cell';

export interface MergedCellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export class SheetModel {
  public readonly id: string;
  public name: string;
  public colWidths: Map<number, number> = new Map();
  public rowHeights: Map<number, number> = new Map();
  public mergedCells: MergedCellRange[] = [];
  public freezeRows = 0;
  public freezeCols = 0;
  public tabColor?: string;
  public isHidden = false;

  // Sparse matrix storage: key is 'r,c'
  private cells: Map<string, CellData> = new Map();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  private key(r: number, c: number): string {
    return `${r},${c}`;
  }

  getCell(r: number, c: number): CellData | null {
    return this.cells.get(this.key(r, c)) || null;
  }

  setCell(r: number, c: number, data: Partial<CellData>): void {
    const k = this.key(r, c);
    const existing = this.cells.get(k);
    if (!existing) {
      if (data.v == null && !data.f && !data.style && !data.fmt) return;
      this.cells.set(k, { r, c, v: data.v !== undefined ? data.v : null, ...data });
    } else {
      Object.assign(existing, data);
      if (existing.v == null && !existing.f && !existing.style && !existing.fmt) {
        this.cells.delete(k);
      }
    }
  }

  deleteCell(r: number, c: number): void {
    this.cells.delete(this.key(r, c));
  }

  getAllCells(): CellData[] {
    return Array.from(this.cells.values());
  }

  getBounds(): { maxRow: number; maxCol: number } {
    let maxRow = 0;
    let maxCol = 0;
    for (const cell of this.cells.values()) {
      if (cell.r > maxRow) maxRow = cell.r;
      if (cell.c > maxCol) maxCol = cell.c;
    }
    return { maxRow, maxCol };
  }

  getColWidth(c: number, defaultWidth = 100): number {
    return this.colWidths.get(c) || defaultWidth;
  }

  setColWidth(c: number, width: number): void {
    this.colWidths.set(c, Math.max(20, width));
  }

  getRowHeight(r: number, defaultHeight = 24): number {
    return this.rowHeights.get(r) || defaultHeight;
  }

  setRowHeight(r: number, height: number): void {
    this.rowHeights.set(r, Math.max(16, height));
  }

  isMerged(r: number, c: number): MergedCellRange | null {
    for (const m of this.mergedCells) {
      if (r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol) {
        return m;
      }
    }
    return null;
  }
}
"""

files["packages/core/src/model/workbook.ts"] = """import { SheetModel } from './sheet';
import { generateId } from '@gridforge/shared';

export class WorkbookModel {
  public id: string;
  public name: string;
  public sheets: SheetModel[] = [];
  public activeSheetId: string = '';
  public namedRanges: Map<string, string> = new Map();

  constructor(name = 'Untitled.xlsx') {
    this.id = generateId('wb');
    this.name = name;
    const defaultSheet = new SheetModel('sheet-1', 'Sheet1');
    this.sheets.push(defaultSheet);
    this.activeSheetId = defaultSheet.id;
  }

  getActiveSheet(): SheetModel {
    const s = this.sheets.find((sh) => sh.id === this.activeSheetId);
    return s || this.sheets[0];
  }

  getSheet(id: string): SheetModel | undefined {
    return this.sheets.find((sh) => sh.id === id);
  }

  addSheet(name?: string): SheetModel {
    const idx = this.sheets.length + 1;
    const sheetName = name || `Sheet${idx}`;
    const newSheet = new SheetModel(generateId('sheet'), sheetName);
    this.sheets.push(newSheet);
    this.activeSheetId = newSheet.id;
    return newSheet;
  }

  removeSheet(id: string): boolean {
    if (this.sheets.length <= 1) return false; // Can't delete last sheet
    const idx = this.sheets.findIndex((sh) => sh.id === id);
    if (idx === -1) return false;
    this.sheets.splice(idx, 1);
    if (this.activeSheetId === id) {
      this.activeSheetId = this.sheets[Math.max(0, idx - 1)].id;
    }
    return true;
  }

  renameSheet(id: string, newName: string): boolean {
    const s = this.getSheet(id);
    if (!s) return false;
    s.name = newName;
    return true;
  }
}
"""

files["packages/core/src/commands/command.ts"] = """import { WorkbookModel } from '../model/workbook';

export interface Command {
  readonly description: string;
  execute(wb: WorkbookModel): void;
  undo(wb: WorkbookModel): void;
}

export class CommandBus {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: Set<() => void> = new Set();

  constructor(private wb: WorkbookModel) {}

  execute(cmd: Command): void {
    cmd.execute(this.wb);
    this.undoStack.push(cmd);
    this.redoStack = []; // clear redo on new action
    this.notify();
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo(this.wb);
    this.redoStack.push(cmd);
    this.notify();
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.execute(this.wb);
    this.undoStack.push(cmd);
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
"""

files["packages/core/src/commands/cell-commands.ts"] = """import { Command } from './command';
import { WorkbookModel } from '../model/workbook';
import { CellData, CellStyle } from '../model/cell';

export class SetCellContentCommand implements Command {
  public readonly description: string;
  private prevCell: CellData | null = null;

  constructor(
    private sheetId: string,
    private r: number,
    private c: number,
    private value: string | number | boolean | null,
    private formula?: string
  ) {
    this.description = `Edit Cell (${r}, ${c})`;
  }

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;
    this.prevCell = sheet.getCell(this.r, this.c) ? { ...sheet.getCell(this.r, this.c)! } : null;
    sheet.setCell(this.r, this.c, { v: this.value, f: this.formula });
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;
    if (this.prevCell) {
      sheet.setCell(this.r, this.c, this.prevCell);
    } else {
      sheet.deleteCell(this.r, this.c);
    }
  }
}

export class FormatRangeCommand implements Command {
  public readonly description = 'Format Cells';
  private prevStyles: Map<string, CellStyle | undefined> = new Map();

  constructor(
    private sheetId: string,
    private range: { startRow: number; startCol: number; endRow: number; endCol: number },
    private styleUpdate: Partial<CellStyle>
  ) {}

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;
    for (let r = this.range.startRow; r <= this.range.endRow; r++) {
      for (let c = this.range.startCol; c <= this.range.endCol; c++) {
        const key = `${r},${c}`;
        const existing = sheet.getCell(r, c);
        if (!this.prevStyles.has(key)) {
          this.prevStyles.set(key, existing?.style ? { ...existing.style } : undefined);
        }
        const mergedStyle: CellStyle = { ...(existing?.style || {}), ...this.styleUpdate };
        sheet.setCell(r, c, { style: mergedStyle });
      }
    }
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;
    for (const [key, prev] of this.prevStyles.entries()) {
      const [r, c] = key.split(',').map(Number);
      sheet.setCell(r, c, { style: prev });
    }
  }
}
"""

files["packages/core/src/io/csv-handler.ts"] = """import { WorkbookModel } from '../model/workbook';

export class CsvHandler {
  static exportCsv(wb: WorkbookModel, sheetId?: string): string {
    const sheet = sheetId ? wb.getSheet(sheetId) : wb.getActiveSheet();
    if (!sheet) return '';
    const bounds = sheet.getBounds();
    const rows: string[] = [];

    for (let r = 0; r <= bounds.maxRow; r++) {
      const line: string[] = [];
      for (let c = 0; c <= bounds.maxCol; c++) {
        const cell = sheet.getCell(r, c);
        const val = cell?.v != null ? String(cell.v) : '';
        if (val.includes(',') || val.includes('"') || val.includes('\\n')) {
          line.push(`"${val.replace(/"/g, '""')}"`);
        } else {
          line.push(val);
        }
      }
      rows.push(line.join(','));
    }
    return rows.join('\\n');
  }

  static importCsv(csvText: string, wb: WorkbookModel, sheetName = 'Imported'): void {
    const sheet = wb.addSheet(sheetName);
    const lines = csvText.split(/\\r?\\n/);
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r];
      if (!line.trim()) continue;
      const cells = this.parseCsvLine(line);
      for (let c = 0; c < cells.length; c++) {
        const raw = cells[c];
        const num = Number(raw);
        const v = !isNaN(num) && raw.trim() !== '' ? num : raw;
        sheet.setCell(r, c, { v });
      }
    }
  }

  private static parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === ',' || ch === '\\t') && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }
}
"""

files["packages/core/src/io/xlsx-handler.ts"] = """import ExcelJS from 'exceljs';
import { WorkbookModel } from '../model/workbook';
import { SheetModel } from '../model/sheet';

export class XlsxHandler {
  static async exportBuffer(wb: WorkbookModel): Promise<Uint8Array> {
    const excelWb = new ExcelJS.Workbook();
    excelWb.creator = 'GridForge';
    excelWb.lastModifiedBy = 'GridForge';
    excelWb.created = new Date();

    for (const sh of wb.sheets) {
      const ws = excelWb.addWorksheet(sh.name);

      // Frozen panes
      if (sh.freezeRows > 0 || sh.freezeCols > 0) {
        ws.views = [{ state: 'frozen', xSplit: sh.freezeCols, ySplit: sh.freezeRows }];
      }

      // Column widths
      for (const [c, w] of sh.colWidths.entries()) {
        ws.getColumn(c + 1).width = Math.round(w / 7.5);
      }

      // Cells
      for (const cell of sh.getAllCells()) {
        const row = ws.getRow(cell.r + 1);
        const wsCell = row.getCell(cell.c + 1);

        if (cell.f) {
          const formulaStr = cell.f.startsWith('=') ? cell.f.slice(1) : cell.f;
          wsCell.value = { formula: formulaStr, result: cell.v as any };
        } else {
          wsCell.value = cell.v as any;
        }

        // Styles
        if (cell.style) {
          wsCell.font = {
            bold: cell.style.bold,
            italic: cell.style.italic,
            underline: cell.style.underline,
            size: cell.style.fontSize,
            color: cell.style.color ? { argb: cell.style.color.replace('#', '') } : undefined
          };
          if (cell.style.bgColor) {
            wsCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: cell.style.bgColor.replace('#', '') }
            };
          }
          if (cell.style.align) {
            wsCell.alignment = { horizontal: cell.style.align as any };
          }
        }
      }

      // Merges
      for (const m of sh.mergedCells) {
        ws.mergeCells(m.startRow + 1, m.startCol + 1, m.endRow + 1, m.endCol + 1);
      }
    }

    const buffer = await excelWb.xlsx.writeBuffer();
    return new Uint8Array(buffer);
  }

  static async importBuffer(buffer: Uint8Array | ArrayBuffer): Promise<WorkbookModel> {
    const excelWb = new ExcelJS.Workbook();
    // @ts-ignore
    await excelWb.xlsx.load(buffer);

    const wb = new WorkbookModel('Imported.xlsx');
    wb.sheets = [];

    excelWb.eachSheet((ws, sheetId) => {
      const sh = new SheetModel(String(sheetId), ws.name);

      // Views / Freeze panes
      if (ws.views && ws.views.length > 0) {
        const v = ws.views[0];
        if (v.state === 'frozen') {
          sh.freezeCols = v.xSplit || 0;
          sh.freezeRows = v.ySplit || 0;
        }
      }

      // Columns
      ws.columns?.forEach((col, idx) => {
        if (col.width) sh.setColWidth(idx, Math.round(col.width * 7.5));
      });

      // Cells
      ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const r = rowNumber - 1;
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const c = colNumber - 1;
          let val: any = cell.value;
          let formula: string | undefined;

          if (val && typeof val === 'object' && 'formula' in val) {
            formula = `=${val.formula}`;
            val = val.result !== undefined ? val.result : null;
          }

          const style: any = {};
          if (cell.font) {
            if (cell.font.bold) style.bold = true;
            if (cell.font.italic) style.italic = true;
            if (cell.font.underline) style.underline = true;
          }

          sh.setCell(r, c, { v: val, f: formula, style });
        });
      });

      wb.sheets.push(sh);
    });

    if (wb.sheets.length > 0) wb.activeSheetId = wb.sheets[0].id;
    return wb;
  }
}
"""

files["packages/core/src/index.ts"] = """export * from './model/cell';
export * from './model/sheet';
export * from './model/workbook';
export * from './commands/command';
export * from './commands/cell-commands';
export * from './io/csv-handler';
export * from './io/xlsx-handler';
"""

# ==========================================
# 2. packages/grid
# ==========================================
files["packages/grid/package.json"] = json.dumps({
  "name": "@gridforge/grid",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@gridforge/core": "workspace:*",
    "@gridforge/shared": "workspace:*"
  }
}, indent=2)

files["packages/grid/tsconfig.json"] = json.dumps({
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src" },
  "include": ["src/**/*"]
}, indent=2)

files["packages/grid/src/viewport.ts"] = """import { SheetModel } from '@gridforge/core';

export interface ViewportRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  offsetX: number;
  offsetY: number;
}

export class ViewportCalculator {
  static compute(
    sheet: SheetModel,
    scrollLeft: number,
    scrollTop: number,
    viewportWidth: number,
    viewportHeight: number,
    defaultColWidth = 100,
    defaultRowHeight = 24
  ): ViewportRange {
    // Find starting column
    let curX = 0;
    let startCol = 0;
    while (curX + sheet.getColWidth(startCol, defaultColWidth) <= scrollLeft && startCol < 16384) {
      curX += sheet.getColWidth(startCol, defaultColWidth);
      startCol++;
    }
    const offsetX = curX - scrollLeft;

    // Find ending column
    let visibleW = offsetX;
    let endCol = startCol;
    while (visibleW < viewportWidth && endCol < 16384) {
      visibleW += sheet.getColWidth(endCol, defaultColWidth);
      endCol++;
    }

    // Find starting row
    let curY = 0;
    let startRow = 0;
    while (curY + sheet.getRowHeight(startRow, defaultRowHeight) <= scrollTop && startRow < 1048576) {
      curY += sheet.getRowHeight(startRow, defaultRowHeight);
      startRow++;
    }
    const offsetY = curY - scrollTop;

    // Find ending row
    let visibleH = offsetY;
    let endRow = startRow;
    while (visibleH < viewportHeight && endRow < 1048576) {
      visibleH += sheet.getRowHeight(endRow, defaultRowHeight);
      endRow++;
    }

    return {
      startRow,
      endRow: Math.min(1048575, endRow + 1),
      startCol,
      endCol: Math.min(16383, endCol + 1),
      offsetX,
      offsetY
    };
  }
}
"""

files["packages/grid/src/selection.ts"] = """export interface GridSelection {
  activeCell: { r: number; c: number };
  start: { r: number; c: number };
  end: { r: number; c: number };
}

export class SelectionManager {
  private selection: GridSelection = {
    activeCell: { r: 0, c: 0 },
    start: { r: 0, c: 0 },
    end: { r: 0, c: 0 }
  };

  getSelection(): GridSelection {
    return this.selection;
  }

  setSelection(startR: number, startC: number, endR = startR, endC = startC): void {
    this.selection = {
      activeCell: { r: startR, c: startC },
      start: { r: Math.min(startR, endR), c: Math.min(startC, endC) },
      end: { r: Math.max(startR, endR), c: Math.max(startC, endC) }
    };
  }

  expandSelection(endR: number, endC: number): void {
    this.selection.end = { r: Math.max(0, endR), c: Math.max(0, endC) };
  }

  isSelected(r: number, c: number): boolean {
    const s = this.selection;
    const minR = Math.min(s.start.r, s.end.r);
    const maxR = Math.max(s.start.r, s.end.r);
    const minC = Math.min(s.start.c, s.end.c);
    const maxC = Math.max(s.start.c, s.end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }
}
"""

files["packages/grid/src/canvas-grid.ts"] = """import { SheetModel, cellAddress } from '@gridforge/core';
import { ViewportCalculator, ViewportRange } from './viewport';
import { SelectionManager, GridSelection } from './selection';

export interface CanvasGridOptions {
  canvas: HTMLCanvasElement;
  sheet: SheetModel;
  onSelectionChange?: (sel: GridSelection, addr: string) => void;
  onCellDoubleClick?: (r: number, c: number, x: number, y: number, w: number, h: number) => void;
}

export class CanvasGrid {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private sheet: SheetModel;
  public selection = new SelectionManager();
  public scrollX = 0;
  public scrollY = 0;
  private rowHeaderWidth = 46;
  private colHeaderHeight = 26;

  constructor(options: CanvasGridOptions) {
    this.canvas = options.canvas;
    this.sheet = options.sheet;
    this.ctx = this.canvas.getContext('2d')!;
  }

  setSheet(s: SheetModel) {
    this.sheet = s;
    this.render();
  }

  render(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.ctx.save();
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, width, height);

    const vp = ViewportCalculator.compute(
      this.sheet,
      this.scrollX,
      this.scrollY,
      width - this.rowHeaderWidth,
      height - this.colHeaderHeight
    );

    // 1. Draw cells in viewport
    let curY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      const rh = this.sheet.getRowHeight(r);
      let curX = this.rowHeaderWidth + vp.offsetX;

      for (let c = vp.startCol; c <= vp.endCol; c++) {
        const cw = this.sheet.getColWidth(c);
        const isSel = this.selection.isSelected(r, c);

        // Background
        const cell = this.sheet.getCell(r, c);
        if (isSel) {
          this.ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
          this.ctx.fillRect(curX, curY, cw, rh);
        } else if (cell?.style?.bgColor) {
          this.ctx.fillStyle = cell.style.bgColor;
          this.ctx.fillRect(curX, curY, cw, rh);
        }

        // Grid lines
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(curX + 0.5, curY + 0.5, cw, rh);

        // Text
        if (cell && cell.v != null) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(curX + 2, curY, cw - 4, rh);
          this.ctx.clip();

          let fontStyle = '';
          if (cell.style?.italic) fontStyle += 'italic ';
          if (cell.style?.bold) fontStyle += 'bold ';
          this.ctx.font = `${fontStyle}${cell.style?.fontSize || 12}px -apple-system, sans-serif`;
          this.ctx.fillStyle = cell.style?.color || '#0f172a';
          this.ctx.textBaseline = 'middle';

          const text = String(cell.v);
          const align = cell.style?.align || (typeof cell.v === 'number' ? 'right' : 'left');
          let textX = curX + 6;
          if (align === 'right') textX = curX + cw - 6;
          else if (align === 'center') textX = curX + cw / 2;
          this.ctx.textAlign = align;

          this.ctx.fillText(text, textX, curY + rh / 2);
          this.ctx.restore();
        }

        curX += cw;
      }
      curY += rh;
    }

    // 2. Draw Column Headers (A, B, C...)
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(this.rowHeaderWidth, 0, width - this.rowHeaderWidth, this.colHeaderHeight);
    let hX = this.rowHeaderWidth + vp.offsetX;
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.font = '11px -apple-system, sans-serif';
    this.ctx.fillStyle = '#475569';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let c = vp.startCol; c <= vp.endCol; c++) {
      const cw = this.sheet.getColWidth(c);
      this.ctx.strokeRect(hX + 0.5, 0.5, cw, this.colHeaderHeight);
      this.ctx.fillText(cellAddress(0, c).replace(/\\d+/, ''), hX + cw / 2, this.colHeaderHeight / 2);
      hX += cw;
    }

    // 3. Draw Row Headers (1, 2, 3...)
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, this.colHeaderHeight, this.rowHeaderWidth, height - this.colHeaderHeight);
    let hY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      const rh = this.sheet.getRowHeight(r);
      this.ctx.strokeRect(0.5, hY + 0.5, this.rowHeaderWidth, rh);
      this.ctx.fillText(String(r + 1), this.rowHeaderWidth / 2, hY + rh / 2);
      hY += rh;
    }

    // 4. Top-Left corner block
    this.ctx.fillStyle = '#f1f5f9';
    this.ctx.fillRect(0, 0, this.rowHeaderWidth, this.colHeaderHeight);
    this.ctx.strokeRect(0.5, 0.5, this.rowHeaderWidth, this.colHeaderHeight);

    this.ctx.restore();
  }

  getCellAtPixel(px: number, py: number): { r: number; c: number } | null {
    if (px < this.rowHeaderWidth || py < this.colHeaderHeight) return null;
    let curX = this.rowHeaderWidth - (this.scrollX % 100);
    // Approximate or scan
    const dpr = window.devicePixelRatio || 1;
    const x = px - this.rowHeaderWidth + this.scrollX;
    const y = py - this.colHeaderHeight + this.scrollY;

    const c = Math.max(0, Math.floor(x / 100));
    const r = Math.max(0, Math.floor(y / 24));
    return { r, c };
  }
}
"""

files["packages/grid/src/index.ts"] = """export * from './viewport';
export * from './selection';
export * from './canvas-grid';
"""

# ==========================================
# 3. Unit Tests in packages/core/tests/
# ==========================================
files["packages/core/tests/workbook.test.ts"] = """import { describe, it, expect } from 'vitest';
import { WorkbookModel, SheetModel, cellAddress, parseAddress, CsvHandler, XlsxHandler, CommandBus, SetCellContentCommand } from '../src';

describe('Cell Addresses', () => {
  it('converts row/col to Excel addresses and vice versa', () => {
    expect(cellAddress(0, 0)).toBe('A1');
    expect(cellAddress(9, 25)).toBe('Z10');
    expect(cellAddress(0, 26)).toBe('AA1');
    expect(parseAddress('A1')).toEqual({ r: 0, c: 0 });
    expect(parseAddress('AA1')).toEqual({ r: 0, c: 26 });
  });
});

describe('Sparse Sheet Storage', () => {
  it('stores and retrieves cells efficiently', () => {
    const sheet = new SheetModel('s1', 'Sheet1');
    sheet.setCell(100, 50, { v: 42, f: '=SUM(A1:B1)' });
    expect(sheet.getCell(100, 50)?.v).toBe(42);
    expect(sheet.getCell(100, 50)?.f).toBe('=SUM(A1:B1)');
    expect(sheet.getCell(0, 0)).toBeNull();
  });
});

describe('Command Bus & Undo/Redo', () => {
  it('records commands and undoes/redoes correctly', () => {
    const wb = new WorkbookModel('test.xlsx');
    const bus = new CommandBus(wb);
    const cmd = new SetCellContentCommand(wb.activeSheetId, 0, 0, 'Hello');

    bus.execute(cmd);
    expect(wb.getActiveSheet().getCell(0, 0)?.v).toBe('Hello');

    bus.undo();
    expect(wb.getActiveSheet().getCell(0, 0)).toBeNull();

    bus.redo();
    expect(wb.getActiveSheet().getCell(0, 0)?.v).toBe('Hello');
  });
});

describe('CSV Roundtrip', () => {
  it('exports and imports CSV seamlessly', () => {
    const wb = new WorkbookModel('test.csv');
    const sh = wb.getActiveSheet();
    sh.setCell(0, 0, { v: 'Product' });
    sh.setCell(0, 1, { v: 'Price, USD' });
    sh.setCell(1, 0, { v: 'Widget' });
    sh.setCell(1, 1, { v: 19.99 });

    const csv = CsvHandler.exportCsv(wb);
    expect(csv).toContain('"Price, USD"');

    const wb2 = new WorkbookModel('imported.csv');
    CsvHandler.importCsv(csv, wb2, 'Sheet1');
    expect(wb2.getSheet('sheet-1')?.getCell(0, 0)?.v).toBe('Product');
  });
});

describe('XLSX Roundtrip with ExcelJS', () => {
  it('roundtrips formulas, styles, and dimensions through XLSX', async () => {
    const wb = new WorkbookModel('test.xlsx');
    const sh = wb.getActiveSheet();
    sh.setCell(0, 0, { v: 10 });
    sh.setCell(0, 1, { v: 20 });
    sh.setCell(0, 2, { v: 30, f: '=A1+B1', style: { bold: true } });
    sh.setColWidth(2, 120);

    const buffer = await XlsxHandler.exportBuffer(wb);
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const importedWb = await XlsxHandler.importBuffer(buffer);
    const importedSh = importedWb.getActiveSheet();
    expect(importedSh.getCell(0, 0)?.v).toBe(10);
    expect(importedSh.getCell(0, 2)?.f).toBe('=A1+B1');
    expect(importedSh.getCell(0, 2)?.style?.bold).toBe(true);
  });
});
"""

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully generated {len(files)} Phase 2 files.")
