import React from 'react';

export const StatusBar: React.FC<{ moduleCount: number; activeTheme: string; isSafeMode: boolean }> = ({
  moduleCount, activeTheme, isSafeMode
}) => (
  <footer style={{
    height: '24px', backgroundColor: 'var(--gf-color-surface-panel)', borderTop: '1px solid var(--gf-color-border-default)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: '11px',
    color: 'var(--gf-color-text-secondary)'
  }}>
    <div style={{ display: 'flex', gap: '12px' }}>
      <span>Ready</span>
      {isSafeMode && <span style={{ color: 'var(--gf-color-status-warning)', fontWeight: 600 }}>• Safe Mode Active</span>}
    </div>
    <div style={{ display: 'flex', gap: '16px' }}>
      <span>Active Theme: {activeTheme}</span>
      <span>Modules: {moduleCount}</span>
      <span>60 FPS Virtualized Canvas Ready</span>
    </div>
  </footer>
);
