import { Command } from './command';
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
