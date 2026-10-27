import React from 'react';
import { Button } from './Button';

export interface BannerProps {
  title: string;
  message?: string;
  variant?: 'error' | 'warning' | 'info';
  actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>;
  onClose?: () => void;
}

export const Banner: React.FC<BannerProps> = ({ title, message, actions = [], onClose }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      backgroundColor: 'rgba(220, 38, 38, 0.12)',
      borderLeft: '4px solid var(--gf-color-status-error)',
      borderBottom: '1px solid var(--gf-color-border-default)',
      fontFamily: 'var(--gf-font-font-family-ui)',
      fontSize: '13px',
      color: 'var(--gf-color-text-primary)',
      gap: '12px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {message && <span style={{ color: 'var(--gf-color-text-secondary)' }}>{message}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {actions.map((act, i) => (
          <Button key={i} size="sm" variant={act.variant || 'secondary'} onClick={act.onClick}>
            {act.label}
          </Button>
        ))}
        {onClose && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
        )}
      </div>
    </div>
  );
};
