import React from 'react';

export const Badge: React.FC<{ variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }> = ({
  variant = 'default',
  children
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success': return { bg: 'rgba(22, 163, 74, 0.15)', color: 'var(--gf-color-status-success)', border: 'rgba(22, 163, 74, 0.3)' };
      case 'warning': return { bg: 'rgba(217, 119, 6, 0.15)', color: 'var(--gf-color-status-warning)', border: 'rgba(217, 119, 6, 0.3)' };
      case 'error': return { bg: 'rgba(220, 38, 38, 0.15)', color: 'var(--gf-color-status-error)', border: 'rgba(220, 38, 38, 0.3)' };
      case 'info': return { bg: 'rgba(2, 132, 199, 0.15)', color: 'var(--gf-color-accent-primary)', border: 'rgba(2, 132, 199, 0.3)' };
      default: return { bg: 'var(--gf-color-surface-hover)', color: 'var(--gf-color-text-secondary)', border: 'var(--gf-color-border-default)' };
    }
  };
  const c = getColors();
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      lineHeight: 1.4,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {children}
    </span>
  );
};
