import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--gf-color-accent-primary)', color: 'var(--gf-color-text-inverse)', border: '1px solid transparent' };
      case 'danger':
        return { backgroundColor: 'var(--gf-color-status-error)', color: 'var(--gf-color-text-inverse)', border: '1px solid transparent' };
      case 'ghost':
        return { backgroundColor: 'transparent', color: 'var(--gf-color-text-primary)', border: '1px solid transparent' };
      case 'secondary':
      default:
        return { backgroundColor: 'var(--gf-color-surface-panel)', color: 'var(--gf-color-text-primary)', border: '1px solid var(--gf-color-border-default)' };
    }
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontFamily: 'var(--gf-font-font-family-ui)',
        fontSize: size === 'sm' ? '12px' : '13px',
        fontWeight: 500,
        padding: size === 'sm' ? '3px 8px' : '6px 12px',
        borderRadius: 'var(--gf-border-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        boxShadow: variant === 'ghost' ? 'none' : 'var(--gf-elevation-shadow-sm)',
        ...getVariantStyles(),
        ...style
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
