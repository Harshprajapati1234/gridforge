import os
import json

base_dir = "/Users/sanctuarian/Downloads/Link-Sheet-v4/gridforge"
files = {}

# 1. FormulaBar.tsx
files["apps/renderer/src/components/FormulaBar.tsx"] = """import React from 'react';

export interface FormulaBarProps {
  activeAddress: string;
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeAddress,
  value,
  onChange,
  onCommit,
  onCancel
}) => {
  return (
    <div
      style={{
        height: '32px',
        backgroundColor: 'var(--gf-color-surface-panel)',
        borderBottom: '1px solid var(--gf-color-border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          width: '54px',
          textAlign: 'center',
          fontWeight: 600,
          color: 'var(--gf-color-text-secondary)',
          backgroundColor: 'var(--gf-color-surface-background)',
          padding: '3px 6px',
          borderRadius: '4px',
          border: '1px solid var(--gf-color-border-default)',
          fontFamily: 'var(--gf-font-font-family-mono)'
        }}
      >
        {activeAddress || 'A1'}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          onClick={onCancel}
          title="Cancel (Esc)"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 5px', color: 'var(--gf-color-text-muted)' }}
        >
          ✕
        </button>
        <button
          onClick={onCommit}
          title="Commit (Enter)"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 5px', color: 'var(--gf-color-status-success)', fontWeight: 700 }}
        >
          ✓
        </button>
      </div>

      <span style={{ color: 'var(--gf-color-text-muted)', fontFamily: 'serif', fontStyle: 'italic', fontWeight: 600 }}>
        fx
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Enter a value or formula (=SUM(A1:B10)...)"
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          color: 'var(--gf-color-text-primary)',
          fontSize: '13px',
          fontFamily: value.startsWith('=') ? 'var(--gf-font-font-family-mono)' : 'var(--gf-font-font-family-cell)'
        }}
      />
    </div>
  );
};
"""

# 2. RibbonToolbar.tsx
files["apps/renderer/src/components/RibbonToolbar.tsx"] = """import React from 'react';
import { Button } from '@gridforge/ui-kit';
import { CellStyle } from '@gridforge/core';

export interface RibbonToolbarProps {
  onOpen: () => void;
  onSaveXlsx: () => void;
  onSaveCsv: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  activeStyle?: CellStyle;
  onApplyStyle: (s: Partial<CellStyle>) => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  onOpen,
  onSaveXlsx,
  onSaveCsv,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  activeStyle,
  onApplyStyle
}) => {
  return (
    <div
      style={{
        height: '40px',
        backgroundColor: 'var(--gf-color-surface-panel)',
        borderBottom: '1px solid var(--gf-color-border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '12px',
        fontSize: '12px',
        overflowX: 'auto'
      }}
    >
      {/* File Group */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <Button size="sm" variant="secondary" onClick={onOpen} title="Open Excel (.xlsx) or CSV file">
          Open...
        </Button>
        <Button size="sm" variant="primary" onClick={onSaveXlsx} title="Save as Excel .xlsx">
          Save .xlsx
        </Button>
        <Button size="sm" variant="secondary" onClick={onSaveCsv} title="Export CSV">
          Export CSV
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo} title="Undo (Cmd+Z)">
          ↶
        </Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={onRedo} title="Redo (Cmd+Y)">
          ↷
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Formatting Tools */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onApplyStyle({ bold: !activeStyle?.bold })}
          style={{
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--gf-color-border-default)',
            background: activeStyle?.bold ? 'var(--gf-color-surface-hover)' : 'transparent',
            color: 'var(--gf-color-text-primary)',
            cursor: 'pointer'
          }}
          title="Bold (Cmd+B)"
        >
          B
        </button>
        <button
          onClick={() => onApplyStyle({ italic: !activeStyle?.italic })}
          style={{
            fontStyle: 'italic',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--gf-color-border-default)',
            background: activeStyle?.italic ? 'var(--gf-color-surface-hover)' : 'transparent',
            color: 'var(--gf-color-text-primary)',
            cursor: 'pointer'
          }}
          title="Italic (Cmd+I)"
        >
          I
        </button>
        <button
          onClick={() => onApplyStyle({ underline: !activeStyle?.underline })}
          style={{
            textDecoration: 'underline',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid var(--gf-color-border-default)',
            background: activeStyle?.underline ? 'var(--gf-color-surface-hover)' : 'transparent',
            color: 'var(--gf-color-text-primary)',
            cursor: 'pointer'
          }}
          title="Underline (Cmd+U)"
        >
          U
        </button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Alignment */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            onClick={() => onApplyStyle({ align })}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid var(--gf-color-border-default)',
              background: activeStyle?.align === align ? 'var(--gf-color-surface-hover)' : 'transparent',
              color: 'var(--gf-color-text-primary)',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {align === 'left' ? '⇤' : align === 'center' ? '⇹' : '⇥'}
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Fill Color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Fill:</span>
        {['#fef08a', '#bbf7d0', '#bae6fd', '#fed7aa', '#fbcfe8'].map((c) => (
          <button
            key={c}
            onClick={() => onApplyStyle({ bgColor: c })}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '3px',
              backgroundColor: c,
              border: '1px solid #cbd5e1',
              cursor: 'pointer'
            }}
          />
        ))}
        <button
          onClick={() => onApplyStyle({ bgColor: undefined })}
          style={{ background: 'transparent', border: 'none', fontSize: '11px', cursor: 'pointer', color: 'var(--gf-color-text-muted)' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
"""

# 3. SheetTabBar.tsx
files["apps/renderer/src/components/SheetTabBar.tsx"] = """import React from 'react';
import { SheetModel } from '@gridforge/core';

export interface SheetTabBarProps {
  sheets: SheetModel[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string, name: string) => void;
}

export const SheetTabBar: React.FC<SheetTabBarProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  const startRename = (s: SheetModel) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRenameSheet(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      style={{
        height: '30px',
        backgroundColor: 'var(--gf-color-surface-header)',
        borderTop: '1px solid var(--gf-color-border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '4px',
        fontSize: '12px'
      }}
    >
      <button
        onClick={onAddSheet}
        title="Add new sheet"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          border: '1px solid var(--gf-color-border-default)',
          backgroundColor: 'var(--gf-color-surface-panel)',
          color: 'var(--gf-color-text-primary)',
          cursor: 'pointer',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '6px'
        }}
      >
        +
      </button>

      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1 }}>
        {sheets.map((s) => {
          const isActive = s.id === activeSheetId;
          return (
            <div
              key={s.id}
              onClick={() => onSelectSheet(s.id)}
              onDoubleClick={() => startRename(s)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px 4px 0 0',
                border: '1px solid var(--gf-color-border-default)',
                borderBottom: isActive ? '1px solid var(--gf-color-surface-panel)' : undefined,
                backgroundColor: isActive ? 'var(--gf-color-surface-panel)' : 'var(--gf-color-surface-hover)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--gf-color-text-primary)' : 'var(--gf-color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {editingId === s.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  style={{
                    width: '80px',
                    fontSize: '12px',
                    border: '1px solid var(--gf-color-accent-primary)',
                    outline: 'none',
                    padding: '1px 4px'
                  }}
                />
              ) : (
                <span>{s.name}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
"""

# 4. GridCanvas.tsx
files["apps/renderer/src/components/GridCanvas.tsx"] = """import React from 'react';
import { SheetModel, cellAddress } from '@gridforge/core';
import { CanvasGrid } from '@gridforge/grid';

export interface GridCanvasProps {
  sheet: SheetModel;
  onActiveCellChange: (addr: string, val: string, formula?: string) => void;
  onCellCommit: (r: number, c: number, val: string, formula?: string) => void;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({
  sheet,
  onActiveCellChange,
  onCellCommit
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
    const formula = val.startsWith('=') ? val : undefined;
    onCellCommit(editor.r, editor.c, val, formula);
    setEditor(null);
    gridRef.current?.render();
  };

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

      {/* In-Place Cell Editor */}
      {editor && (
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
      )}
    </div>
  );
};
"""

# Write all to disk
for rel_path, content in files.items():
  full_path = os.path.join(base_dir, rel_path)
  os.makedirs(os.path.dirname(full_path), exist_ok=True)
  with open(full_path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully generated {len(files)} Phase 2 UI files.")
