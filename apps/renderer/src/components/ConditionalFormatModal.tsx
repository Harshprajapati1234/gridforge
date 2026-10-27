import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel, ConditionalFormatRule } from '@gridforge/core';
import { generateId } from '@gridforge/shared';

export interface ConditionalFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number };
  onAddRule: (rule: ConditionalFormatRule) => void;
  onRemoveRule: (ruleId: string) => void;
}

export const ConditionalFormatModal: React.FC<ConditionalFormatModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selectionRange,
  onAddRule,
  onRemoveRule
}) => {
  const [operator, setOperator] = useState<'greaterThan' | 'lessThan' | 'equal' | 'between'>('greaterThan');
  const [val1, setVal1] = useState('100');
  const [val2, setVal2] = useState('500');
  const [formatPreset, setFormatPreset] = useState<'red' | 'green' | 'yellow' | 'blue'>('green');

  const presets = {
    green: { bgColor: '#dcfce7', color: '#15803d', label: 'Light Green Fill with Dark Green Text' },
    red: { bgColor: '#fee2e2', color: '#b91c1c', label: 'Light Red Fill with Dark Red Text' },
    yellow: { bgColor: '#fef9c3', color: '#a16207', label: 'Light Yellow Fill with Dark Yellow Text' },
    blue: { bgColor: '#e0f2fe', color: '#0369a1', label: 'Light Blue Fill with Dark Blue Text' }
  };

  const handleCreateRule = () => {
    const selectedPreset = presets[formatPreset];
    const rule: ConditionalFormatRule = {
      id: generateId('cf'),
      range: { ...selectionRange },
      type: 'cellValue',
      operator,
      values: operator === 'between' ? [Number(val1), Number(val2)] : [Number(val1)],
      style: {
        bgColor: selectedPreset.bgColor,
        color: selectedPreset.color,
        bold: true
      }
    };

    onAddRule(rule);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Conditional Formatting" width="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        <div style={{ color: 'var(--gf-color-text-secondary)' }}>
          Format cells that meet the condition:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Condition:</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as any)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="greaterThan">Greater than (&gt;)</option>
              <option value="lessThan">Less than (&lt;)</option>
              <option value="equal">Equal to (=)</option>
              <option value="between">Between</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Value:</label>
            <input
              type="number"
              value={val1}
              onChange={(e) => setVal1(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            />
            {operator === 'between' && (
              <>
                <span style={{ margin: '0 8px' }}>and</span>
                <input
                  type="number"
                  value={val2}
                  onChange={(e) => setVal2(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--gf-color-border-default)',
                    backgroundColor: 'var(--gf-color-surface-background)',
                    color: 'var(--gf-color-text-primary)'
                  }}
                />
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Formatting:</label>
            <select
              value={formatPreset}
              onChange={(e) => setFormatPreset(e.target.value as any)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="green">Light Green Fill with Dark Green Text</option>
              <option value="red">Light Red Fill with Dark Red Text</option>
              <option value="yellow">Light Yellow Fill with Dark Yellow Text</option>
              <option value="blue">Light Blue Fill with Dark Blue Text</option>
            </select>
          </div>
        </div>

        {/* Live Preview Chip */}
        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)' }}>Preview:</span>
          <div
            style={{
              marginTop: '4px',
              padding: '8px 12px',
              borderRadius: '4px',
              backgroundColor: presets[formatPreset].bgColor,
              color: presets[formatPreset].color,
              fontWeight: 700,
              display: 'inline-block',
              border: `1px solid ${presets[formatPreset].color}33`
            }}
          >
            Formatted Cell Sample
          </div>
        </div>

        {/* Existing Rules List */}
        {sheet.conditionalFormats.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--gf-color-border-default)', paddingTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Existing Rules on Sheet:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
              {sheet.conditionalFormats.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    backgroundColor: 'var(--gf-color-surface-panel)',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <span>
                    Cell {rule.operator} {rule.values?.join(' & ')}
                  </span>
                  <button
                    onClick={() => onRemoveRule(rule.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gf-color-status-danger)' }}
                    title="Delete rule"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleCreateRule}>
            Add Rule
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
