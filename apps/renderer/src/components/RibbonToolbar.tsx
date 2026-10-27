import React, { useState, useRef, useEffect } from 'react';
import { CellStyle } from '@gridforge/core';
import { Icon, IconName } from './Icon';

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
  onOpenModules?: () => void;
  onOpenBridge?: () => void;
}

export type RibbonTab = 'home' | 'insert' | 'data' | 'view';

export const RibbonToolbar: React.FC<RibbonToolbarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isNarrow = containerWidth < 800;
  const isVeryNarrow = containerWidth < 620;

  const btnStyle = (isActive = false, disabled = false): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '46px',
    minWidth: '40px',
    padding: '3px 6px',
    background: isActive ? 'var(--gf-color-surface-selected)' : 'transparent',
    color: isActive ? 'var(--gf-color-accent-primary)' : 'var(--gf-color-text-primary)',
    border: isActive ? '1px solid var(--gf-color-border-focus)' : '1px solid transparent',
    borderRadius: 'var(--gf-border-radius-sm, 4px)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontSize: '10px',
    fontFamily: 'var(--gf-font-font-family-ui)',
    gap: '3px',
    transition: 'all 0.15s ease'
  });

  const smallBtnStyle = (isActive = false, disabled = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '24px',
    width: '26px',
    background: isActive ? 'var(--gf-color-surface-selected)' : 'transparent',
    color: isActive ? 'var(--gf-color-accent-primary)' : 'var(--gf-color-text-primary)',
    border: isActive ? '1px solid var(--gf-color-border-focus)' : '1px solid transparent',
    borderRadius: 'var(--gf-border-radius-sm, 4px)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: '2px',
    transition: 'all 0.15s ease'
  });

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px',
    height: '100%',
    borderRight: '1px solid var(--gf-color-border-default)',
    gap: '2px'
  };

  const groupLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    color: 'var(--gf-color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: 'auto',
    userSelect: 'none'
  };

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: 'var(--gf-color-surface-panel)',
        borderBottom: '1px solid var(--gf-color-border-default)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* 1. Ribbon Tab Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '28px',
          padding: '0 12px',
          gap: '4px',
          backgroundColor: 'var(--gf-color-surface-header)',
          borderBottom: '1px solid var(--gf-color-border-default)'
        }}
      >
        {(['home', 'insert', 'data', 'view'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: isActive ? 'var(--gf-color-surface-panel)' : 'transparent',
                color: isActive ? 'var(--gf-color-accent-primary)' : 'var(--gf-color-text-secondary)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--gf-color-accent-primary)' : '2px solid transparent',
                padding: '4px 14px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--gf-font-font-family-ui)'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 2. Ribbon Content & Tools Bar */}
      <div
        style={{
          height: '62px',
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          gap: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {activeTab === 'home' && (
          <>
            {/* File & History */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={btnStyle()} onClick={props.onOpen} title="Open File (Cmd+O)">
                  <Icon name="open" size={16} />
                  <span>Open</span>
                </button>
                <button style={btnStyle()} onClick={props.onSaveXlsx} title="Save XLSX (Cmd+S)">
                  <Icon name="save" size={16} />
                  <span>Save</span>
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button style={smallBtnStyle(false, !props.canUndo)} onClick={props.onUndo} disabled={!props.canUndo} title="Undo (Cmd+Z)">
                    <Icon name="undo" size={14} />
                  </button>
                  <button style={smallBtnStyle(false, !props.canRedo)} onClick={props.onRedo} disabled={!props.canRedo} title="Redo (Cmd+Y)">
                    <Icon name="redo" size={14} />
                  </button>
                </div>
              </div>
              <span style={groupLabelStyle}>File</span>
            </div>

            {/* Font & Style */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  style={smallBtnStyle(props.activeStyle?.bold)}
                  onClick={() => props.onApplyStyle({ bold: !props.activeStyle?.bold })}
                  title="Bold (Cmd+B)"
                >
                  <Icon name="bold" size={14} />
                </button>
                <button
                  style={smallBtnStyle(props.activeStyle?.italic)}
                  onClick={() => props.onApplyStyle({ italic: !props.activeStyle?.italic })}
                  title="Italic (Cmd+I)"
                >
                  <Icon name="italic" size={14} />
                </button>
                <button
                  style={smallBtnStyle(props.activeStyle?.underline)}
                  onClick={() => props.onApplyStyle({ underline: !props.activeStyle?.underline })}
                  title="Underline (Cmd+U)"
                >
                  <Icon name="underline" size={14} />
                </button>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <button
                    style={smallBtnStyle()}
                    onClick={() => props.onApplyStyle({ color: props.activeStyle?.color === '#ef4444' ? undefined : '#ef4444' })}
                    title="Text Color"
                  >
                    <Icon name="color" size={14} />
                  </button>
                  <button
                    style={smallBtnStyle()}
                    onClick={() => props.onApplyStyle({ bgColor: props.activeStyle?.bgColor === '#fef08a' ? undefined : '#fef08a' })}
                    title="Highlight Color"
                  >
                    <Icon name="bg-color" size={14} />
                  </button>
                </div>
              </div>
              <span style={groupLabelStyle}>Font</span>
            </div>

            {/* Alignment & Cells */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  style={smallBtnStyle(props.activeStyle?.align === 'left')}
                  onClick={() => props.onApplyStyle({ align: 'left' })}
                  title="Align Left"
                >
                  <Icon name="align-left" size={14} />
                </button>
                <button
                  style={smallBtnStyle(props.activeStyle?.align === 'center')}
                  onClick={() => props.onApplyStyle({ align: 'center' })}
                  title="Align Center"
                >
                  <Icon name="align-center" size={14} />
                </button>
                <button
                  style={smallBtnStyle(props.activeStyle?.align === 'right')}
                  onClick={() => props.onApplyStyle({ align: 'right' })}
                  title="Align Right"
                >
                  <Icon name="align-right" size={14} />
                </button>
                <button
                  style={smallBtnStyle(props.activeStyle?.wrapText)}
                  onClick={() => props.onApplyStyle({ wrapText: !props.activeStyle?.wrapText })}
                  title="Wrap Text"
                >
                  <Icon name="wrap-text" size={14} />
                </button>
                <button style={smallBtnStyle()} onClick={props.onMergeCenter} title="Merge & Center">
                  <Icon name="merge" size={14} />
                </button>
                <button style={smallBtnStyle()} onClick={props.onUnmerge} title="Unmerge Cells">
                  <Icon name="unmerge" size={14} />
                </button>
              </div>
              <span style={groupLabelStyle}>Alignment</span>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            {/* Visuals */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btnStyle()} onClick={props.onOpenChart} title="Insert Chart">
                  <Icon name="chart" size={16} />
                  <span>Chart</span>
                </button>
                <button style={btnStyle()} onClick={props.onOpenPivot} title="Insert Pivot Table">
                  <Icon name="pivot" size={16} />
                  <span>Pivot</span>
                </button>
              </div>
              <span style={groupLabelStyle}>Visuals</span>
            </div>

            {/* Links & Comments */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btnStyle()} onClick={props.onOpenHyperlink} title="Insert Hyperlink">
                  <Icon name="hyperlink" size={16} />
                  <span>Link</span>
                </button>
                <button style={btnStyle()} onClick={props.onOpenComment} title="Insert Comment / Note">
                  <Icon name="comment" size={16} />
                  <span>Comment</span>
                </button>
              </div>
              <span style={groupLabelStyle}>Annotations</span>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <>
            {/* Sort & Filter */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={smallBtnStyle()} onClick={props.onQuickSortAsc} title="Sort A to Z">
                  <Icon name="sort-asc" size={14} />
                </button>
                <button style={smallBtnStyle()} onClick={props.onQuickSortDesc} title="Sort Z to A">
                  <Icon name="sort-desc" size={14} />
                </button>
                <button style={smallBtnStyle()} onClick={props.onOpenSortFilter} title="Sort & Filter Criteria">
                  <Icon name="filter" size={14} />
                </button>
                <button style={smallBtnStyle()} onClick={props.onOpenFind} title="Find & Replace (Cmd+F)">
                  <Icon name="find" size={14} />
                </button>
              </div>
              <span style={groupLabelStyle}>Sort & Filter</span>
            </div>

            {/* Data Tools */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btnStyle()} onClick={props.onOpenConditionalFormat} title="Conditional Formatting">
                  <Icon name="conditional-format" size={16} />
                  <span>Format</span>
                </button>
                <button style={btnStyle()} onClick={props.onOpenDataValidation} title="Data Validation Rules">
                  <Icon name="data-validation" size={16} />
                  <span>Validation</span>
                </button>
              </div>
              <span style={groupLabelStyle}>Data Tools</span>
            </div>

            {/* Automation */}
            {props.onFlipkartAutomate && (
              <div style={groupStyle}>
                <button style={btnStyle()} onClick={props.onFlipkartAutomate} title="Flipkart Link Automator">
                  <Icon name="flipkart" size={16} />
                  <span>Flipkart</span>
                </button>
                <span style={groupLabelStyle}>Automation</span>
              </div>
            )}
          </>
        )}

        {activeTab === 'view' && (
          <>
            {/* Freeze Panes */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={btnStyle()} onClick={props.onFreezeTopRow} title="Freeze Top Row">
                  <Icon name="freeze-panes" size={16} />
                  <span>Top Row</span>
                </button>
                <button style={btnStyle()} onClick={props.onFreezeFirstCol} title="Freeze First Column">
                  <Icon name="freeze-panes" size={16} />
                  <span>First Col</span>
                </button>
                <button style={btnStyle()} onClick={props.onUnfreezePanes} title="Unfreeze Panes">
                  <Icon name="unfreeze-panes" size={16} />
                  <span>Unfreeze</span>
                </button>
              </div>
              <span style={groupLabelStyle}>Freeze Panes</span>
            </div>

            {/* System Tools */}
            <div style={groupStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {props.onOpenModules && (
                  <button style={btnStyle()} onClick={props.onOpenModules} title="Manage Plug-in Modules">
                    <Icon name="modules" size={16} />
                    <span>Modules</span>
                  </button>
                )}
                {props.onOpenBridge && (
                  <button style={btnStyle()} onClick={props.onOpenBridge} title="Chrome Extension Pairing Bridge">
                    <Icon name="bridge" size={16} />
                    <span>Bridge</span>
                  </button>
                )}
              </div>
              <span style={groupLabelStyle}>Extensions</span>
            </div>
          </>
        )}

        {/* Overflow Menu Button (Shown when window is narrow) */}
        {(isNarrow || isVeryNarrow) && (
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              style={btnStyle(showMoreMenu)}
              title="More Ribbon Tools"
            >
              <Icon name="more" size={16} />
              <span>More</span>
            </button>

            {showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: 0,
                  backgroundColor: 'var(--gf-color-surface-elevated)',
                  border: '1px solid var(--gf-color-border-default)',
                  borderRadius: 'var(--gf-border-radius-md, 6px)',
                  boxShadow: 'var(--gf-elevation-shadow-lg)',
                  zIndex: 100,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '160px'
                }}
              >
                <button
                  style={{ display: 'flex', gap: '8px', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gf-color-text-primary)', fontSize: '12px' }}
                  onClick={() => { props.onOpenFind(); setShowMoreMenu(false); }}
                >
                  <Icon name="find" size={14} /> Find & Replace
                </button>
                <button
                  style={{ display: 'flex', gap: '8px', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gf-color-text-primary)', fontSize: '12px' }}
                  onClick={() => { props.onSaveCsv(); setShowMoreMenu(false); }}
                >
                  <Icon name="save" size={14} /> Export CSV
                </button>
                {props.onFlipkartAutomate && (
                  <button
                    style={{ display: 'flex', gap: '8px', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gf-color-text-primary)', fontSize: '12px' }}
                    onClick={() => { props.onFlipkartAutomate?.(); setShowMoreMenu(false); }}
                  >
                    <Icon name="flipkart" size={14} /> Flipkart Automator
                  </button>
                )}
                {props.onOpenModules && (
                  <button
                    style={{ display: 'flex', gap: '8px', padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gf-color-text-primary)', fontSize: '12px' }}
                    onClick={() => { props.onOpenModules?.(); setShowMoreMenu(false); }}
                  >
                    <Icon name="modules" size={14} /> Module Manager
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
