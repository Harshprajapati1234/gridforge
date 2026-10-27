import React from 'react';

export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled
}) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: '36px', height: '20px', borderRadius: '12px',
      backgroundColor: checked ? 'var(--gf-color-accent-primary)' : 'var(--gf-color-border-default)',
      position: 'relative', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '2px', outline: 'none'
    }}
  >
    <div style={{
      width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.2s'
    }} />
  </button>
);
