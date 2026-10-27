import { SheetModel, cellAddress } from '@gridforge/core';
import { ViewportCalculator, ViewportRange } from './viewport';
import { SelectionManager, GridSelection } from './selection';

export interface CanvasGridOptions {
  canvas: HTMLCanvasElement;
  sheet: SheetModel;
  onSelectionChange?: (sel: GridSelection, addr: string) => void;
  onCellDoubleClick?: (r: number, c: number, x: number, y: number, w: number, h: number) => void;
}

export class CanvasGrid {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private sheet: SheetModel;
  public selection = new SelectionManager();
  public scrollX = 0;
  public scrollY = 0;
  private rowHeaderWidth = 46;
  private colHeaderHeight = 26;

  constructor(options: CanvasGridOptions) {
    this.canvas = options.canvas;
    this.sheet = options.sheet;
    this.ctx = this.canvas.getContext('2d')!;
  }

  setSheet(s: SheetModel) {
    this.sheet = s;
    this.render();
  }

  render(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    this.ctx.save();
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, width, height);

    const vp = ViewportCalculator.compute(
      this.sheet,
      this.scrollX,
      this.scrollY,
      width - this.rowHeaderWidth,
      height - this.colHeaderHeight
    );

    // 1. Draw cells in viewport
    let curY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      if (this.sheet.hiddenRows?.has(r)) {
        continue;
      }
      const rh = this.sheet.getRowHeight(r);
      let curX = this.rowHeaderWidth + vp.offsetX;

      for (let c = vp.startCol; c <= vp.endCol; c++) {
        const cw = this.sheet.getColWidth(c);
        const isSel = this.selection.isSelected(r, c);
        const cell = this.sheet.getCell(r, c);
        const style = this.sheet.getComputedCellStyle ? this.sheet.getComputedCellStyle(r, c) : cell?.style;

        // Background
        if (isSel) {
          this.ctx.fillStyle = 'rgba(2, 132, 199, 0.12)';
          this.ctx.fillRect(curX, curY, cw, rh);
        } else if (style?.bgColor) {
          this.ctx.fillStyle = style.bgColor;
          this.ctx.fillRect(curX, curY, cw, rh);
        }

        // Grid lines
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(curX + 0.5, curY + 0.5, cw, rh);

        // Text & formatting
        if (cell && cell.v != null) {
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(curX + 2, curY, cw - 4, rh);
          this.ctx.clip();

          let fontStyle = '';
          if (style?.italic) fontStyle += 'italic ';
          if (style?.bold) fontStyle += 'bold ';
          this.ctx.font = `${fontStyle}${style?.fontSize || 12}px -apple-system, sans-serif`;
          this.ctx.fillStyle = cell.hyperlink ? '#0284c7' : (style?.color || '#0f172a');
          this.ctx.textBaseline = 'middle';

          const text = String(cell.v);
          const align = style?.align || (typeof cell.v === 'number' ? 'right' : 'left');
          let textX = curX + 6;
          if (align === 'right') textX = curX + cw - 6;
          else if (align === 'center') textX = curX + cw / 2;
          this.ctx.textAlign = align;

          this.ctx.fillText(text, textX, curY + rh / 2);

          // Underline for hyperlinks
          if (cell.hyperlink || style?.underline) {
            const metrics = this.ctx.measureText(text);
            const lineY = curY + rh / 2 + 7;
            let startX = textX;
            if (align === 'right') startX = textX - metrics.width;
            else if (align === 'center') startX = textX - metrics.width / 2;
            this.ctx.strokeStyle = this.ctx.fillStyle;
            this.ctx.beginPath();
            this.ctx.moveTo(startX, lineY);
            this.ctx.lineTo(startX + metrics.width, lineY);
            this.ctx.stroke();
          }

          this.ctx.restore();
        }

        // Comment corner triangle (Excel red corner indicator)
        if (cell?.meta?.comment) {
          this.ctx.fillStyle = '#ef4444';
          this.ctx.beginPath();
          this.ctx.moveTo(curX + cw - 6, curY + 1);
          this.ctx.lineTo(curX + cw - 1, curY + 1);
          this.ctx.lineTo(curX + cw - 1, curY + 6);
          this.ctx.closePath();
          this.ctx.fill();
        }

        curX += cw;
      }
      curY += rh;
    }

    // 2. Draw Column Headers (A, B, C...)
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(this.rowHeaderWidth, 0, width - this.rowHeaderWidth, this.colHeaderHeight);
    let hX = this.rowHeaderWidth + vp.offsetX;
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.font = '11px -apple-system, sans-serif';
    this.ctx.fillStyle = '#475569';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let c = vp.startCol; c <= vp.endCol; c++) {
      const cw = this.sheet.getColWidth(c);
      this.ctx.strokeRect(hX + 0.5, 0.5, cw, this.colHeaderHeight);
      this.ctx.fillText(cellAddress(0, c).replace(/\d+/, ''), hX + cw / 2, this.colHeaderHeight / 2);

      // Active filter funnel badge
      if (this.sheet.activeFilters?.has(c)) {
        this.ctx.fillStyle = '#0284c7';
        this.ctx.beginPath();
        const fx = hX + cw - 14;
        const fy = 8;
        this.ctx.moveTo(fx, fy);
        this.ctx.lineTo(fx + 10, fy);
        this.ctx.lineTo(fx + 6, fy + 5);
        this.ctx.lineTo(fx + 6, fy + 9);
        this.ctx.lineTo(fx + 4, fy + 8);
        this.ctx.lineTo(fx + 4, fy + 5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#475569';
      }

      hX += cw;
    }

    // 3. Draw Row Headers (1, 2, 3...)
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.fillRect(0, this.colHeaderHeight, this.rowHeaderWidth, height - this.colHeaderHeight);
    let hY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      const rh = this.sheet.getRowHeight(r);
      this.ctx.strokeRect(0.5, hY + 0.5, this.rowHeaderWidth, rh);
      this.ctx.fillText(String(r + 1), this.rowHeaderWidth / 2, hY + rh / 2);
      hY += rh;
    }

    // 4. Top-Left corner block
    this.ctx.fillStyle = '#f1f5f9';
    this.ctx.fillRect(0, 0, this.rowHeaderWidth, this.colHeaderHeight);
    this.ctx.strokeRect(0.5, 0.5, this.rowHeaderWidth, this.colHeaderHeight);

    this.ctx.restore();
  }

  getCellAtPixel(px: number, py: number): { r: number; c: number } | null {
    if (px < this.rowHeaderWidth || py < this.colHeaderHeight) return null;
    let curX = this.rowHeaderWidth - (this.scrollX % 100);
    // Approximate or scan
    const dpr = window.devicePixelRatio || 1;
    const x = px - this.rowHeaderWidth + this.scrollX;
    const y = py - this.colHeaderHeight + this.scrollY;

    const c = Math.max(0, Math.floor(x / 100));
    const r = Math.max(0, Math.floor(y / 24));
    return { r, c };
  }
}
