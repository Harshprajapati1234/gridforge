import { describe, it, expect } from 'vitest';
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
    CsvHandler.importCsv(csv, wb2, 'Imported');
    expect(wb2.getActiveSheet().getCell(0, 0)?.v).toBe('Product');
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
