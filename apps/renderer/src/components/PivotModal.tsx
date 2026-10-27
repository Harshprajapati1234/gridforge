import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel, cellAddress, PivotEngine, PivotResult, AggregationType } from '@gridforge/core';

export interface PivotModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number };
  onInsertPivotSheet: (sheetName: string, pivotData: PivotResult) => void;
}

export const PivotModal: React.FC<PivotModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selectionRange,
  onInsertPivotSheet
}) => {
  const { maxCol, maxRow } = sheet.getBounds();
  const availableCols = Array.from({ length: Math.max(maxCol + 1, 4) }, (_, i) => ({
    index: i,
    label: sheet.getCell(0, i)?.v ? String(sheet.getCell(0, i)?.v) : `Col ${cellAddress(0, i).replace(/\d+/, '')}`
  }));

  const [rowColIndex, setRowColIndex] = useState(0);
  const [valueColIndex, setValueColIndex] = useState(Math.min(1, maxCol));
  const [aggregation, setAggregation] = useState<AggregationType>('sum');

  // Compute pivot
  const range = {
    startRow: 0,
    startCol: 0,
    endRow: Math.max(1, maxRow),
    endCol: Math.max(0, maxCol)
  };

  let pivotResult: PivotResult | null = null;
  try {
    pivotResult = PivotEngine.compute(
      (r, c) => sheet.getCell(r, c),
      {
        sourceRange: range,
        rowFields: [rowColIndex],
        colFields: [],
        valueField: valueColIndex,
        aggregation
      }
    );
  } catch {}

  const handleInsert = () => {
    if (pivotResult) {
      onInsertPivotSheet(`Pivot_${availableCols[rowColIndex]?.label || 'Summary'}`, pivotResult);
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pivot Table" width="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ color: 'var(--gf-color-text-secondary)' }}>Rows:</label>
            <select
              value={rowColIndex}
              onChange={(e) => setRowColIndex(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              {availableCols.map((c) => (
                <option key={c.index} value={c.index}>{c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ color: 'var(--gf-color-text-secondary)' }}>Values:</label>
            <select
              value={valueColIndex}
              onChange={(e) => setValueColIndex(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              {availableCols.map((c) => (
                <option key={c.index} value={c.index}>{c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ color: 'var(--gf-color-text-secondary)' }}>Summarize by:</label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="sum">Sum</option>
              <option value="count">Count</option>
              <option value="average">Average</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
        </div>

        {/* Live Pivot Table Preview */}
        {pivotResult && (
          <div
            style={{
              maxHeight: '260px',
              overflow: 'auto',
              border: '1px solid var(--gf-color-border-default)',
              borderRadius: '6px',
              backgroundColor: 'var(--gf-color-surface-panel)'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Row Labels</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>
                    {aggregation.toUpperCase()} of {availableCols[valueColIndex]?.label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pivotResult.rowHeaders.map((rh, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px' }}>{rh}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      {pivotResult?.matrix[idx]?.[0] ?? '-'}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                  <td style={{ padding: '6px 10px' }}>Grand Total</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    {pivotResult.grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <Button size="sm" variant="secondary" onClick={handleInsert}>
            Insert as New Sheet
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
