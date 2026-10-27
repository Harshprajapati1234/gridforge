export interface GridSelection {
  activeCell: { r: number; c: number };
  start: { r: number; c: number };
  end: { r: number; c: number };
}

export interface NormalizedSelection {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

export class SelectionManager {
  private selection: GridSelection = {
    activeCell: { r: 0, c: 0 },
    start: { r: 0, c: 0 },
    end: { r: 0, c: 0 }
  };

  getSelection(): GridSelection {
    return this.selection;
  }

  setSelection(startR: number, startC: number, endR = startR, endC = startC): void {
    this.selection = {
      activeCell: { r: startR, c: startC },
      start: { r: startR, c: startC },
      end: { r: endR, c: endC }
    };
  }

  expandSelection(endR: number, endC: number): void {
    this.selection.end = { r: Math.max(0, endR), c: Math.max(0, endC) };
  }

  normalized(): NormalizedSelection {
    const s = this.selection;
    return {
      minR: Math.min(s.start.r, s.end.r),
      maxR: Math.max(s.start.r, s.end.r),
      minC: Math.min(s.start.c, s.end.c),
      maxC: Math.max(s.start.c, s.end.c)
    };
  }

  isSelected(r: number, c: number): boolean {
    const n = this.normalized();
    return r >= n.minR && r <= n.maxR && c >= n.minC && c <= n.maxC;
  }

  isActiveCell(r: number, c: number): boolean {
    return this.selection.activeCell.r === r && this.selection.activeCell.c === c;
  }

  selectRow(r: number, maxCol = 16383): void {
    this.selection = {
      activeCell: { r, c: 0 },
      start: { r, c: 0 },
      end: { r, c: maxCol }
    };
  }

  selectColumn(c: number, maxRow = 1048575): void {
    this.selection = {
      activeCell: { r: 0, c },
      start: { r: 0, c },
      end: { r: maxRow, c }
    };
  }

  selectAll(maxRow = 1048575, maxCol = 16383): void {
    this.selection = {
      activeCell: { r: 0, c: 0 },
      start: { r: 0, c: 0 },
      end: { r: maxRow, c: maxCol }
    };
  }
}
