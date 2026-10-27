import { describe, it, expect } from 'vitest';
import { SheetModel } from '@gridforge/core';
import { SelectionManager, ViewportCalculator, formatCellValue } from '../src';
import { toggleReferenceAbsolute } from '../../../apps/renderer/src/components/FormulaBar';

describe('Grid Package - SelectionManager', () => {
  it('handles multi-cell range selection and normalization', () => {
    const sel = new SelectionManager();
    sel.setSelection(5, 10, 2, 4);

    const norm = sel.normalized();
    expect(norm).toEqual({
      minR: 2,
      maxR: 5,
      minC: 4,
      maxC: 10
    });

    expect(sel.isSelected(3, 7)).toBe(true);
    expect(sel.isSelected(1, 4)).toBe(false);
    expect(sel.isSelected(2, 4)).toBe(true);
    expect(sel.isSelected(5, 10)).toBe(true);
  });

  it('handles whole row and column selection', () => {
    const sel = new SelectionManager();
    sel.selectRow(5, 20);
    expect(sel.isSelected(5, 0)).toBe(true);
    expect(sel.isSelected(5, 15)).toBe(true);
    expect(sel.isSelected(6, 0)).toBe(false);

    sel.selectColumn(3, 100);
    expect(sel.isSelected(0, 3)).toBe(true);
    expect(sel.isSelected(99, 3)).toBe(true);
    expect(sel.isSelected(0, 4)).toBe(false);
  });
});

describe('Grid Package - ViewportCalculator', () => {
  it('computes viewport with hidden rows and frozen panes', () => {
    const sheet = new SheetModel('s1', 'Sheet 1');
    sheet.freezeRows = 2;
    sheet.freezeCols = 1;
    sheet.hiddenRows.add(3);
    sheet.hiddenRows.add(4);

    const vp = ViewportCalculator.compute(sheet, 200, 100, 800, 600, 100, 24);
    expect(vp.frozenRowsCount).toBe(2);
    expect(vp.frozenColsCount).toBe(1);
    expect(vp.startRow).toBeGreaterThanOrEqual(2);
    expect(vp.startCol).toBeGreaterThanOrEqual(1);

    const totalW = ViewportCalculator.getTotalWidth(sheet, 30);
    const totalH = ViewportCalculator.getTotalHeight(sheet, 50);
    expect(totalW).toBeGreaterThan(0);
    expect(totalH).toBeGreaterThan(0);
  });
});

describe('Grid Package - formatCellValue', () => {
  it('formats percentages correctly', () => {
    expect(formatCellValue(0.125, '0.0%')).toBe('12.5%');
    expect(formatCellValue(0.85, '0%')).toBe('85%');
  });

  it('formats currencies with symbols and thousands separators', () => {
    expect(formatCellValue(1234567.89, '$#,##0.00')).toBe('$1,234,567.89');
    expect(formatCellValue(5000, '₹#,##0')).toBe('₹5,000');
  });

  it('formats thousands separators', () => {
    expect(formatCellValue(9876543, '#,##0')).toBe('9,876,543');
    expect(formatCellValue(42.5, '#,##0.00')).toBe('42.50');
  });

  it('formats dates', () => {
    // 44927 is 2023-01-01 in Excel serial days
    const res = formatCellValue(44927, 'YYYY-MM-DD');
    expect(res).toBe('2023-01-01');
  });
});

describe('FormulaBar - F4 Absolute Reference Toggle', () => {
  it('cycles cell reference through absolute and relative modes', () => {
    // A1 -> $A$1
    let r = toggleReferenceAbsolute('=A1+10', 2);
    expect(r.newFormula).toBe('=$A$1+10');

    // $A$1 -> A$1
    r = toggleReferenceAbsolute(r.newFormula, r.newCursor);
    expect(r.newFormula).toBe('=A$1+10');

    // A$1 -> $A1
    r = toggleReferenceAbsolute(r.newFormula, r.newCursor);
    expect(r.newFormula).toBe('=$A1+10');

    // $A1 -> A1
    r = toggleReferenceAbsolute(r.newFormula, r.newCursor);
    expect(r.newFormula).toBe('=A1+10');
  });
});
