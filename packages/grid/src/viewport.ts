import { SheetModel } from '@gridforge/core';

export interface ViewportRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  offsetX: number;
  offsetY: number;
  frozenRowsCount: number;
  frozenColsCount: number;
}

export class ViewportCalculator {
  static compute(
    sheet: SheetModel,
    scrollLeft: number,
    scrollTop: number,
    viewportWidth: number,
    viewportHeight: number,
    defaultColWidth = 100,
    defaultRowHeight = 24
  ): ViewportRange {
    const frozenColsCount = Math.max(0, sheet.freezeCols || 0);
    const frozenRowsCount = Math.max(0, sheet.freezeRows || 0);

    // 1. Calculate width of frozen columns
    let frozenColsWidth = 0;
    for (let c = 0; c < frozenColsCount; c++) {
      frozenColsWidth += sheet.getColWidth(c, defaultColWidth);
    }

    // 2. Calculate height of frozen rows (skipping hidden rows)
    let frozenRowsHeight = 0;
    for (let r = 0; r < frozenRowsCount; r++) {
      if (!sheet.hiddenRows?.has(r)) {
        frozenRowsHeight += sheet.getRowHeight(r, defaultRowHeight);
      }
    }

    // Find starting scrollable column
    let curX = 0;
    let startCol = frozenColsCount;
    while (
      curX + sheet.getColWidth(startCol, defaultColWidth) <= scrollLeft &&
      startCol < 16384
    ) {
      curX += sheet.getColWidth(startCol, defaultColWidth);
      startCol++;
    }
    const offsetX = curX - scrollLeft;

    // Find ending scrollable column
    const availableWidth = Math.max(100, viewportWidth - frozenColsWidth);
    let visibleW = offsetX;
    let endCol = startCol;
    while (visibleW < availableWidth && endCol < 16384) {
      visibleW += sheet.getColWidth(endCol, defaultColWidth);
      endCol++;
    }

    // Find starting scrollable row (skipping hidden rows)
    let curY = 0;
    let startRow = frozenRowsCount;
    while (startRow < 1048576) {
      if (sheet.hiddenRows?.has(startRow)) {
        startRow++;
        continue;
      }
      const rh = sheet.getRowHeight(startRow, defaultRowHeight);
      if (curY + rh > scrollTop) {
        break;
      }
      curY += rh;
      startRow++;
    }
    const offsetY = curY - scrollTop;

    // Find ending scrollable row
    const availableHeight = Math.max(100, viewportHeight - frozenRowsHeight);
    let visibleH = offsetY;
    let endRow = startRow;
    while (visibleH < availableHeight && endRow < 1048576) {
      if (!sheet.hiddenRows?.has(endRow)) {
        visibleH += sheet.getRowHeight(endRow, defaultRowHeight);
      }
      endRow++;
    }

    return {
      startRow,
      endRow: Math.min(1048575, endRow + 1),
      startCol,
      endCol: Math.min(16383, endCol + 1),
      offsetX,
      offsetY,
      frozenRowsCount,
      frozenColsCount
    };
  }

  static getTotalWidth(sheet: SheetModel, minCols = 50, defaultColWidth = 100): number {
    const { maxCol } = sheet.getBounds();
    const count = Math.max(maxCol + 15, minCols);
    let total = 0;
    for (let c = 0; c < count; c++) {
      total += sheet.getColWidth(c, defaultColWidth);
    }
    return total;
  }

  static getTotalHeight(sheet: SheetModel, minRows = 150, defaultRowHeight = 24): number {
    const { maxRow } = sheet.getBounds();
    const count = Math.max(maxRow + 50, minRows);
    let total = 0;
    for (let r = 0; r < count; r++) {
      if (!sheet.hiddenRows?.has(r)) {
        total += sheet.getRowHeight(r, defaultRowHeight);
      }
    }
    return total;
  }
}
