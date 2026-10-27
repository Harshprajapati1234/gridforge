import React from 'react';
import { Button } from './Button';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  details?: string;
  width?: string;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen, title, children, details, width, onClose, confirmLabel, onConfirm
}) => {
  const [copied, setCopied] = React.useState(false);
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        width: width || '460px', maxWidth: '90vw', backgroundColor: 'var(--gf-color-surface-panel)',
        borderRadius: 'var(--gf-border-radius-lg)', boxShadow: 'var(--gf-elevation-shadow-lg)',
        border: '1px solid var(--gf-color-border-default)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--gf-color-border-default)',
          fontWeight: 600, fontSize: '15px', color: 'var(--gf-color-text-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
        <div style={{ padding: '18px', fontSize: '13px', color: 'var(--gf-color-text-secondary)', lineHeight: 1.5 }}>
          {children}
          {details && (
            <pre style={{
              marginTop: '12px', maxHeight: '160px', overflowY: 'auto', padding: '10px',
              backgroundColor: 'var(--gf-color-surface-background)', borderRadius: 'var(--gf-border-radius-sm)',
              border: '1px solid var(--gf-color-border-default)', fontSize: '11px', fontFamily: 'var(--gf-font-font-family-mono)'
            }}>
              {details}
            </pre>
          )}
        </div>
        <div style={{
          padding: '12px 18px', backgroundColor: 'var(--gf-color-surface-header)',
          borderTop: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: details ? 'space-between' : 'flex-end',
          alignItems: 'center', gap: '8px'
        }}>
          {details && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(details); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? 'Copied ✓' : 'Copy details'}
            </Button>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
            {onConfirm && <Button size="sm" variant="primary" onClick={onConfirm}>{confirmLabel || 'Confirm'}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};
