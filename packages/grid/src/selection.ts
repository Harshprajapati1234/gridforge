export interface GridSelection {
  activeCell: { r: number; c: number };
  start: { r: number; c: number };
  end: { r: number; c: number };
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
      start: { r: Math.min(startR, endR), c: Math.min(startC, endC) },
      end: { r: Math.max(startR, endR), c: Math.max(startC, endC) }
    };
  }

  expandSelection(endR: number, endC: number): void {
    this.selection.end = { r: Math.max(0, endR), c: Math.max(0, endC) };
  }

  isSelected(r: number, c: number): boolean {
    const s = this.selection;
    const minR = Math.min(s.start.r, s.end.r);
    const maxR = Math.max(s.start.r, s.end.r);
    const minC = Math.min(s.start.c, s.end.c);
    const maxC = Math.max(s.start.c, s.end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }
}
