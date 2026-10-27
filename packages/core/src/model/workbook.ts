import { SheetModel } from './sheet';
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
