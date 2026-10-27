import React, { useState, useEffect, useRef } from 'react';
import { functionDocs, FunctionDoc } from '@gridforge/formula';

export interface FormulaBarProps {
  activeAddress: string;
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

const REF_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

export function toggleReferenceAbsolute(formula: string, cursor: number): { newFormula: string; newCursor: number } {
  const refRegex = /(\$?)([A-Z]+)(\$?)([0-9]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = refRegex.exec(formula)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (cursor >= start && cursor <= end) {
      const colHasDollar = match[1] === '$';
      const colLetters = match[2].toUpperCase();
      const rowHasDollar = match[3] === '$';
      const rowNumber = match[4];

      let newRef = '';
      if (!colHasDollar && !rowHasDollar) {
        newRef = `$${colLetters}$${rowNumber}`;
      } else if (colHasDollar && rowHasDollar) {
        newRef = `${colLetters}$${rowNumber}`;
      } else if (!colHasDollar && rowHasDollar) {
        newRef = `$${colLetters}${rowNumber}`;
      } else {
        newRef = `${colLetters}${rowNumber}`;
      }

      const newFormula = formula.slice(0, start) + newRef + formula.slice(end);
      const diff = newRef.length - match[0].length;
      return { newFormula, newCursor: Math.max(0, cursor + diff) };
    }
  }

  return { newFormula: formula, newCursor: cursor };
}

function renderHighlightedFormula(formula: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\$?[A-Z]+\$?[0-9]+(?::\$?[A-Z]+\$?[0-9]+)?)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let colorIdx = 0;

  while ((match = regex.exec(formula)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} style={{ color: 'var(--gf-color-text-primary)' }}>
          {formula.slice(lastIndex, match.index)}
        </span>
      );
    }
    const color = REF_COLORS[colorIdx % REF_COLORS.length];
    colorIdx++;
    parts.push(
      <span
        key={`ref-${match.index}`}
        style={{
          color,
          fontWeight: 600,
          backgroundColor: `${color}18`,
          borderRadius: '3px',
          padding: '0 2px'
        }}
      >
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < formula.length) {
    parts.push(
      <span key={`text-${lastIndex}`} style={{ color: 'var(--gf-color-text-primary)' }}>
        {formula.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeAddress,
  value,
  onChange,
  onCommit,
  onCancel
}) => {
  const [suggestions, setSuggestions] = useState<FunctionDoc[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect function name prefix when typing formula
  useEffect(() => {
    if (!value.startsWith('=')) {
      setShowMenu(false);
      return;
    }

    const match = /([A-Za-z_][\w]*)$/.exec(value);
    if (match) {
      const prefix = match[1].toUpperCase();
      const matches = Object.values(functionDocs).filter((doc) =>
        doc.name.startsWith(prefix)
      ).slice(0, 8);

      if (matches.length > 0) {
        setSuggestions(matches);
        setSelectedIndex(0);
        setShowMenu(true);
        return;
      }
    }
    setShowMenu(false);
  }, [value]);

  const selectSuggestion = (doc: FunctionDoc) => {
    const match = /([A-Za-z_][\w]*)$/.exec(value);
    if (match) {
      const prefix = match[1];
      const newValue = value.slice(0, value.length - prefix.length) + doc.name + '(';
      onChange(newValue);
    }
    setShowMenu(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // F4 toggles $ absolute cell references
    if (e.key === 'F4') {
      e.preventDefault();
      const cursor = inputRef.current?.selectionStart ?? value.length;
      const { newFormula, newCursor } = toggleReferenceAbsolute(value, cursor);
      onChange(newFormula);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
      return;
    }

    if (showMenu && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && suggestions[selectedIndex])) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMenu(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      setShowMenu(false);
      onCommit();
    } else if (e.key === 'Escape') {
      setShowMenu(false);
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '32px',
        backgroundColor: 'var(--gf-color-surface-panel)',
        borderBottom: '1px solid var(--gf-color-border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: '8px',
        fontSize: '12px'
      }}
    >
      <div
        style={{
          width: '54px',
          textAlign: 'center',
          fontWeight: 600,
          color: 'var(--gf-color-text-secondary)',
          backgroundColor: 'var(--gf-color-surface-background)',
          padding: '3px 6px',
          borderRadius: '4px',
          border: '1px solid var(--gf-color-border-default)',
          fontFamily: 'var(--gf-font-font-family-mono)'
        }}
      >
        {activeAddress || 'A1'}
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          onClick={onCancel}
          title="Cancel (Esc)"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 5px', color: 'var(--gf-color-text-muted)' }}
        >
          ✕
        </button>
        <button
          onClick={onCommit}
          title="Commit (Enter)"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 5px', color: 'var(--gf-color-status-success)', fontWeight: 700 }}
        >
          ✓
        </button>
      </div>

      <span style={{ color: 'var(--gf-color-text-muted)', fontFamily: 'serif', fontStyle: 'italic', fontWeight: 600 }}>
        fx
      </span>

      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
        {value.startsWith('=') && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              fontFamily: 'var(--gf-font-font-family-mono)',
              fontSize: '13px',
              lineHeight: '32px',
              whiteSpace: 'pre',
              overflow: 'hidden',
              color: 'transparent'
            }}
          >
            {renderHighlightedFormula(value)}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a value or formula (=SUM(A1:B10)...)"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: value.startsWith('=') ? 'transparent' : 'var(--gf-color-text-primary)',
            caretColor: 'var(--gf-color-text-primary)',
            fontSize: '13px',
            fontFamily: value.startsWith('=') ? 'var(--gf-font-font-family-mono)' : 'var(--gf-font-font-family-cell)',
            zIndex: 1
          }}
        />
      </div>

      {/* Autocomplete Dropdown Popover */}
      {showMenu && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '34px',
            left: '110px',
            width: '380px',
            maxHeight: '260px',
            backgroundColor: 'var(--gf-color-surface-elevated)',
            border: '1px solid var(--gf-color-border-focus)',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
            {suggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.name}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--gf-color-interactive-primary)' : 'transparent',
                    color: isSelected ? 'var(--gf-color-interactive-text)' : 'var(--gf-color-text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--gf-font-font-family-mono)' }}>{item.name}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7, border: '1px solid currentColor', borderRadius: '3px', padding: '1px 4px' }}>
                      {item.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>{item.syntax}</span>
                </div>
              );
            })}
          </div>

          {suggestions[selectedIndex] && (
            <div
              style={{
                padding: '8px 10px',
                backgroundColor: 'var(--gf-color-surface-panel)',
                borderTop: '1px solid var(--gf-color-border-default)',
                fontSize: '11px',
                color: 'var(--gf-color-text-secondary)',
                lineHeight: 1.4
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--gf-color-text-primary)', marginBottom: '2px' }}>
                {suggestions[selectedIndex].syntax}
              </div>
              <div>{suggestions[selectedIndex].description}</div>
              <div style={{ marginTop: '2px', fontStyle: 'italic', opacity: 0.75 }}>
                e.g. {suggestions[selectedIndex].example}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
