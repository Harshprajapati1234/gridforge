import React from 'react';

export const Panel: React.FC<{ title: string; isOpen: boolean; onClose?: () => void; children: React.ReactNode }> = ({
  title, isOpen, onClose, children
}) => {
  if (!isOpen) return null;
  return (
    <aside style={{
      width: '320px', height: '100%', backgroundColor: 'var(--gf-color-surface-panel)',
      borderLeft: '1px solid var(--gf-color-border-default)', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {onClose && <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>{children}</div>
    </aside>
  );
};
