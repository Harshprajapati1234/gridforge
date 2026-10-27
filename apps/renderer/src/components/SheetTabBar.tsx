import React from 'react';
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
