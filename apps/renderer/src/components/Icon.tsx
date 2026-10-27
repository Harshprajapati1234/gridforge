import React from 'react';

export type IconName =
  | 'open'
  | 'save'
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'color'
  | 'bg-color'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'wrap-text'
  | 'merge'
  | 'unmerge'
  | 'sort-asc'
  | 'sort-desc'
  | 'filter'
  | 'find'
  | 'conditional-format'
  | 'data-validation'
  | 'hyperlink'
  | 'comment'
  | 'chart'
  | 'pivot'
  | 'freeze-panes'
  | 'unfreeze-panes'
  | 'flipkart'
  | 'modules'
  | 'bridge'
  | 'more'
  | 'chevron-down';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, style, className }) => {
  const s = { width: `${size}px`, height: `${size}px`, flexShrink: 0, ...style };

  switch (name) {
    case 'open':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
        </svg>
      );
    case 'save':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      );
    case 'undo':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      );
    case 'redo':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
      );
    case 'bold':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
      );
    case 'italic':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      );
    case 'underline':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
          <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
      );
    case 'color':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 20 8-16 8 16" />
          <line x1="6.5" y1="15" x2="17.5" y2="15" />
          <line x1="3" y1="22" x2="21" y2="22" strokeWidth="3" stroke="#ef4444" />
        </svg>
      );
    case 'bg-color':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
          <path d="m5 2 5 5" />
          <path d="M2 13h15" />
          <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" fill="#facc15" />
        </svg>
      );
    case 'align-left':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" /><line x1="15" y1="12" x2="3" y2="12" /><line x1="17" y1="18" x2="3" y2="18" />
        </svg>
      );
    case 'align-center':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="12" x2="7" y2="12" /><line x1="19" y1="18" x2="5" y2="18" />
        </svg>
      );
    case 'align-right':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="9" y2="12" /><line x1="21" y1="18" x2="7" y2="18" />
        </svg>
      );
    case 'wrap-text':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
          <polyline points="16 16 14 18 16 20" />
          <line x1="3" y1="18" x2="10" y2="18" />
        </svg>
      );
    case 'merge':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M8 12h8" /><path d="m11 9-3 3 3 3" /><path d="m13 9 3 3-3 3" />
        </svg>
      );
    case 'unmerge':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 3v18" /><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" />
        </svg>
      );
    case 'sort-asc':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M15 4h5l-5 6h5" /><path d="M15 20v-6h5v6" />
        </svg>
      );
    case 'sort-desc':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 8 4-4 4 4" /><path d="M7 4v16" /><path d="M15 4h5l-5 6h5" /><path d="M15 20v-6h5v6" />
        </svg>
      );
    case 'filter':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      );
    case 'find':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'conditional-format':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /><path d="m14 8 2 2-2 2" />
        </svg>
      );
    case 'data-validation':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'hyperlink':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'comment':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'chart':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      );
    case 'pivot':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" /><path d="M9 3v18" /><path d="m14 14 3-3m0 0-3-3m3 3H9" />
        </svg>
      );
    case 'freeze-panes':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 8h18" strokeWidth="2.5" /><path d="M8 3v18" strokeWidth="2.5" />
        </svg>
      );
    case 'unfreeze-panes':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 8h18" strokeDasharray="2 2" /><path d="M8 3v18" strokeDasharray="2 2" />
        </svg>
      );
    case 'flipkart':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'modules':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.439 7.85c-.049-.322.059-.648.289-.878l1.568-1.568a1.737 1.737 0 0 0-2.457-2.457L17.27 4.515a.998.998 0 0 1-.878.29 5.96 5.96 0 0 0-2.392 0 .998.998 0 0 1-.878-.29L11.554 2.95a1.737 1.737 0 0 0-2.457 2.457l1.568 1.568c.23.23.338.556.29.878a5.96 5.96 0 0 0 0 2.392.998.998 0 0 1-.29.878l-1.568 1.568a1.737 1.737 0 0 0 2.457 2.457l1.568-1.568c.23-.23.556-.338.878-.29a5.96 5.96 0 0 0 2.392 0 .998.998 0 0 1 .878.29l1.568 1.568a1.737 1.737 0 0 0 2.457-2.457l-1.568-1.568a.998.998 0 0 1-.29-.878 5.96 5.96 0 0 0 0-2.392Z" />
        </svg>
      );
    case 'bridge':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      );
    case 'more':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    default:
      return null;
  }
};
