import React from 'react';
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
  // Data Tools
  onOpenFind: () => void;
  onOpenSortFilter: () => void;
  onQuickSortAsc: () => void;
  onQuickSortDesc: () => void;
  onOpenConditionalFormat: () => void;
  onOpenDataValidation: () => void;
  onMergeCenter: () => void;
  onUnmerge: () => void;
  onFreezeTopRow: () => void;
  onFreezeFirstCol: () => void;
  onUnfreezePanes: () => void;
  onOpenHyperlink: () => void;
  onOpenComment: () => void;
  onOpenChart: () => void;
  onOpenPivot: () => void;
  onFlipkartAutomate?: () => void;
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
  onApplyStyle,
  onOpenFind,
  onOpenSortFilter,
  onQuickSortAsc,
  onQuickSortDesc,
  onOpenConditionalFormat,
  onOpenDataValidation,
  onMergeCenter,
  onUnmerge,
  onFreezeTopRow,
  onFreezeFirstCol,
  onUnfreezePanes,
  onOpenHyperlink,
  onOpenComment,
  onOpenChart,
  onOpenPivot,
  onFlipkartAutomate
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
        gap: '10px',
        fontSize: '12px',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}
    >
      {/* File Group */}
      <div style={{ display: 'flex', gap: '4px' }}>
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
      <div style={{ display: 'flex', gap: '2px' }}>
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo} title="Undo (Cmd+Z)">
          ↶
        </Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={onRedo} title="Redo (Cmd+Y)">
          ↷
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Formatting Tools */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <button
          onClick={() => onApplyStyle({ bold: !activeStyle?.bold })}
          style={{
            fontWeight: 700,
            padding: '3px 7px',
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
            padding: '3px 7px',
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
            padding: '3px 7px',
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

      {/* Alignment */}
      <div style={{ display: 'flex', gap: '2px' }}>
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            onClick={() => onApplyStyle({ align })}
            style={{
              padding: '3px 6px',
              borderRadius: '4px',
              border: '1px solid var(--gf-color-border-default)',
              background: activeStyle?.align === align ? 'var(--gf-color-surface-hover)' : 'transparent',
              color: 'var(--gf-color-text-primary)',
              cursor: 'pointer'
            }}
          >
            {align === 'left' ? '⇤' : align === 'center' ? '⇹' : '⇥'}
          </button>
        ))}
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {['#fef08a', '#bbf7d0', '#bae6fd', '#fed7aa', '#fbcfe8'].map((c) => (
          <button
            key={c}
            onClick={() => onApplyStyle({ bgColor: c })}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              backgroundColor: c,
              border: '1px solid #cbd5e1',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Merge Group */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="secondary" onClick={onMergeCenter} title="Merge and Center selected cells">
          Merge & Center
        </Button>
        <Button size="sm" variant="ghost" onClick={onUnmerge} title="Unmerge Cells">
          Unmerge
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Data Tools: Sort, Filter, Find */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="secondary" onClick={onQuickSortAsc} title="Sort Ascending (A to Z)">
          Sort A-Z
        </Button>
        <Button size="sm" variant="secondary" onClick={onQuickSortDesc} title="Sort Descending (Z to A)">
          Sort Z-A
        </Button>
        <Button size="sm" variant="secondary" onClick={onOpenSortFilter} title="Custom Sort & Filter">
          Sort / Filter...
        </Button>
        <Button size="sm" variant="secondary" onClick={onOpenFind} title="Find & Replace (Cmd+F)">
          Find & Replace...
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Rules & Validation */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="secondary" onClick={onOpenConditionalFormat} title="Conditional Formatting">
          Conditional Format...
        </Button>
        <Button size="sm" variant="secondary" onClick={onOpenDataValidation} title="Data Validation Dropdowns">
          Data Validation...
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Visuals & Pivot Tables */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="secondary" onClick={onOpenChart} title="Create Chart (Bar, Line, Pie...)">
          📊 Chart...
        </Button>
        <Button size="sm" variant="secondary" onClick={onOpenPivot} title="Create Pivot Table">
          Pivot Table...
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Freeze Panes */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="ghost" onClick={onFreezeTopRow} title="Freeze Top Row">
          Freeze Row
        </Button>
        <Button size="sm" variant="ghost" onClick={onFreezeFirstCol} title="Freeze First Column">
          Freeze Col
        </Button>
        <Button size="sm" variant="ghost" onClick={onUnfreezePanes} title="Unfreeze Panes">
          Unfreeze
        </Button>
      </div>

      <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />

      {/* Insert: Link, Note */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <Button size="sm" variant="ghost" onClick={onOpenHyperlink} title="Insert or Edit Hyperlink (Cmd+K)">
          Link
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenComment} title="Insert or Edit Comment / Note">
          Note
        </Button>
      </div>

      {/* Flipkart Automation Group */}
      {onFlipkartAutomate && (
        <>
          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--gf-color-border-default)' }} />
          <Button size="sm" variant="primary" onClick={onFlipkartAutomate} title="Automate Flipkart SKUs / URLs in selected column">
            ⚡ Flipkart Automate
          </Button>
        </>
      )}
    </div>
  );
};
