import { describe, it, expect } from 'vitest';
import { SheetModel, PivotEngine } from '../src';

describe('PivotEngine', () => {
  const createTestSheet = () => {
    const sheet = new SheetModel('s1', 'Sales');
    // Header
    sheet.setCell(0, 0, { v: 'Category' });
    sheet.setCell(0, 1, { v: 'Region' });
    sheet.setCell(0, 2, { v: 'Sales' });

    // Rows
    sheet.setCell(1, 0, { v: 'Apparel' });
    sheet.setCell(1, 1, { v: 'North' });
    sheet.setCell(1, 2, { v: 100 });

    sheet.setCell(2, 0, { v: 'Apparel' });
    sheet.setCell(2, 1, { v: 'South' });
    sheet.setCell(2, 2, { v: 150 });

    sheet.setCell(3, 0, { v: 'Footwear' });
    sheet.setCell(3, 1, { v: 'North' });
    sheet.setCell(3, 2, { v: 200 });

    sheet.setCell(4, 0, { v: 'Apparel' });
    sheet.setCell(4, 1, { v: 'North' });
    sheet.setCell(4, 2, { v: 50 });

    return sheet;
  };

  it('computes 1D pivot with sum aggregation', () => {
    const sheet = createTestSheet();
    const result = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0], // Category
      colFields: [],
      valueField: 2,  // Sales
      aggregation: 'sum'
    });

    expect(result.rowHeaders).toEqual(['Apparel', 'Footwear']);
    expect(result.matrix[0][0]).toBe(300); // 100 + 150 + 50
    expect(result.matrix[1][0]).toBe(200); // 200
    expect(result.grandTotal).toBe(500);
  });

  it('computes 1D pivot with count, average, min, and max aggregations', () => {
    const sheet = createTestSheet();

    // Count
    const countRes = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0],
      colFields: [],
      valueField: 2,
      aggregation: 'count'
    });
    expect(countRes.matrix[0][0]).toBe(3); // Apparel: 3 records
    expect(countRes.matrix[1][0]).toBe(1); // Footwear: 1 record
    expect(countRes.grandTotal).toBe(4);

    // Average
    const avgRes = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0],
      colFields: [],
      valueField: 2,
      aggregation: 'average'
    });
    expect(avgRes.matrix[0][0]).toBe(100); // (100 + 150 + 50) / 3 = 100
    expect(avgRes.matrix[1][0]).toBe(200);
    expect(avgRes.grandTotal).toBe(125); // 500 / 4

    // Min
    const minRes = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0],
      colFields: [],
      valueField: 2,
      aggregation: 'min'
    });
    expect(minRes.matrix[0][0]).toBe(50);
    expect(minRes.matrix[1][0]).toBe(200);
    expect(minRes.grandTotal).toBe(50);

    // Max
    const maxRes = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0],
      colFields: [],
      valueField: 2,
      aggregation: 'max'
    });
    expect(maxRes.matrix[0][0]).toBe(150);
    expect(maxRes.matrix[1][0]).toBe(200);
    expect(maxRes.grandTotal).toBe(200);
  });

  it('computes 2D multidimensional matrix grouping (rows × columns)', () => {
    const sheet = createTestSheet();
    const result = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 4, endCol: 2 },
      rowFields: [0], // Category (Apparel, Footwear)
      colFields: [1], // Region (North, South)
      valueField: 2,  // Sales
      aggregation: 'sum'
    });

    expect(result.rowHeaders).toEqual(['Apparel', 'Footwear']);
    expect(result.headers).toEqual(['North', 'South']);

    // Apparel: North = 100 + 50 = 150, South = 150
    expect(result.matrix[0][0]).toBe(150);
    expect(result.matrix[0][1]).toBe(150);
    expect(result.rowTotals[0]).toBe(300);

    // Footwear: North = 200, South = '-' (no entries)
    expect(result.matrix[1][0]).toBe(200);
    expect(result.matrix[1][1]).toBe('-');
    expect(result.rowTotals[1]).toBe(200);

    // Column totals
    expect(result.colTotals[0]).toBe(350); // North total: 150 + 200
    expect(result.colTotals[1]).toBe(150); // South total: 150
    expect(result.grandTotal).toBe(500);
  });

  it('handles empty / missing records safely', () => {
    const sheet = new SheetModel('s2', 'Empty');
    sheet.setCell(0, 0, { v: 'Col1' });
    sheet.setCell(0, 1, { v: 'Col2' });

    const result = PivotEngine.compute((r, c) => sheet.getCell(r, c), {
      sourceRange: { startRow: 0, startCol: 0, endRow: 1, endCol: 1 },
      rowFields: [0],
      colFields: [],
      valueField: 1,
      aggregation: 'sum'
    });

    expect(result.grandTotal).toBe(0);
    expect(result.rowHeaders.length).toBe(1);
    expect(result.rowHeaders[0]).toBe('(blank)');
  });
});
