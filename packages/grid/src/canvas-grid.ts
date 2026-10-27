import { SheetModel, cellAddress } from '@gridforge/core';
import { ViewportCalculator, ViewportRange } from './viewport';
import { SelectionManager, GridSelection, NormalizedSelection } from './selection';
import { formatCellValue } from './format';

export interface HitTestResult {
  part:
    | 'cell'
    | 'col-header'
    | 'row-header'
    | 'corner'
    | 'col-resize'
    | 'row-resize'
    | 'fill-handle'
    | 'scrollbar-v-thumb'
    | 'scrollbar-v-track'
    | 'scrollbar-h-thumb'
    | 'scrollbar-h-track'
    | 'none';
  r?: number;
  c?: number;
  resizeIndex?: number;
}

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
  public rowHeaderWidth = 46;
  public colHeaderHeight = 26;
  public scrollbarSize = 12;

  // Fill handle drag state
  public fillTargetRange: NormalizedSelection | null = null;
  public isFillDragging = false;

  constructor(options: CanvasGridOptions) {
    this.canvas = options.canvas;
    this.sheet = options.sheet;
    this.ctx = this.canvas.getContext('2d')!;
  }

  setSheet(s: SheetModel) {
    this.sheet = s;
    this.render();
  }

  getSheet(): SheetModel {
    return this.sheet;
  }

  getScrollBounds(): { maxScrollX: number; maxScrollY: number } {
    const dpr = window.devicePixelRatio || 1;
    const viewW = this.canvas.width / dpr - this.rowHeaderWidth - this.scrollbarSize;
    const viewH = this.canvas.height / dpr - this.colHeaderHeight - this.scrollbarSize;

    const totalW = ViewportCalculator.getTotalWidth(this.sheet);
    const totalH = ViewportCalculator.getTotalHeight(this.sheet);

    return {
      maxScrollX: Math.max(0, totalW - viewW),
      maxScrollY: Math.max(0, totalH - viewH)
    };
  }

  setScroll(sx: number, sy: number) {
    const bounds = this.getScrollBounds();
    this.scrollX = Math.max(0, Math.min(bounds.maxScrollX, sx));
    this.scrollY = Math.max(0, Math.min(bounds.maxScrollY, sy));
    this.render();
  }

  // --- Layout & Pixel Coordinate Calculation ---
  getCellRect(r: number, c: number): { x: number; y: number; w: number; h: number } | null {
    if (this.sheet.hiddenRows?.has(r)) return null;

    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    const vp = ViewportCalculator.compute(
      this.sheet,
      this.scrollX,
      this.scrollY,
      width - this.rowHeaderWidth - this.scrollbarSize,
      height - this.colHeaderHeight - this.scrollbarSize
    );

    const frozenCols = vp.frozenColsCount;
    const frozenRows = vp.frozenRowsCount;

    // Calculate X and W
    let x = this.rowHeaderWidth;
    const w = this.sheet.getColWidth(c);
    if (c < frozenCols) {
      for (let i = 0; i < c; i++) {
        x += this.sheet.getColWidth(i);
      }
    } else {
      let frozenW = 0;
      for (let i = 0; i < frozenCols; i++) {
        frozenW += this.sheet.getColWidth(i);
      }
      x += frozenW + vp.offsetX;
      for (let i = vp.startCol; i < c; i++) {
        x += this.sheet.getColWidth(i);
      }
    }

    // Calculate Y and H
    let y = this.colHeaderHeight;
    const h = this.sheet.getRowHeight(r);
    if (r < frozenRows) {
      for (let i = 0; i < r; i++) {
        if (!this.sheet.hiddenRows?.has(i)) {
          y += this.sheet.getRowHeight(i);
        }
      }
    } else {
      let frozenH = 0;
      for (let i = 0; i < frozenRows; i++) {
        if (!this.sheet.hiddenRows?.has(i)) {
          frozenH += this.sheet.getRowHeight(i);
        }
      }
      y += frozenH + vp.offsetY;
      for (let i = vp.startRow; i < r; i++) {
        if (!this.sheet.hiddenRows?.has(i)) {
          y += this.sheet.getRowHeight(i);
        }
      }
    }

    return { x, y, w, h };
  }

  // --- Hit Testing ---
  getCellAtPixel(px: number, py: number): HitTestResult {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    // 1. Top-Left Corner
    if (px < this.rowHeaderWidth && py < this.colHeaderHeight) {
      return { part: 'corner' };
    }

    // 2. Scrollbar Hits
    const vScrollTrackX = width - this.scrollbarSize;
    if (px >= vScrollTrackX && py >= this.colHeaderHeight && py <= height - this.scrollbarSize) {
      const { maxScrollY } = this.getScrollBounds();
      const trackH = height - this.colHeaderHeight - this.scrollbarSize;
      const thumbH = Math.max(24, (trackH / (trackH + maxScrollY)) * trackH);
      const thumbY = this.colHeaderHeight + (maxScrollY > 0 ? (this.scrollY / maxScrollY) * (trackH - thumbH) : 0);
      if (py >= thumbY && py <= thumbY + thumbH) {
        return { part: 'scrollbar-v-thumb' };
      }
      return { part: 'scrollbar-v-track' };
    }

    const hScrollTrackY = height - this.scrollbarSize;
    if (py >= hScrollTrackY && px >= this.rowHeaderWidth && px <= width - this.scrollbarSize) {
      const { maxScrollX } = this.getScrollBounds();
      const trackW = width - this.rowHeaderWidth - this.scrollbarSize;
      const thumbW = Math.max(24, (trackW / (trackW + maxScrollX)) * trackW);
      const thumbX = this.rowHeaderWidth + (maxScrollX > 0 ? (this.scrollX / maxScrollX) * (trackW - thumbW) : 0);
      if (px >= thumbX && px <= thumbX + thumbW) {
        return { part: 'scrollbar-h-thumb' };
      }
      return { part: 'scrollbar-h-track' };
    }

    const vp = ViewportCalculator.compute(
      this.sheet,
      this.scrollX,
      this.scrollY,
      width - this.rowHeaderWidth - this.scrollbarSize,
      height - this.colHeaderHeight - this.scrollbarSize
    );

    // 3. Column Header & Resize
    if (py < this.colHeaderHeight) {
      let curX = this.rowHeaderWidth;
      // Frozen columns
      for (let c = 0; c < vp.frozenColsCount; c++) {
        const cw = this.sheet.getColWidth(c);
        if (Math.abs(px - (curX + cw)) <= 4) {
          return { part: 'col-resize', resizeIndex: c };
        }
        if (px >= curX && px < curX + cw) {
          return { part: 'col-header', c };
        }
        curX += cw;
      }
      // Scrollable columns
      curX += vp.offsetX;
      for (let c = vp.startCol; c <= vp.endCol; c++) {
        const cw = this.sheet.getColWidth(c);
        if (Math.abs(px - (curX + cw)) <= 4) {
          return { part: 'col-resize', resizeIndex: c };
        }
        if (px >= curX && px < curX + cw) {
          return { part: 'col-header', c };
        }
        curX += cw;
      }
      return { part: 'none' };
    }

    // 4. Row Header & Resize
    if (px < this.rowHeaderWidth) {
      let curY = this.colHeaderHeight;
      // Frozen rows
      for (let r = 0; r < vp.frozenRowsCount; r++) {
        if (this.sheet.hiddenRows?.has(r)) continue;
        const rh = this.sheet.getRowHeight(r);
        if (Math.abs(py - (curY + rh)) <= 4) {
          return { part: 'row-resize', resizeIndex: r };
        }
        if (py >= curY && py < curY + rh) {
          return { part: 'row-header', r };
        }
        curY += rh;
      }
      // Scrollable rows
      curY += vp.offsetY;
      for (let r = vp.startRow; r <= vp.endRow; r++) {
        if (this.sheet.hiddenRows?.has(r)) continue;
        const rh = this.sheet.getRowHeight(r);
        if (Math.abs(py - (curY + rh)) <= 4) {
          return { part: 'row-resize', resizeIndex: r };
        }
        if (py >= curY && py < curY + rh) {
          return { part: 'row-header', r };
        }
        curY += rh;
      }
      return { part: 'none' };
    }

    // 5. Fill Handle Hit Testing
    const sel = this.selection.normalized();
    const brRect = this.getCellRect(sel.maxR, sel.maxC);
    if (brRect) {
      const hx = brRect.x + brRect.w;
      const hy = brRect.y + brRect.h;
      if (Math.abs(px - hx) <= 6 && Math.abs(py - hy) <= 6) {
        return { part: 'fill-handle' };
      }
    }

    // 6. Cell Grid Hit Testing
    // Resolve column
    let matchedCol = -1;
    let curX = this.rowHeaderWidth;
    for (let c = 0; c < vp.frozenColsCount; c++) {
      const cw = this.sheet.getColWidth(c);
      if (px >= curX && px < curX + cw) {
        matchedCol = c;
        break;
      }
      curX += cw;
    }
    if (matchedCol === -1) {
      curX += vp.offsetX;
      for (let c = vp.startCol; c <= vp.endCol; c++) {
        const cw = this.sheet.getColWidth(c);
        if (px >= curX && px < curX + cw) {
          matchedCol = c;
          break;
        }
        curX += cw;
      }
    }

    // Resolve row
    let matchedRow = -1;
    let curY = this.colHeaderHeight;
    for (let r = 0; r < vp.frozenRowsCount; r++) {
      if (this.sheet.hiddenRows?.has(r)) continue;
      const rh = this.sheet.getRowHeight(r);
      if (py >= curY && py < curY + rh) {
        matchedRow = r;
        break;
      }
      curY += rh;
    }
    if (matchedRow === -1) {
      curY += vp.offsetY;
      for (let r = vp.startRow; r <= vp.endRow; r++) {
        if (this.sheet.hiddenRows?.has(r)) continue;
        const rh = this.sheet.getRowHeight(r);
        if (py >= curY && py < curY + rh) {
          matchedRow = r;
          break;
        }
        curY += rh;
      }
    }

    if (matchedRow >= 0 && matchedCol >= 0) {
      return { part: 'cell', r: matchedRow, c: matchedCol };
    }

    return { part: 'none' };
  }

  public getThemeTokens() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return {
        bg: '#ffffff',
        gridLine: '#e2e8f0',
        headerBg: '#f8fafc',
        headerText: '#475569',
        headerSelectedBg: '#e0f2fe',
        headerSelectedText: '#0369a1',
        textPrimary: '#0f172a',
        selectionBorder: '#0284c7',
        selectionBg: 'rgba(2, 132, 199, 0.12)',
        borderDefault: '#cbd5e1',
        borderDivider: '#64748b',
        scrollbarTrack: '#f1f5f9',
        scrollbarThumb: '#cbd5e1',
        cornerBg: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      };
    }
    const s = getComputedStyle(document.documentElement);
    return {
      bg: s.getPropertyValue('--gf-color-surface-panel').trim() || '#ffffff',
      gridLine: s.getPropertyValue('--gf-color-grid-line').trim() || '#e2e8f0',
      headerBg: s.getPropertyValue('--gf-color-grid-header-bg').trim() || '#f8fafc',
      headerText: s.getPropertyValue('--gf-color-grid-header-text').trim() || '#475569',
      headerSelectedBg: s.getPropertyValue('--gf-color-surface-selected').trim() || '#e0f2fe',
      headerSelectedText: s.getPropertyValue('--gf-color-accent-primary').trim() || '#0284c7',
      textPrimary: s.getPropertyValue('--gf-color-text-primary').trim() || '#0f172a',
      selectionBorder: s.getPropertyValue('--gf-color-grid-selection-border').trim() || '#0284c7',
      selectionBg: s.getPropertyValue('--gf-color-grid-selection-background').trim() || 'rgba(2, 132, 199, 0.12)',
      borderDefault: s.getPropertyValue('--gf-color-border-default').trim() || '#cbd5e1',
      borderDivider: s.getPropertyValue('--gf-color-border-muted').trim() || '#64748b',
      scrollbarTrack: s.getPropertyValue('--gf-color-surface-header').trim() || '#f1f5f9',
      scrollbarThumb: s.getPropertyValue('--gf-color-border-default').trim() || '#cbd5e1',
      cornerBg: s.getPropertyValue('--gf-color-surface-header').trim() || '#f1f5f9',
      fontFamily: s.getPropertyValue('--gf-font-font-family-cell').trim() || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };
  }

  // --- Main Render Function ---
  render(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const tokens = this.getThemeTokens();

    this.ctx.save();
    this.ctx.scale(dpr, dpr);
    this.ctx.clearRect(0, 0, width, height);

    // Canvas background
    this.ctx.fillStyle = tokens.bg;
    this.ctx.fillRect(0, 0, width, height);

    const gridW = width - this.rowHeaderWidth - this.scrollbarSize;
    const gridH = height - this.colHeaderHeight - this.scrollbarSize;

    const vp = ViewportCalculator.compute(
      this.sheet,
      this.scrollX,
      this.scrollY,
      gridW,
      gridH
    );

    // Track merged cells drawn to avoid duplicate rendering
    const drawnMerges = new Set<string>();

    // 1. Draw Visible Cells
    const sel = this.selection.normalized();

    // Clip to grid viewport area
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(this.rowHeaderWidth, this.colHeaderHeight, gridW, gridH);
    this.ctx.clip();

    let curY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      if (this.sheet.hiddenRows?.has(r)) continue;
      const rh = this.sheet.getRowHeight(r);
      let curX = this.rowHeaderWidth + vp.offsetX;

      for (let c = vp.startCol; c <= vp.endCol; c++) {
        const cw = this.sheet.getColWidth(c);

        // Check merge
        const merge = this.sheet.isMerged(r, c);
        if (merge) {
          const mergeKey = `${merge.startRow},${merge.startCol}`;
          if (r !== merge.startRow || c !== merge.startCol) {
            curX += cw;
            continue;
          }
          if (drawnMerges.has(mergeKey)) {
            curX += cw;
            continue;
          }
          drawnMerges.add(mergeKey);

          // Calculate full merged dimensions
          const mRect = this.getMergedRect(merge, vp);
          if (mRect) {
            this.drawCell(merge.startRow, merge.startCol, mRect.x, mRect.y, mRect.w, mRect.h);
          }
        } else {
          this.drawCell(r, c, curX, curY, cw, rh);
        }

        curX += cw;
      }
      curY += rh;
    }

    // 2. Draw Selection Overlay Box & Fill Handle
    const active = this.selection.getSelection().activeCell;
    const minRect = this.getCellRect(sel.minR, sel.minC);
    const maxRect = this.getCellRect(sel.maxR, sel.maxC);

    if (minRect && maxRect) {
      const selX = minRect.x;
      const selY = minRect.y;
      const selW = maxRect.x + maxRect.w - selX;
      const selH = maxRect.y + maxRect.h - selY;

      // Selection background highlight
      this.ctx.fillStyle = tokens.selectionBg;
      this.ctx.fillRect(selX, selY, selW, selH);

      // Active cell cut-out if range is larger than 1 cell
      if (sel.minR !== sel.maxR || sel.minC !== sel.maxC) {
        const actRect = this.getCellRect(active.r, active.c);
        if (actRect) {
          this.ctx.fillStyle = tokens.bg;
          this.ctx.fillRect(actRect.x + 1, actRect.y + 1, actRect.w - 2, actRect.h - 2);
          // Re-draw active cell content inside cut-out
          this.drawCell(active.r, active.c, actRect.x, actRect.y, actRect.w, actRect.h, false, tokens);
        }
      }

      // Selection border
      this.ctx.strokeStyle = tokens.selectionBorder;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(selX + 1, selY + 1, selW - 2, selH - 2);

      // Fill Handle: 6x6 square at bottom right
      this.ctx.fillStyle = tokens.selectionBorder;
      this.ctx.fillRect(selX + selW - 4, selY + selH - 4, 7, 7);
      this.ctx.strokeStyle = tokens.bg;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(selX + selW - 4, selY + selH - 4, 7, 7);
    }

    // 3. Draw Fill Target Preview Box (Dashed Outline)
    if (this.isFillDragging && this.fillTargetRange) {
      const fMin = this.getCellRect(this.fillTargetRange.minR, this.fillTargetRange.minC);
      const fMax = this.getCellRect(this.fillTargetRange.maxR, this.fillTargetRange.maxC);
      if (fMin && fMax) {
        const fx = fMin.x;
        const fy = fMin.y;
        const fw = fMax.x + fMax.w - fx;
        const fh = fMax.y + fMax.h - fy;

        this.ctx.save();
        this.ctx.strokeStyle = '#16a34a';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 3]);
        this.ctx.strokeRect(fx + 1, fy + 1, fw - 2, fh - 2);
        this.ctx.restore();
      }
    }

    // Frozen panes divider lines
    if (vp.frozenColsCount > 0) {
      let fx = this.rowHeaderWidth;
      for (let c = 0; c < vp.frozenColsCount; c++) fx += this.sheet.getColWidth(c);
      this.ctx.strokeStyle = tokens.borderDivider;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(fx, this.colHeaderHeight);
      this.ctx.lineTo(fx, height);
      this.ctx.stroke();
    }

    if (vp.frozenRowsCount > 0) {
      let fy = this.colHeaderHeight;
      for (let r = 0; r < vp.frozenRowsCount; r++) {
        if (!this.sheet.hiddenRows?.has(r)) fy += this.sheet.getRowHeight(r);
      }
      this.ctx.strokeStyle = tokens.borderDivider;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.rowHeaderWidth, fy);
      this.ctx.lineTo(width, fy);
      this.ctx.stroke();
    }

    this.ctx.restore(); // restore viewport clip

    // 4. Draw Column Headers
    this.ctx.save();
    this.ctx.fillStyle = tokens.headerBg;
    this.ctx.fillRect(this.rowHeaderWidth, 0, gridW, this.colHeaderHeight);

    let hX = this.rowHeaderWidth + vp.offsetX;
    for (let c = vp.startCol; c <= vp.endCol; c++) {
      const cw = this.sheet.getColWidth(c);
      const isColSelected = c >= sel.minC && c <= sel.maxC;

      // Background highlight for selected column
      this.ctx.fillStyle = isColSelected ? tokens.headerSelectedBg : tokens.headerBg;
      this.ctx.fillRect(hX, 0, cw, this.colHeaderHeight);

      // Header borders
      this.ctx.strokeStyle = isColSelected ? tokens.selectionBorder : tokens.borderDefault;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(hX + 0.5, 0.5, cw, this.colHeaderHeight);

      // Column letter label
      this.ctx.font = isColSelected ? `bold 11px ${tokens.fontFamily}` : `11px ${tokens.fontFamily}`;
      this.ctx.fillStyle = isColSelected ? tokens.headerSelectedText : tokens.headerText;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(cellAddress(0, c).replace(/\d+/, ''), hX + cw / 2, this.colHeaderHeight / 2);

      // Filter funnel badge
      if (this.sheet.activeFilters?.has(c)) {
        this.ctx.fillStyle = tokens.selectionBorder;
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
      }

      hX += cw;
    }
    this.ctx.restore();

    // 5. Draw Row Headers
    this.ctx.save();
    this.ctx.fillStyle = tokens.headerBg;
    this.ctx.fillRect(0, this.colHeaderHeight, this.rowHeaderWidth, gridH);

    let hY = this.colHeaderHeight + vp.offsetY;
    for (let r = vp.startRow; r <= vp.endRow; r++) {
      if (this.sheet.hiddenRows?.has(r)) continue;
      const rh = this.sheet.getRowHeight(r);
      const isRowSelected = r >= sel.minR && r <= sel.maxR;

      // Background highlight for selected row
      this.ctx.fillStyle = isRowSelected ? tokens.headerSelectedBg : tokens.headerBg;
      this.ctx.fillRect(0, hY, this.rowHeaderWidth, rh);

      // Row borders
      this.ctx.strokeStyle = isRowSelected ? tokens.selectionBorder : tokens.borderDefault;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(0.5, hY + 0.5, this.rowHeaderWidth, rh);

      // Row number label
      this.ctx.font = isRowSelected ? `bold 11px ${tokens.fontFamily}` : `11px ${tokens.fontFamily}`;
      this.ctx.fillStyle = isRowSelected ? tokens.headerSelectedText : tokens.headerText;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(String(r + 1), this.rowHeaderWidth / 2, hY + rh / 2);

      hY += rh;
    }
    this.ctx.restore();

    // 6. Draw Top-Left Select-All Corner Block
    this.ctx.fillStyle = tokens.cornerBg;
    this.ctx.fillRect(0, 0, this.rowHeaderWidth, this.colHeaderHeight);
    this.ctx.strokeStyle = tokens.borderDefault;
    this.ctx.strokeRect(0.5, 0.5, this.rowHeaderWidth, this.colHeaderHeight);
    // Draw diagonal corner triangle
    this.ctx.fillStyle = tokens.headerText;
    this.ctx.beginPath();
    this.ctx.moveTo(this.rowHeaderWidth - 4, this.colHeaderHeight - 12);
    this.ctx.lineTo(this.rowHeaderWidth - 4, this.colHeaderHeight - 4);
    this.ctx.lineTo(this.rowHeaderWidth - 12, this.colHeaderHeight - 4);
    this.ctx.closePath();
    this.ctx.fill();

    // 7. Render Scrollbars
    this.renderScrollbars(width, height, tokens);

    this.ctx.restore();
  }

  // --- Draw Single Cell / Merged Cell ---
  private drawCell(r: number, c: number, x: number, y: number, w: number, h: number, drawBorder = true, tokens?: ReturnType<CanvasGrid['getThemeTokens']>) {
    const t = tokens || this.getThemeTokens();
    const cell = this.sheet.getCell(r, c);
    const style = this.sheet.getComputedCellStyle ? this.sheet.getComputedCellStyle(r, c) : cell?.style;

    // Background color
    if (style?.bgColor) {
      this.ctx.fillStyle = style.bgColor;
      this.ctx.fillRect(x, y, w, h);
    }

    // Grid border
    if (drawBorder) {
      this.ctx.strokeStyle = t.gridLine;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    }

    if (cell && cell.v != null) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(x + 2, y + 1, w - 4, h - 2);
      this.ctx.clip();

      let fontStyle = '';
      if (style?.italic) fontStyle += 'italic ';
      if (style?.bold) fontStyle += 'bold ';
      const fontSize = style?.fontSize || 12;
      this.ctx.font = `${fontStyle}${fontSize}px ${t.fontFamily}`;
      this.ctx.fillStyle = cell.hyperlink ? t.selectionBorder : (style?.color || t.textPrimary);

      // Format display text using number/date formatter
      const rawText = formatCellValue(cell.v, cell.fmt);
      const align = style?.align || (typeof cell.v === 'number' ? 'right' : 'left');
      const vAlign = style?.verticalAlign || 'middle';

      // Wrapped Text support
      if (style?.wrapText) {
        this.drawWrappedText(rawText, x + 6, y, w - 12, h, fontSize, align, vAlign);
      } else {
        let textX = x + 6;
        if (align === 'right') textX = x + w - 6;
        else if (align === 'center') textX = x + w / 2;

        let textY = y + h / 2;
        if (vAlign === 'top') textY = y + fontSize + 2;
        else if (vAlign === 'bottom') textY = y + h - 4;

        this.ctx.textAlign = align;
        this.ctx.textBaseline = vAlign === 'middle' ? 'middle' : (vAlign === 'top' ? 'bottom' : 'alphabetic');
        this.ctx.fillText(rawText, textX, textY);

        // Hyperlink / Underline
        if (cell.hyperlink || style?.underline) {
          const metrics = this.ctx.measureText(rawText);
          const lineY = y + h / 2 + 7;
          let startX = textX;
          if (align === 'right') startX = textX - metrics.width;
          else if (align === 'center') startX = textX - metrics.width / 2;
          this.ctx.strokeStyle = this.ctx.fillStyle;
          this.ctx.beginPath();
          this.ctx.moveTo(startX, lineY);
          this.ctx.lineTo(startX + metrics.width, lineY);
          this.ctx.stroke();
        }
      }

      this.ctx.restore();
    }

    // Comment indicator (red triangle in top right)
    if (cell?.meta?.comment) {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.moveTo(x + w - 6, y + 1);
      this.ctx.lineTo(x + w - 1, y + 1);
      this.ctx.lineTo(x + w - 1, y + 6);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxW: number,
    h: number,
    fontSize: number,
    align: 'left' | 'center' | 'right',
    vAlign: 'top' | 'middle' | 'bottom'
  ) {
    const lineHeight = fontSize * 1.3;
    const words = text.split(/(\s+)/);
    const lines: string[] = [];
    let curLine = '';

    for (const w of words) {
      if (w.includes('\n')) {
        const parts = w.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            lines.push(curLine);
            curLine = parts[i];
          } else {
            const test = curLine + parts[i];
            if (this.ctx.measureText(test).width <= maxW) curLine = test;
            else {
              lines.push(curLine);
              curLine = parts[i];
            }
          }
        }
        continue;
      }

      const testLine = curLine + w;
      if (this.ctx.measureText(testLine).width <= maxW) {
        curLine = testLine;
      } else {
        if (curLine.trim()) lines.push(curLine);
        curLine = w.trimStart();
      }
    }
    if (curLine) lines.push(curLine);

    const totalH = lines.length * lineHeight;
    let startY = y + 4 + fontSize;
    if (vAlign === 'middle') startY = y + (h - totalH) / 2 + fontSize;
    else if (vAlign === 'bottom') startY = y + h - totalH + fontSize - 4;

    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'alphabetic';

    for (let i = 0; i < lines.length; i++) {
      let lineX = x;
      if (align === 'right') lineX = x + maxW;
      else if (align === 'center') lineX = x + maxW / 2;
      this.ctx.fillText(lines[i], lineX, startY + i * lineHeight);
    }
  }

  private getMergedRect(merge: { startRow: number; startCol: number; endRow: number; endCol: number }, vp: ViewportRange) {
    const tl = this.getCellRect(merge.startRow, merge.startCol);
    if (!tl) return null;

    let w = 0;
    for (let c = merge.startCol; c <= merge.endCol; c++) {
      w += this.sheet.getColWidth(c);
    }

    let h = 0;
    for (let r = merge.startRow; r <= merge.endRow; r++) {
      if (!this.sheet.hiddenRows?.has(r)) {
        h += this.sheet.getRowHeight(r);
      }
    }

    return { x: tl.x, y: tl.y, w, h };
  }

  // --- Scrollbar Rendering ---
  private renderScrollbars(width: number, height: number, tokens?: ReturnType<CanvasGrid['getThemeTokens']>) {
    const t = tokens || this.getThemeTokens();
    const { maxScrollX, maxScrollY } = this.getScrollBounds();

    // 1. Vertical Scrollbar
    const vTrackX = width - this.scrollbarSize;
    const vTrackY = this.colHeaderHeight;
    const vTrackH = height - this.colHeaderHeight - this.scrollbarSize;

    this.ctx.fillStyle = t.scrollbarTrack;
    this.ctx.fillRect(vTrackX, vTrackY, this.scrollbarSize, vTrackH);

    const thumbH = Math.max(24, (vTrackH / (vTrackH + maxScrollY)) * vTrackH);
    const thumbY = vTrackY + (maxScrollY > 0 ? (this.scrollY / maxScrollY) * (vTrackH - thumbH) : 0);

    this.ctx.fillStyle = t.scrollbarThumb;
    this.ctx.beginPath();
    this.ctx.roundRect(vTrackX + 2, thumbY, this.scrollbarSize - 4, thumbH, 4);
    this.ctx.fill();

    // 2. Horizontal Scrollbar
    const hTrackX = this.rowHeaderWidth;
    const hTrackY = height - this.scrollbarSize;
    const hTrackW = width - this.rowHeaderWidth - this.scrollbarSize;

    this.ctx.fillStyle = t.scrollbarTrack;
    this.ctx.fillRect(hTrackX, hTrackY, hTrackW, this.scrollbarSize);

    const thumbW = Math.max(24, (hTrackW / (hTrackW + maxScrollX)) * hTrackW);
    const thumbX = hTrackX + (maxScrollX > 0 ? (this.scrollX / maxScrollX) * (hTrackW - thumbW) : 0);

    this.ctx.fillStyle = t.scrollbarThumb;
    this.ctx.beginPath();
    this.ctx.roundRect(thumbX, hTrackY + 2, thumbW, this.scrollbarSize - 4, 4);
    this.ctx.fill();

    // Bottom-right corner intersection
    this.ctx.fillStyle = t.borderDefault;
    this.ctx.fillRect(width - this.scrollbarSize, height - this.scrollbarSize, this.scrollbarSize, this.scrollbarSize);
  }
}
