import { Command } from './command';
import { WorkbookModel } from '../model/workbook';
import { CellData } from '../model/cell';
import { MergedCellRange } from '../model/sheet';
import { SortRule, FilterCriteria, ConditionalFormatRule, DataValidationRule } from '../model/data-tools';

export class SortRangeCommand implements Command {
  public readonly description: string;
  private previousSnapshot: Map<string, CellData | null> = new Map();

  constructor(
    private sheetId: string,
    private range: { startRow: number; startCol: number; endRow: number; endCol: number },
    private rules: SortRule[]
  ) {
    this.description = `Sort Range (${rules.map((r) => `Col ${r.col + 1} ${r.ascending ? 'ASC' : 'DESC'}`).join(', ')})`;
  }

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    const { startRow, startCol, endRow, endCol } = this.range;

    // Snapshot existing cells in range
    this.previousSnapshot.clear();
    const rowsData: (CellData | null)[][] = [];

    for (let r = startRow; r <= endRow; r++) {
      const row: (CellData | null)[] = [];
      for (let c = startCol; c <= endCol; c++) {
        const cell = sheet.getCell(r, c);
        const cellCopy = cell ? { ...cell } : null;
        this.previousSnapshot.set(`${r},${c}`, cellCopy);
        row.push(cellCopy);
      }
      rowsData.push(row);
    }

    // Sort rows
    rowsData.sort((rowA, rowB) => {
      for (const rule of this.rules) {
        const offsetCol = rule.col - startCol;
        if (offsetCol < 0 || offsetCol >= rowA.length) continue;

        const valA = rowA[offsetCol]?.v;
        const valB = rowB[offsetCol]?.v;

        if (valA === valB) continue;
        if (valA == null) return 1;
        if (valB == null) return -1;

        const order = rule.ascending ? 1 : -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * order;
        }

        const comp = String(valA).localeCompare(String(valB));
        if (comp !== 0) return comp * order;
      }
      return 0;
    });

    // Write back sorted rows into sheet
    for (let i = 0; i < rowsData.length; i++) {
      const targetRow = startRow + i;
      for (let j = 0; j < rowsData[i].length; j++) {
        const targetCol = startCol + j;
        const srcCell = rowsData[i][j];
        if (srcCell) {
          sheet.setCell(targetRow, targetCol, {
            v: srcCell.v,
            f: srcCell.f,
            style: srcCell.style,
            fmt: srcCell.fmt
          });
        } else {
          sheet.deleteCell(targetRow, targetCol);
        }
      }
    }
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    for (const [key, cell] of this.previousSnapshot.entries()) {
      const [r, c] = key.split(',').map(Number);
      if (cell) {
        sheet.setCell(r, c, cell);
      } else {
        sheet.deleteCell(r, c);
      }
    }
  }
}

export class MergeCellsCommand implements Command {
  public readonly description: string;
  private prevMerged: MergedCellRange[] = [];
  private prevCells: Map<string, CellData | null> = new Map();

  constructor(
    private sheetId: string,
    private range: MergedCellRange,
    private mergeType: 'center' | 'across' | 'unmerge' = 'center'
  ) {
    this.description = `Merge Cells (${mergeType})`;
  }

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    this.prevMerged = [...sheet.mergedCells];
    this.prevCells.clear();

    const { startRow, startCol, endRow, endCol } = this.range;

    // Remove any overlapping existing merges
    sheet.mergedCells = sheet.mergedCells.filter(
      (m) => !(m.startRow <= endRow && m.endRow >= startRow && m.startCol <= endCol && m.endCol >= startCol)
    );

    if (this.mergeType === 'unmerge') {
      return;
    }

    if (this.mergeType === 'center' || this.mergeType === 'across') {
      // Snapshot all cells in range
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = sheet.getCell(r, c);
          this.prevCells.set(`${r},${c}`, cell ? { ...cell } : null);
        }
      }

      if (this.mergeType === 'center') {
        sheet.mergedCells.push({ startRow, startCol, endRow, endCol });
        // Align top-left cell center
        const topLeft = sheet.getCell(startRow, startCol);
        if (topLeft) {
          sheet.setCell(startRow, startCol, {
            style: { ...(topLeft.style || {}), align: 'center' }
          });
        }
      } else if (this.mergeType === 'across') {
        for (let r = startRow; r <= endRow; r++) {
          sheet.mergedCells.push({ startRow: r, startCol, endRow: r, endCol });
        }
      }
    }
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    sheet.mergedCells = [...this.prevMerged];
    for (const [key, cell] of this.prevCells.entries()) {
      const [r, c] = key.split(',').map(Number);
      if (cell) sheet.setCell(r, c, cell);
      else sheet.deleteCell(r, c);
    }
  }
}

export class SetFilterCommand implements Command {
  public readonly description: string;
  private prevFilter: FilterCriteria | undefined;

  constructor(
    private sheetId: string,
    private col: number,
    private criteria: FilterCriteria | null
  ) {
    this.description = `Filter Column ${col + 1}`;
  }

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    this.prevFilter = sheet.activeFilters.get(this.col);
    if (this.criteria) {
      sheet.activeFilters.set(this.col, this.criteria);
    } else {
      sheet.activeFilters.delete(this.col);
    }
    sheet.recomputeFilterHiddenRows();
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    if (this.prevFilter) {
      sheet.activeFilters.set(this.col, this.prevFilter);
    } else {
      sheet.activeFilters.delete(this.col);
    }
    sheet.recomputeFilterHiddenRows();
  }
}

export class SetFreezePanesCommand implements Command {
  public readonly description: string;
  private prevRows = 0;
  private prevCols = 0;

  constructor(
    private sheetId: string,
    private freezeRows: number,
    private freezeCols: number
  ) {
    this.description = `Freeze Panes (${freezeRows} rows, ${freezeCols} cols)`;
  }

  execute(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    this.prevRows = sheet.freezeRows;
    this.prevCols = sheet.freezeCols;
    sheet.freezeRows = this.freezeRows;
    sheet.freezeCols = this.freezeCols;
  }

  undo(wb: WorkbookModel): void {
    const sheet = wb.getSheet(this.sheetId);
    if (!sheet) return;

    sheet.freezeRows = this.prevRows;
    sheet.freezeCols = this.prevCols;
  }
}
