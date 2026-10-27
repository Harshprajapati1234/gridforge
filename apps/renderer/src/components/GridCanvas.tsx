import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SheetModel, cellAddress } from '@gridforge/core';
import { CanvasGrid, HitTestResult } from '@gridforge/grid';

export interface GridCanvasProps {
  sheet: SheetModel;
  onActiveCellChange: (addr: string, val: string, formula?: string) => void;
  onCellCommit: (r: number, c: number, val: string, formula?: string) => void;
  onSelectionRangeChange?: (range: { startRow: number; startCol: number; endRow: number; endCol: number }) => void;
  onDeleteRange?: (range: { startRow: number; startCol: number; endRow: number; endCol: number }) => void;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({
  sheet,
  onActiveCellChange,
  onCellCommit,
  onSelectionRangeChange,
  onDeleteRange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<CanvasGrid | null>(null);

  // In-place cell editor state
  const [editor, setEditor] = useState<{
    r: number;
    c: number;
    x: number;
    y: number;
    w: number;
    h: number;
    val: string;
  } | null>(null);

  // Mouse interaction state
  const [interaction, setInteraction] = useState<{
    type: 'none' | 'cell-select' | 'col-select' | 'row-select' | 'col-resize' | 'row-resize' | 'fill-drag' | 'scroll-v' | 'scroll-h';
    startX: number;
    startY: number;
    startVal: number;
    resizingIndex?: number;
    anchorCell?: { r: number; c: number };
  }>({ type: 'none', startX: 0, startY: 0, startVal: 0 });

  const notifySelectionChange = useCallback((grid: CanvasGrid) => {
    const sel = grid.selection.normalized();
    const active = grid.selection.getSelection().activeCell;
    const addr = cellAddress(active.r, active.c);
    const cell = sheet.getCell(active.r, active.c);
    onActiveCellChange(addr, cell?.f || (cell?.v != null ? String(cell.v) : ''), cell?.f);
    onSelectionRangeChange?.({
      startRow: sel.minR,
      startCol: sel.minC,
      endRow: sel.maxR,
      endCol: sel.maxC
    });
  }, [sheet, onActiveCellChange, onSelectionRangeChange]);

  const initOrResizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;

    if (!gridRef.current) {
      gridRef.current = new CanvasGrid({ canvas, sheet });
    } else {
      gridRef.current.setSheet(sheet);
    }
    gridRef.current.render();
  }, [sheet]);

  useEffect(() => {
    initOrResizeCanvas();
    window.addEventListener('resize', initOrResizeCanvas);
    return () => window.removeEventListener('resize', initOrResizeCanvas);
  }, [initOrResizeCanvas]);

  const openEditorAt = useCallback((r: number, c: number, initialText?: string) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getCellRect(r, c);
    if (!rect) return;

    const cell = sheet.getCell(r, c);
    const text = initialText !== undefined
      ? initialText
      : (cell?.f || (cell?.v != null ? String(cell.v) : ''));

    setEditor({
      r,
      c,
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      val: text
    });
  }, [sheet]);

  const commitEditor = useCallback(() => {
    if (!editor) return;
    const val = editor.val;

    // Check Data Validation
    const validation = sheet.dataValidations?.find(
      (v) =>
        editor.r >= v.range.startRow &&
        editor.r <= v.range.endRow &&
        editor.c >= v.range.startCol &&
        editor.c <= v.range.endCol
    );

    if (validation && !val.startsWith('=')) {
      let isValid = true;
      if (validation.type === 'list' && validation.listOptions) {
        isValid = validation.listOptions.includes(val);
      } else if (validation.type === 'wholeNumber') {
        const n = Number(val);
        isValid = !isNaN(n) && Number.isInteger(n);
        if (isValid && validation.values) {
          if (validation.operator === 'greaterThan') isValid = n > Number(validation.values[0]);
          if (validation.operator === 'lessThan') isValid = n < Number(validation.values[0]);
          if (validation.operator === 'between') isValid = n >= Number(validation.values[0]) && n <= Number(validation.values[1]);
        }
      }

      if (!isValid) {
        if (validation.errorStyle === 'stop') {
          alert(`Data Validation Error:\n${validation.errorMessage || 'Invalid value.'}`);
          return;
        } else {
          alert(`Warning:\n${validation.errorMessage || 'Value does not match expected criteria.'}`);
        }
      }
    }

    const formula = val.startsWith('=') ? val : undefined;
    onCellCommit(editor.r, editor.c, val, formula);
    setEditor(null);
    gridRef.current?.render();
  }, [editor, sheet, onCellCommit]);

  // Autofill formula / values across rows or cols
  const executeFill = useCallback((source: { minR: number; maxR: number; minC: number; maxC: number }, target: { minR: number; maxR: number; minC: number; maxC: number }) => {
    const sRows = source.maxR - source.minR + 1;
    const sCols = source.maxC - source.minC + 1;

    for (let r = target.minR; r <= target.maxR; r++) {
      for (let c = target.minC; c <= target.maxC; c++) {
        // Skip cells inside the source box
        if (r >= source.minR && r <= source.maxR && c >= source.minC && c <= source.maxC) {
          continue;
        }

        // Map to corresponding source cell
        const srcR = source.minR + ((r - source.minR) % sRows + sRows) % sRows;
        const srcC = source.minC + ((c - source.minC) % sCols + sCols) % sCols;
        const srcCell = sheet.getCell(srcR, srcC);

        if (!srcCell) {
          onCellCommit(r, c, '');
          continue;
        }

        if (srcCell.f) {
          // Adjust relative cell references in formula
          const dr = r - srcR;
          const dc = c - srcC;
          const adjustedF = srcCell.f.replace(/(\$?)([A-Z]+)(\$?)([0-9]+)/g, (match, colAbs, colLetters, rowAbs, rowNum) => {
            let newCol = colLetters;
            if (!colAbs) {
              let colIdx = 0;
              for (let i = 0; i < colLetters.length; i++) {
                colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
              }
              colIdx = Math.max(1, colIdx + dc);
              let s = '';
              let temp = colIdx - 1;
              while (temp >= 0) {
                s = String.fromCharCode((temp % 26) + 65) + s;
                temp = Math.floor(temp / 26) - 1;
              }
              newCol = s;
            }
            let newRow = rowNum;
            if (!rowAbs) {
              newRow = String(Math.max(1, parseInt(rowNum, 10) + dr));
            }
            return `${colAbs}${newCol}${rowAbs}${newRow}`;
          });
          onCellCommit(r, c, adjustedF, adjustedF);
        } else if (typeof srcCell.v === 'number') {
          // Numeric progression or repeat
          const stepR = r - srcR;
          const stepC = c - srcC;
          const val = srcCell.v + (stepR !== 0 ? stepR : stepC);
          onCellCommit(r, c, String(val));
        } else {
          onCellCommit(r, c, srcCell.v != null ? String(srcCell.v) : '');
        }
      }
    }
  }, [sheet, onCellCommit]);

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !gridRef.current) return;
    const grid = gridRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (editor) commitEditor();

    const hit = grid.getCellAtPixel(px, py);

    // 1. Column Divider Resize
    if (hit.part === 'col-resize' && hit.resizeIndex !== undefined) {
      setInteraction({
        type: 'col-resize',
        startX: e.clientX,
        startY: e.clientY,
        startVal: sheet.getColWidth(hit.resizeIndex),
        resizingIndex: hit.resizeIndex
      });
      return;
    }

    // 2. Row Divider Resize
    if (hit.part === 'row-resize' && hit.resizeIndex !== undefined) {
      setInteraction({
        type: 'row-resize',
        startX: e.clientX,
        startY: e.clientY,
        startVal: sheet.getRowHeight(hit.resizeIndex),
        resizingIndex: hit.resizeIndex
      });
      return;
    }

    // 3. Fill Handle Drag
    if (hit.part === 'fill-handle') {
      grid.isFillDragging = true;
      grid.fillTargetRange = grid.selection.normalized();
      grid.render();
      setInteraction({
        type: 'fill-drag',
        startX: e.clientX,
        startY: e.clientY,
        startVal: 0
      });
      return;
    }

    // 4. Scrollbar Tracks
    if (hit.part === 'scrollbar-v-thumb' || hit.part === 'scrollbar-v-track') {
      setInteraction({
        type: 'scroll-v',
        startX: e.clientX,
        startY: e.clientY,
        startVal: grid.scrollY
      });
      return;
    }
    if (hit.part === 'scrollbar-h-thumb' || hit.part === 'scrollbar-h-track') {
      setInteraction({
        type: 'scroll-h',
        startX: e.clientX,
        startY: e.clientY,
        startVal: grid.scrollX
      });
      return;
    }

    // 5. Select All Corner
    if (hit.part === 'corner') {
      const bounds = sheet.getBounds();
      grid.selection.selectAll(Math.max(bounds.maxRow, 100), Math.max(bounds.maxCol, 26));
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 6. Column Header Click
    if (hit.part === 'col-header' && hit.c !== undefined) {
      const bounds = sheet.getBounds();
      grid.selection.selectColumn(hit.c, Math.max(bounds.maxRow, 100));
      grid.render();
      notifySelectionChange(grid);
      setInteraction({
        type: 'col-select',
        startX: e.clientX,
        startY: e.clientY,
        startVal: hit.c,
        resizingIndex: hit.c
      });
      return;
    }

    // 7. Row Header Click
    if (hit.part === 'row-header' && hit.r !== undefined) {
      const bounds = sheet.getBounds();
      grid.selection.selectRow(hit.r, Math.max(bounds.maxCol, 26));
      grid.render();
      notifySelectionChange(grid);
      setInteraction({
        type: 'row-select',
        startX: e.clientX,
        startY: e.clientY,
        startVal: hit.r,
        resizingIndex: hit.r
      });
      return;
    }

    // 8. Grid Cell Click / Drag Selection
    if (hit.part === 'cell' && hit.r !== undefined && hit.c !== undefined) {
      if (e.shiftKey) {
        grid.selection.expandSelection(hit.r, hit.c);
      } else {
        grid.selection.setSelection(hit.r, hit.c);
        // If cell has hyperlink and Cmd/Ctrl is pressed, open link
        const cData = sheet.getCell(hit.r, hit.c);
        if ((e.metaKey || e.ctrlKey) && cData?.hyperlink) {
          window.open(cData.hyperlink, '_blank');
        }
      }
      grid.render();
      notifySelectionChange(grid);

      setInteraction({
        type: 'cell-select',
        startX: e.clientX,
        startY: e.clientY,
        startVal: 0,
        anchorCell: { r: hit.r, c: hit.c }
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !gridRef.current) return;
    const grid = gridRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // A. Active Interactions
    if (interaction.type === 'col-resize' && interaction.resizingIndex !== undefined) {
      const delta = e.clientX - interaction.startX;
      const newWidth = Math.max(25, interaction.startVal + delta);
      sheet.setColWidth(interaction.resizingIndex, newWidth);
      grid.render();
      return;
    }

    if (interaction.type === 'row-resize' && interaction.resizingIndex !== undefined) {
      const delta = e.clientY - interaction.startY;
      const newHeight = Math.max(18, interaction.startVal + delta);
      sheet.setRowHeight(interaction.resizingIndex, newHeight);
      grid.render();
      return;
    }

    if (interaction.type === 'scroll-v') {
      const { maxScrollY } = grid.getScrollBounds();
      const delta = e.clientY - interaction.startY;
      const trackH = rect.height - grid.colHeaderHeight - grid.scrollbarSize;
      const ratio = maxScrollY / Math.max(1, trackH);
      grid.setScroll(grid.scrollX, interaction.startVal + delta * ratio);
      return;
    }

    if (interaction.type === 'scroll-h') {
      const { maxScrollX } = grid.getScrollBounds();
      const delta = e.clientX - interaction.startX;
      const trackW = rect.width - grid.rowHeaderWidth - grid.scrollbarSize;
      const ratio = maxScrollX / Math.max(1, trackW);
      grid.setScroll(interaction.startVal + delta * ratio, grid.scrollY);
      return;
    }

    if (interaction.type === 'fill-drag') {
      const hit = grid.getCellAtPixel(px, py);
      if (hit.r !== undefined && hit.c !== undefined) {
        const sel = grid.selection.normalized();
        const fillTarget = {
          minR: Math.min(sel.minR, hit.r),
          maxR: Math.max(sel.maxR, hit.r),
          minC: Math.min(sel.minC, hit.c),
          maxC: Math.max(sel.maxC, hit.c)
        };
        grid.fillTargetRange = fillTarget;
        grid.render();
      }
      return;
    }

    if (interaction.type === 'cell-select') {
      const hit = grid.getCellAtPixel(px, py);
      if (hit.r !== undefined && hit.c !== undefined) {
        grid.selection.expandSelection(hit.r, hit.c);
        grid.render();
        notifySelectionChange(grid);
      }
      return;
    }

    if (interaction.type === 'col-select' && interaction.resizingIndex !== undefined) {
      const hit = grid.getCellAtPixel(px, py);
      if (hit.c !== undefined) {
        const bounds = sheet.getBounds();
        grid.selection.setSelection(0, interaction.resizingIndex, Math.max(bounds.maxRow, 100), hit.c);
        grid.render();
        notifySelectionChange(grid);
      }
      return;
    }

    if (interaction.type === 'row-select' && interaction.resizingIndex !== undefined) {
      const hit = grid.getCellAtPixel(px, py);
      if (hit.r !== undefined) {
        const bounds = sheet.getBounds();
        grid.selection.setSelection(interaction.resizingIndex, 0, hit.r, Math.max(bounds.maxCol, 26));
        grid.render();
        notifySelectionChange(grid);
      }
      return;
    }

    // B. Hover Cursor Updating
    const hit = grid.getCellAtPixel(px, py);
    let cursor = 'default';
    if (hit.part === 'col-resize') cursor = 'col-resize';
    else if (hit.part === 'row-resize') cursor = 'row-resize';
    else if (hit.part === 'fill-handle') cursor = 'crosshair';
    else if (hit.part === 'col-header' || hit.part === 'row-header' || hit.part === 'corner') cursor = 'pointer';
    else if (hit.part === 'cell') cursor = 'cell';

    canvasRef.current.style.cursor = cursor;
  };

  const handleMouseUp = () => {
    if (!gridRef.current) return;
    const grid = gridRef.current;

    if (interaction.type === 'fill-drag') {
      if (grid.fillTargetRange) {
        const src = grid.selection.normalized();
        const tgt = grid.fillTargetRange;
        executeFill(src, tgt);
        grid.selection.setSelection(tgt.minR, tgt.minC, tgt.maxR, tgt.maxC);
      }
      grid.isFillDragging = false;
      grid.fillTargetRange = null;
      grid.render();
      notifySelectionChange(grid);
    }

    setInteraction({ type: 'none', startX: 0, startY: 0, startVal: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !gridRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const hit = gridRef.current.getCellAtPixel(e.clientX - rect.left, e.clientY - rect.top);
    if (hit.part === 'cell' && hit.r !== undefined && hit.c !== undefined) {
      openEditorAt(hit.r, hit.c);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!gridRef.current) return;
    const grid = gridRef.current;
    grid.setScroll(grid.scrollX + e.deltaX, grid.scrollY + e.deltaY);
    if (editor) setEditor(null);
  };

  // --- Keyboard Navigation ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!gridRef.current) return;
    const grid = gridRef.current;
    const active = grid.selection.getSelection().activeCell;
    const bounds = sheet.getBounds();

    if (editor) {
      if (e.key === 'Enter') {
        commitEditor();
        grid.selection.setSelection(active.r + 1, active.c);
        grid.render();
        notifySelectionChange(grid);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEditor();
        grid.selection.setSelection(active.r, active.c + 1);
        grid.render();
        notifySelectionChange(grid);
      } else if (e.key === 'Escape') {
        setEditor(null);
      }
      return;
    }

    // 1. Enter Key
    if (e.key === 'Enter') {
      e.preventDefault();
      const dr = e.shiftKey ? -1 : 1;
      const nextR = Math.max(0, active.r + dr);
      grid.selection.setSelection(nextR, active.c);
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 2. Tab Key
    if (e.key === 'Tab') {
      e.preventDefault();
      const dc = e.shiftKey ? -1 : 1;
      const nextC = Math.max(0, active.c + dc);
      grid.selection.setSelection(active.r, nextC);
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 3. F2 (Edit Cell)
    if (e.key === 'F2') {
      e.preventDefault();
      openEditorAt(active.r, active.c);
      return;
    }

    // 4. Delete / Backspace (Clear Range)
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const sel = grid.selection.normalized();
      if (onDeleteRange) {
        onDeleteRange({
          startRow: sel.minR,
          startCol: sel.minC,
          endRow: sel.maxR,
          endCol: sel.maxC
        });
      } else {
        for (let r = sel.minR; r <= sel.maxR; r++) {
          for (let c = sel.minC; c <= sel.maxC; c++) {
            onCellCommit(r, c, '');
          }
        }
      }
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 5. Cmd+A / Ctrl+A (Select All)
    if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      grid.selection.selectAll(Math.max(bounds.maxRow, 100), Math.max(bounds.maxCol, 26));
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 6. Home / End
    if (e.key === 'Home') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) grid.selection.setSelection(0, 0);
      else grid.selection.setSelection(active.r, 0);
      grid.render();
      notifySelectionChange(grid);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) grid.selection.setSelection(bounds.maxRow, bounds.maxCol);
      else grid.selection.setSelection(active.r, bounds.maxCol);
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 7. Arrow Navigation (with Shift expansion & Cmd jump)
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      let dr = 0;
      let dc = 0;
      if (e.key === 'ArrowUp') dr = -1;
      else if (e.key === 'ArrowDown') dr = 1;
      else if (e.key === 'ArrowLeft') dc = -1;
      else if (e.key === 'ArrowRight') dc = 1;

      if (e.metaKey || e.ctrlKey) {
        dr *= 10;
        dc *= 10;
      }

      if (e.shiftKey) {
        const curEnd = grid.selection.getSelection().end;
        grid.selection.expandSelection(Math.max(0, curEnd.r + dr), Math.max(0, curEnd.c + dc));
      } else {
        grid.selection.setSelection(Math.max(0, active.r + dr), Math.max(0, active.c + dc));
      }
      grid.render();
      notifySelectionChange(grid);
      return;
    }

    // 8. Direct typing: alphanumeric or '=' immediately triggers edit
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      openEditorAt(active.r, active.c, e.key);
    }
  };

  // Check if current cell has dropdown validation
  const activeValidation = editor ? sheet.dataValidations?.find(
    (v) =>
      editor.r >= v.range.startRow &&
      editor.r <= v.range.endRow &&
      editor.c >= v.range.startCol &&
      editor.c <= v.range.endCol &&
      v.type === 'list' &&
      v.listOptions &&
      v.listOptions.length > 0
  ) : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        outline: 'none'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Accurate In-Place Cell Editor or Dropdown */}
      {editor && (
        activeValidation && activeValidation.listOptions ? (
          <select
            autoFocus
            value={editor.val}
            onChange={(e) => {
              const newVal = e.target.value;
              setEditor({ ...editor, val: newVal });
              onCellCommit(editor.r, editor.c, newVal);
              setEditor(null);
            }}
            onBlur={() => setEditor(null)}
            style={{
              position: 'absolute',
              left: `${editor.x}px`,
              top: `${editor.y}px`,
              width: `${Math.max(editor.w, 120)}px`,
              height: `${editor.h}px`,
              border: '2px solid var(--gf-color-accent-primary, #0284c7)',
              borderRadius: '2px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '12px',
              fontFamily: 'var(--gf-font-font-family-cell)',
              zIndex: 10
            }}
          >
            <option value="">-- Select option --</option>
            {activeValidation.listOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            autoFocus
            type="text"
            value={editor.val}
            onChange={(e) => setEditor({ ...editor, val: e.target.value })}
            onBlur={commitEditor}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditor();
              if (e.key === 'Escape') setEditor(null);
            }}
            style={{
              position: 'absolute',
              left: `${editor.x}px`,
              top: `${editor.y}px`,
              width: `${Math.max(editor.w, 80)}px`,
              height: `${editor.h}px`,
              border: '2px solid var(--gf-color-accent-primary, #0284c7)',
              outline: 'none',
              padding: '2px 6px',
              fontSize: '12px',
              fontFamily: 'var(--gf-font-font-family-cell)',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          />
        )
      )}
    </div>
  );
};
