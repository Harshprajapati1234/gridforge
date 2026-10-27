import React from 'react';
import { SheetModel, cellAddress } from '@gridforge/core';
import { CanvasGrid } from '@gridforge/grid';

export interface GridCanvasProps {
  sheet: SheetModel;
  onActiveCellChange: (addr: string, val: string, formula?: string) => void;
  onCellCommit: (r: number, c: number, val: string, formula?: string) => void;
  onSelectionRangeChange?: (range: { startRow: number; startCol: number; endRow: number; endCol: number }) => void;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({
  sheet,
  onActiveCellChange,
  onCellCommit,
  onSelectionRangeChange
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const gridRef = React.useRef<CanvasGrid | null>(null);

  // In-place editor state
  const [editor, setEditor] = React.useState<{
    r: number;
    c: number;
    x: number;
    y: number;
    w: number;
    h: number;
    val: string;
  } | null>(null);

  const initOrResizeCanvas = () => {
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
  };

  React.useEffect(() => {
    initOrResizeCanvas();
    window.addEventListener('resize', initOrResizeCanvas);
    return () => window.removeEventListener('resize', initOrResizeCanvas);
  }, [sheet]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !gridRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cell = gridRef.current.getCellAtPixel(px, py);
    if (cell) {
      gridRef.current.selection.setSelection(cell.r, cell.c);
      gridRef.current.render();

      const cData = sheet.getCell(cell.r, cell.c);
      const addr = cellAddress(cell.r, cell.c);
      onActiveCellChange(addr, cData?.f || (cData?.v != null ? String(cData.v) : ''), cData?.f);
      onSelectionRangeChange?.({ startRow: cell.r, startCol: cell.c, endRow: cell.r, endCol: cell.c });

      // If cell has hyperlink and user holds Cmd or Ctrl, open link
      if ((e.metaKey || e.ctrlKey) && cData?.hyperlink) {
        window.open(cData.hyperlink, '_blank');
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !gridRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cell = gridRef.current.getCellAtPixel(px, py);
    if (cell) {
      const cData = sheet.getCell(cell.r, cell.c);
      const cw = sheet.getColWidth(cell.c);
      const rh = sheet.getRowHeight(cell.r);
      const x = 46 + cell.c * 100 - gridRef.current.scrollX;
      const y = 26 + cell.r * 24 - gridRef.current.scrollY;

      setEditor({
        r: cell.r,
        c: cell.c,
        x,
        y,
        w: cw,
        h: rh,
        val: cData?.f || (cData?.v != null ? String(cData.v) : '')
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!gridRef.current) return;
    gridRef.current.scrollX = Math.max(0, gridRef.current.scrollX + e.deltaX);
    gridRef.current.scrollY = Math.max(0, gridRef.current.scrollY + e.deltaY);
    gridRef.current.render();
    if (editor) setEditor(null); // dismiss editor on scroll
  };

  const commitEditor = () => {
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
  };

  // Check if current cell has a dropdown validation
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
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* In-Place Cell Editor or Dropdown */}
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
              border: '2px solid var(--gf-color-accent-primary)',
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
              width: `${editor.w}px`,
              height: `${editor.h}px`,
              border: '2px solid var(--gf-color-accent-primary)',
              outline: 'none',
              padding: '2px 6px',
              fontSize: '12px',
              fontFamily: 'var(--gf-font-font-family-cell)',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              zIndex: 10
            }}
          />
        )
      )}
    </div>
  );
};
