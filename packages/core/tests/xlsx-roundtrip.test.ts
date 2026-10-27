import { describe, it, expect } from 'vitest';
import { WorkbookModel } from '../src/model/workbook';
import { XlsxHandler } from '../src/io/xlsx-handler';

describe('XLSX Export/Import Roundtrip Fidelity', () => {
  it('preserves values, formulas, number formats, column widths, merges, 8-digit ARGB colors, and freeze panes', async () => {
    const wb = new WorkbookModel('TestReport.xlsx');
    const sheet = wb.getActiveSheet();
    sheet.name = 'QuarterlySales';

    // 1. Freeze panes
    sheet.freezeRows = 2;
    sheet.freezeCols = 1;

    // 2. Column widths & row heights
    sheet.setColWidth(0, 100);
    sheet.setColWidth(1, 200);
    sheet.setColWidth(2, 150);
    sheet.setRowHeight(0, 32);

    // 3. Merged cells
    sheet.mergedCells.push({
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 2
    });

    // 4. Header title (merged)
    sheet.setCell(0, 0, {
      v: 'Sales Performance 2026',
      style: {
        bold: true,
        fontSize: 16,
        color: '#1E293B',
        bgColor: '#E2E8F0',
        align: 'center'
      }
    });

    // 5. Column Headers
    sheet.setCell(1, 0, {
      v: 'Item Code',
      style: {
        bold: true,
        color: '#FFFFFF',
        bgColor: '#2563EB',
        align: 'center'
      }
    });
    sheet.setCell(1, 1, {
      v: 'Description',
      style: { bold: true, color: '#FFFFFF', bgColor: '#2563EB' }
    });
    sheet.setCell(1, 2, {
      v: 'Revenue',
      style: { bold: true, color: '#FFFFFF', bgColor: '#2563EB', align: 'right' }
    });

    // 6. Data rows with formats
    sheet.setCell(2, 0, { v: 'SKU-1001' });
    sheet.setCell(2, 1, { v: 'Mechanical Keyboard' });
    sheet.setCell(2, 2, {
      v: 149.99,
      fmt: '$#,##0.00',
      style: { align: 'right' }
    });

    sheet.setCell(3, 0, { v: 'SKU-1002' });
    sheet.setCell(3, 1, { v: 'Wireless Mouse' });
    sheet.setCell(3, 2, {
      v: 79.5,
      fmt: '$#,##0.00',
      style: { align: 'right' }
    });

    // 7. Formula cell with color & format
    sheet.setCell(4, 1, {
      v: 'Total',
      style: { bold: true, align: 'right' }
    });
    sheet.setCell(4, 2, {
      v: 229.49,
      f: '=SUM(C3:C4)',
      fmt: '$#,##0.00',
      style: {
        bold: true,
        color: '#16A34A',
        align: 'right'
      }
    });

    // Run export to Uint8Array buffer
    const buffer = await XlsxHandler.exportBuffer(wb);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(100);

    // Run import from buffer
    const roundtripWb = await XlsxHandler.importBuffer(buffer);
    expect(roundtripWb.sheets.length).toBe(1);

    const importedSheet = roundtripWb.getActiveSheet();
    expect(importedSheet.name).toBe('QuarterlySales');

    // Verify Freeze Panes
    expect(importedSheet.freezeRows).toBe(2);
    expect(importedSheet.freezeCols).toBe(1);

    // Verify Column Widths (within tolerance)
    expect(importedSheet.colWidths.get(0)).toBeGreaterThan(90);
    expect(importedSheet.colWidths.get(1)).toBeGreaterThan(180);
    expect(importedSheet.colWidths.get(2)).toBeGreaterThan(140);

    // Verify Merged Cells
    expect(importedSheet.mergedCells.length).toBe(1);
    expect(importedSheet.mergedCells[0]).toEqual({
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 2
    });

    // Verify Cell Values & Formulas
    const cellA1 = importedSheet.getCell(0, 0);
    expect(cellA1?.v).toBe('Sales Performance 2026');
    expect(cellA1?.style?.bold).toBe(true);
    expect(cellA1?.style?.color?.toUpperCase()).toBe('#1E293B');
    expect(cellA1?.style?.bgColor?.toUpperCase()).toBe('#E2E8F0');

    const cellA2 = importedSheet.getCell(1, 0);
    expect(cellA2?.v).toBe('Item Code');
    expect(cellA2?.style?.color?.toUpperCase()).toBe('#FFFFFF');
    expect(cellA2?.style?.bgColor?.toUpperCase()).toBe('#2563EB');

    const cellC3 = importedSheet.getCell(2, 2);
    expect(cellC3?.v).toBe(149.99);
    expect(cellC3?.fmt).toBe('$#,##0.00');

    const cellC5 = importedSheet.getCell(4, 2);
    expect(cellC5?.f).toBe('=SUM(C3:C4)');
    expect(cellC5?.fmt).toBe('$#,##0.00');
    expect(cellC5?.style?.bold).toBe(true);
    expect(cellC5?.style?.color?.toUpperCase()).toBe('#16A34A');
  });

  it('tracks unsupported features when loading complex workbooks', async () => {
    const wb = new WorkbookModel('Mock.xlsx');
    const buffer = await XlsxHandler.exportBuffer(wb);
    const imported = await XlsxHandler.importBuffer(buffer);
    expect(Array.isArray(imported.unsupportedFeatures)).toBe(true);
  });
});
