import { SheetModel } from '@gridforge/core';

export interface ViewportRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  offsetX: number;
  offsetY: number;
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
    // Find starting column
    let curX = 0;
    let startCol = 0;
    while (curX + sheet.getColWidth(startCol, defaultColWidth) <= scrollLeft && startCol < 16384) {
      curX += sheet.getColWidth(startCol, defaultColWidth);
      startCol++;
    }
    const offsetX = curX - scrollLeft;

    // Find ending column
    let visibleW = offsetX;
    let endCol = startCol;
    while (visibleW < viewportWidth && endCol < 16384) {
      visibleW += sheet.getColWidth(endCol, defaultColWidth);
      endCol++;
    }

    // Find starting row
    let curY = 0;
    let startRow = 0;
    while (curY + sheet.getRowHeight(startRow, defaultRowHeight) <= scrollTop && startRow < 1048576) {
      curY += sheet.getRowHeight(startRow, defaultRowHeight);
      startRow++;
    }
    const offsetY = curY - scrollTop;

    // Find ending row
    let visibleH = offsetY;
    let endRow = startRow;
    while (visibleH < viewportHeight && endRow < 1048576) {
      visibleH += sheet.getRowHeight(endRow, defaultRowHeight);
      endRow++;
    }

    return {
      startRow,
      endRow: Math.min(1048575, endRow + 1),
      startCol,
      endCol: Math.min(16383, endCol + 1),
      offsetX,
      offsetY
    };
  }
}
