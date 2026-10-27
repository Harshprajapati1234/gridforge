import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel } from '@gridforge/core';

export interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  onSelectCell: (r: number, c: number) => void;
  onReplaceCell: (r: number, c: number, newVal: string) => void;
  initialMode?: 'find' | 'replace';
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onSelectCell,
  onReplaceCell,
  initialMode = 'find'
}) => {
  const [mode, setMode] = useState<'find' | 'replace'>(initialMode);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [entireCell, setEntireCell] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matches, setMatches] = useState<{ r: number; c: number; v: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [statusMessage, setStatusMessage] = useState('');

  const searchCells = () => {
    if (!findText) {
      setMatches([]);
      setStatusMessage('Enter text to search.');
      return;
    }

    const allCells = sheet.getAllCells();
    const results: { r: number; c: number; v: string }[] = [];

    let regex: RegExp | null = null;
    if (useRegex) {
      try {
        regex = new RegExp(findText, matchCase ? '' : 'i');
      } catch {
        setStatusMessage('Invalid regular expression.');
        return;
      }
    }

    for (const cell of allCells) {
      if (cell.v == null) continue;
      const strVal = String(cell.v);
      let match = false;

      if (regex) {
        match = regex.test(strVal);
      } else if (entireCell) {
        match = matchCase ? strVal === findText : strVal.toLowerCase() === findText.toLowerCase();
      } else {
        match = matchCase ? strVal.includes(findText) : strVal.toLowerCase().includes(findText.toLowerCase());
      }

      if (match) {
        results.push({ r: cell.r, c: cell.c, v: strVal });
      }
    }

    // Sort by row, then col
    results.sort((a, b) => a.r === b.r ? a.c - b.c : a.r - b.r);
    setMatches(results);

    if (results.length > 0) {
      setCurrentIndex(0);
      onSelectCell(results[0].r, results[0].c);
      setStatusMessage(`Found ${results.length} match${results.length === 1 ? '' : 'es'}. (1 of ${results.length})`);
    } else {
      setCurrentIndex(-1);
      setStatusMessage('No matching cells found.');
    }
  };

  const findNext = () => {
    if (matches.length === 0) {
      searchCells();
      return;
    }
    const nextIdx = (currentIndex + 1) % matches.length;
    setCurrentIndex(nextIdx);
    onSelectCell(matches[nextIdx].r, matches[nextIdx].c);
    setStatusMessage(`${nextIdx + 1} of ${matches.length} matches.`);
  };

  const findPrevious = () => {
    if (matches.length === 0) {
      searchCells();
      return;
    }
    const prevIdx = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prevIdx);
    onSelectCell(matches[prevIdx].r, matches[prevIdx].c);
    setStatusMessage(`${prevIdx + 1} of ${matches.length} matches.`);
  };

  const handleReplace = () => {
    if (currentIndex < 0 || currentIndex >= matches.length) {
      searchCells();
      return;
    }
    const target = matches[currentIndex];
    let newVal = target.v;

    if (useRegex) {
      const regex = new RegExp(findText, matchCase ? '' : 'i');
      newVal = target.v.replace(regex, replaceText);
    } else if (entireCell) {
      newVal = replaceText;
    } else {
      const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
      newVal = target.v.replace(regex, replaceText);
    }

    onReplaceCell(target.r, target.c, newVal);
    // Refresh search
    searchCells();
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const allCells = sheet.getAllCells();
    let count = 0;

    let regex: RegExp;
    if (useRegex) {
      regex = new RegExp(findText, matchCase ? 'g' : 'gi');
    } else if (entireCell) {
      regex = new RegExp(`^${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, matchCase ? '' : 'i');
    } else {
      regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    }

    for (const cell of allCells) {
      if (cell.v == null) continue;
      const strVal = String(cell.v);
      if (regex.test(strVal)) {
        const newVal = strVal.replace(regex, replaceText);
        onReplaceCell(cell.r, cell.c, newVal);
        count++;
      }
    }

    setStatusMessage(`Replaced ${count} occurrences.`);
    setMatches([]);
    setCurrentIndex(-1);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Find and Replace" width="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gf-color-border-default)', paddingBottom: '8px' }}>
          <button
            onClick={() => setMode('find')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'find' ? 'var(--gf-color-interactive-primary)' : 'transparent',
              color: mode === 'find' ? 'var(--gf-color-interactive-text)' : 'var(--gf-color-text-secondary)',
              cursor: 'pointer',
              fontWeight: mode === 'find' ? 600 : 400
            }}
          >
            Find
          </button>
          <button
            onClick={() => setMode('replace')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'replace' ? 'var(--gf-color-interactive-primary)' : 'transparent',
              color: mode === 'replace' ? 'var(--gf-color-interactive-text)' : 'var(--gf-color-text-secondary)',
              cursor: 'pointer',
              fontWeight: mode === 'replace' ? 600 : 400
            }}
          >
            Replace
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Find what:</label>
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && findNext()}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
              placeholder="Text or number to find..."
              autoFocus
            />
          </div>

          {mode === 'replace' && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Replace with:</label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--gf-color-border-default)',
                  backgroundColor: 'var(--gf-color-surface-background)',
                  color: 'var(--gf-color-text-primary)'
                }}
                placeholder="Replacement text..."
              />
            </div>
          )}
        </div>

        {/* Search Options */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--gf-color-text-secondary)', fontSize: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
            Match case
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={entireCell} onChange={(e) => setEntireCell(e.target.checked)} />
            Match entire cell
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
            Regular expressions
          </label>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div style={{ fontSize: '12px', color: 'var(--gf-color-text-muted)', fontStyle: 'italic' }}>
            {statusMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button size="sm" variant="secondary" onClick={findPrevious}>
            Find Previous
          </Button>
          <Button size="sm" variant="primary" onClick={findNext}>
            Find Next
          </Button>
          {mode === 'replace' && (
            <>
              <Button size="sm" variant="secondary" onClick={handleReplace}>
                Replace
              </Button>
              <Button size="sm" variant="secondary" onClick={handleReplaceAll}>
                Replace All
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};
