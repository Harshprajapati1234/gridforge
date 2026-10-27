import { describe, it, expect } from 'vitest';
import {
  WorkbookModel,
  CommandBus,
  SortRangeCommand,
  MergeCellsCommand,
  SetFilterCommand,
  SetFreezePanesCommand
} from '../src';

describe('Data Tools & Commands Verification Suite (Phase 4)', () => {
  it('sorts a range of rows ascending and descending with full undo/redo', () => {
    const wb = new WorkbookModel('SortTest.xlsx');
    const sheet = wb.getActiveSheet();
    const cmdBus = new CommandBus(wb);

    // Row 0: Header
    // Row 1: Orange, 50
    // Row 2: Apple, 20
    // Row 3: Banana, 35
    sheet.setCell(1, 0, { v: 'Orange' });
    sheet.setCell(1, 1, { v: 50 });
    sheet.setCell(2, 0, { v: 'Apple' });
    sheet.setCell(2, 1, { v: 20 });
    sheet.setCell(3, 0, { v: 'Banana' });
    sheet.setCell(3, 1, { v: 35 });

    const dataRange = { startRow: 1, startCol: 0, endRow: 3, endCol: 1 };

    // 1. Sort Ascending by column 0 (Fruit name)
    cmdBus.execute(new SortRangeCommand(sheet.id, dataRange, [{ col: 0, ascending: true }]));

    expect(sheet.getCell(1, 0)?.v).toBe('Apple');
    expect(sheet.getCell(1, 1)?.v).toBe(20);
    expect(sheet.getCell(2, 0)?.v).toBe('Banana');
    expect(sheet.getCell(2, 1)?.v).toBe(35);
    expect(sheet.getCell(3, 0)?.v).toBe('Orange');
    expect(sheet.getCell(3, 1)?.v).toBe(50);

    // 2. Undo
    cmdBus.undo();
    expect(sheet.getCell(1, 0)?.v).toBe('Orange');
    expect(sheet.getCell(2, 0)?.v).toBe('Apple');

    // 3. Redo
    cmdBus.redo();
    expect(sheet.getCell(1, 0)?.v).toBe('Apple');

    // 4. Sort Descending by column 1 (Price)
    cmdBus.execute(new SortRangeCommand(sheet.id, dataRange, [{ col: 1, ascending: false }]));
    expect(sheet.getCell(1, 0)?.v).toBe('Orange'); // 50
    expect(sheet.getCell(2, 0)?.v).toBe('Banana'); // 35
    expect(sheet.getCell(3, 0)?.v).toBe('Apple');  // 20
  });

  it('merges cell ranges, sets center alignment, and supports unmerging with undo', () => {
    const wb = new WorkbookModel('MergeTest.xlsx');
    const sheet = wb.getActiveSheet();
    const cmdBus = new CommandBus(wb);

    sheet.setCell(0, 0, { v: 'Quarterly Sales Report' });
    const mergeRange = { startRow: 0, startCol: 0, endRow: 0, endCol: 3 };

    // Merge and center
    cmdBus.execute(new MergeCellsCommand(sheet.id, mergeRange, 'center'));
    expect(sheet.mergedCells).toHaveLength(1);
    expect(sheet.isMerged(0, 2)).toEqual(mergeRange);
    expect(sheet.getCell(0, 0)?.style?.align).toBe('center');

    // Undo
    cmdBus.undo();
    expect(sheet.mergedCells).toHaveLength(0);
    expect(sheet.isMerged(0, 2)).toBeNull();

    // Redo
    cmdBus.redo();
    expect(sheet.mergedCells).toHaveLength(1);

    // Unmerge
    cmdBus.execute(new MergeCellsCommand(sheet.id, mergeRange, 'unmerge'));
    expect(sheet.mergedCells).toHaveLength(0);
  });

  it('filters columns and dynamically recomputes hidden rows', () => {
    const wb = new WorkbookModel('FilterTest.xlsx');
    const sheet = wb.getActiveSheet();
    const cmdBus = new CommandBus(wb);

    sheet.setCell(0, 0, { v: 'Status' });
    sheet.setCell(1, 0, { v: 'Active' });
    sheet.setCell(2, 0, { v: 'Pending' });
    sheet.setCell(3, 0, { v: 'Active' });
    sheet.setCell(4, 0, { v: 'Inactive' });

    // Filter status = "Active"
    cmdBus.execute(new SetFilterCommand(sheet.id, 0, {
      col: 0,
      textFilter: { operator: 'equals', value: 'Active' }
    }));

    expect(sheet.hiddenRows.has(1)).toBe(false); // Active
    expect(sheet.hiddenRows.has(2)).toBe(true);  // Pending
    expect(sheet.hiddenRows.has(3)).toBe(false); // Active
    expect(sheet.hiddenRows.has(4)).toBe(true);  // Inactive

    // Undo
    cmdBus.undo();
    expect(sheet.hiddenRows.size).toBe(0);

    // Number Filter
    sheet.setCell(0, 1, { v: 'Score' });
    sheet.setCell(1, 1, { v: 95 });
    sheet.setCell(2, 1, { v: 40 });
    sheet.setCell(3, 1, { v: 75 });
    sheet.setCell(4, 1, { v: 12 });

    cmdBus.execute(new SetFilterCommand(sheet.id, 1, {
      col: 1,
      numberFilter: { operator: 'greaterThan', value: 50 }
    }));

    expect(sheet.hiddenRows.has(1)).toBe(false); // 95
    expect(sheet.hiddenRows.has(2)).toBe(true);  // 40
    expect(sheet.hiddenRows.has(3)).toBe(false); // 75
    expect(sheet.hiddenRows.has(4)).toBe(true);  // 12
  });

  it('evaluates conditional formatting styles dynamically', () => {
    const wb = new WorkbookModel('CondFormatTest.xlsx');
    const sheet = wb.getActiveSheet();

    sheet.setCell(1, 0, { v: 150 });
    sheet.setCell(2, 0, { v: 45 });

    sheet.conditionalFormats.push({
      id: 'cf-1',
      range: { startRow: 1, startCol: 0, endRow: 10, endCol: 0 },
      type: 'cellValue',
      operator: 'greaterThan',
      values: [100],
      style: { bgColor: '#dcfce7', color: '#15803d', bold: true }
    });

    const style1 = sheet.getComputedCellStyle(1, 0);
    expect(style1?.bgColor).toBe('#dcfce7');
    expect(style1?.bold).toBe(true);

    const style2 = sheet.getComputedCellStyle(2, 0);
    expect(style2?.bgColor).toBeUndefined();
  });

  it('handles Freeze Panes command with undo/redo', () => {
    const wb = new WorkbookModel('FreezeTest.xlsx');
    const sheet = wb.getActiveSheet();
    const cmdBus = new CommandBus(wb);

    cmdBus.execute(new SetFreezePanesCommand(sheet.id, 2, 1));
    expect(sheet.freezeRows).toBe(2);
    expect(sheet.freezeCols).toBe(1);

    cmdBus.undo();
    expect(sheet.freezeRows).toBe(0);
    expect(sheet.freezeCols).toBe(0);

    cmdBus.redo();
    expect(sheet.freezeRows).toBe(2);
    expect(sheet.freezeCols).toBe(1);
  });
});
