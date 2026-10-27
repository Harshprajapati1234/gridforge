import { CellData, cellAddress, CellStyle } from './cell';
import { ConditionalFormatRule, DataValidationRule, FilterCriteria } from './data-tools';

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

  // Data Tools state
  public conditionalFormats: ConditionalFormatRule[] = [];
  public dataValidations: DataValidationRule[] = [];
  public activeFilters: Map<number, FilterCriteria> = new Map();
  public hiddenRows: Set<number> = new Set();

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

  recomputeFilterHiddenRows(headerRow = 0): void {
    this.hiddenRows.clear();
    if (this.activeFilters.size === 0) return;

    const { maxRow } = this.getBounds();
    for (let r = headerRow + 1; r <= maxRow; r++) {
      let isHidden = false;
      for (const [col, filter] of this.activeFilters.entries()) {
        const cell = this.getCell(r, col);
        const valStr = cell?.v != null ? String(cell.v) : '';

        if (filter.selectedValues && filter.selectedValues.size > 0) {
          if (!filter.selectedValues.has(valStr)) {
            isHidden = true;
            break;
          }
        }

        if (filter.textFilter) {
          const { operator, value } = filter.textFilter;
          const target = value.toLowerCase();
          const str = valStr.toLowerCase();
          if (operator === 'contains' && !str.includes(target)) isHidden = true;
          if (operator === 'equals' && str !== target) isHidden = true;
          if (operator === 'startsWith' && !str.startsWith(target)) isHidden = true;
          if (operator === 'endsWith' && !str.endsWith(target)) isHidden = true;
          if (isHidden) break;
        }

        if (filter.numberFilter) {
          const num = Number(cell?.v);
          const { operator, value, value2 } = filter.numberFilter;
          if (isNaN(num)) {
            isHidden = true;
            break;
          }
          if (operator === 'greaterThan' && !(num > value)) isHidden = true;
          if (operator === 'lessThan' && !(num < value)) isHidden = true;
          if (operator === 'equal' && !(num === value)) isHidden = true;
          if (operator === 'between' && (num < value || (value2 != null && num > value2))) isHidden = true;
          if (isHidden) break;
        }
      }

      if (isHidden) {
        this.hiddenRows.add(r);
      }
    }
  }

  getComputedCellStyle(r: number, c: number): CellStyle | undefined {
    const baseCell = this.getCell(r, c);
    let computedStyle = baseCell?.style ? { ...baseCell.style } : undefined;

    for (const rule of this.conditionalFormats) {
      if (
        r >= rule.range.startRow &&
        r <= rule.range.endRow &&
        c >= rule.range.startCol &&
        c <= rule.range.endCol
      ) {
        let matches = false;
        const val = baseCell?.v;

        if (rule.type === 'cellValue' && rule.operator) {
          const num = Number(val);
          const target = Number(rule.values?.[0]);
          const target2 = Number(rule.values?.[1]);
          if (!isNaN(num) && !isNaN(target)) {
            if (rule.operator === 'greaterThan' && num > target) matches = true;
            if (rule.operator === 'lessThan' && num < target) matches = true;
            if (rule.operator === 'equal' && num === target) matches = true;
            if (rule.operator === 'notEqual' && num !== target) matches = true;
            if (rule.operator === 'between' && num >= target && num <= target2) matches = true;
          }
        } else if (rule.type === 'textContains' && rule.text) {
          const str = val != null ? String(val).toLowerCase() : '';
          if (str.includes(rule.text.toLowerCase())) matches = true;
        }

        if (matches && rule.style) {
          computedStyle = { ...(computedStyle || {}), ...rule.style };
        }
      }
    }

    return computedStyle;
  }
}
