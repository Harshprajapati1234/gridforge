import { WorkbookModel } from '../model/workbook';

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
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          line.push(`"${val.replace(/"/g, '""')}"`);
        } else {
          line.push(val);
        }
      }
      rows.push(line.join(','));
    }
    return rows.join('\n');
  }

  static importCsv(csvText: string, wb: WorkbookModel, sheetName = 'Imported'): void {
    const sheet = wb.addSheet(sheetName);
    const lines = csvText.split(/\r?\n/);
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
      } else if ((ch === ',' || ch === '\t') && !inQuotes) {
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
