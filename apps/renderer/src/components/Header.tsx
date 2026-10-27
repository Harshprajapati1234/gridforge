import React from 'react';
import { Button, Badge } from '@gridforge/ui-kit';

export const Header: React.FC<{
  appName: string;
  isSafeMode: boolean;
  themes: string[];
  currentTheme: string;
  onThemeSelect: (t: string) => void;
  onOpenModules: () => void;
  onOpenBridge?: () => void;
  onTriggerChaosTest?: () => void;
}> = ({ appName, isSafeMode, themes, currentTheme, onThemeSelect, onOpenModules, onOpenBridge, onTriggerChaosTest }) => (
  <header style={{
    height: '42px', backgroundColor: 'var(--gf-color-surface-panel)', borderBottom: '1px solid var(--gf-color-border-default)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 80px', userSelect: 'none'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="var(--gf-color-accent-primary)" />
          <path d="M7 11H25M7 16H25M7 21H25M13 7V25M19 7V25" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gf-color-text-primary)' }}>{appName}</span>
      </div>
      {isSafeMode && <Badge variant="warning">Safe Mode</Badge>}
      <nav style={{ display: 'flex', gap: '4px', fontSize: '12px' }}>
        {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Help'].map((item) => (
          <button key={item} style={{ background: 'transparent', border: 'none', padding: '4px 8px', color: 'var(--gf-color-text-secondary)', cursor: 'pointer' }}>{item}</button>
        ))}
        <button onClick={onOpenModules} style={{ background: 'var(--gf-color-surface-hover)', border: '1px solid var(--gf-color-border-default)', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>Modules</button>
      </nav>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {onOpenBridge && (
        <Button size="sm" variant="secondary" onClick={onOpenBridge} title="Pair with Chrome Extension (Link-Sheet)">
          🔗 Chrome Bridge
        </Button>
      )}
      {onTriggerChaosTest && (
        <Button size="sm" variant="danger" onClick={onTriggerChaosTest}>⚡ Test Crash Isolation</Button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{ color: 'var(--gf-color-text-muted)' }}>Theme:</span>
        <select value={currentTheme} onChange={(e) => onThemeSelect(e.target.value)} style={{ padding: '2px 6px', fontSize: '12px', background: 'var(--gf-color-surface-background)', color: 'var(--gf-color-text-primary)' }}>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpenModules}>Settings → Modules</Button>
    </div>
  </header>
);
