import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel, DataValidationRule } from '@gridforge/core';
import { generateId } from '@gridforge/shared';

export interface DataValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number };
  onAddValidation: (rule: DataValidationRule) => void;
  onRemoveValidation: (ruleId: string) => void;
}

export const DataValidationModal: React.FC<DataValidationModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selectionRange,
  onAddValidation,
  onRemoveValidation
}) => {
  const [type, setType] = useState<'list' | 'wholeNumber' | 'decimal' | 'textLength'>('list');
  const [listValues, setListValues] = useState('Pending, Approved, In Review, Rejected');
  const [operator, setOperator] = useState<'between' | 'greaterThan' | 'lessThan' | 'equal'>('between');
  const [minVal, setMinVal] = useState('1');
  const [maxVal, setMaxVal] = useState('100');
  const [errorStyle, setErrorStyle] = useState<'stop' | 'warning' | 'info'>('stop');
  const [errorMessage, setErrorMessage] = useState('The value entered violates data validation restrictions.');

  const handleApply = () => {
    const rule: DataValidationRule = {
      id: generateId('dv'),
      range: { ...selectionRange },
      type,
      operator: type === 'list' ? undefined : operator,
      values: type === 'list' ? undefined : (operator === 'between' ? [Number(minVal), Number(maxVal)] : [Number(minVal)]),
      listOptions: type === 'list' ? listValues.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      errorStyle,
      errorMessage
    };

    onAddValidation(rule);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Data Validation" width="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        <div style={{ color: 'var(--gf-color-text-secondary)' }}>
          Set criteria for valid entries in selected cells:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Allow:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="list">List (In-cell Dropdown)</option>
              <option value="wholeNumber">Whole Number</option>
              <option value="decimal">Decimal</option>
              <option value="textLength">Text Length</option>
            </select>
          </div>

          {type === 'list' ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Source:</label>
              <input
                type="text"
                value={listValues}
                onChange={(e) => setListValues(e.target.value)}
                placeholder="Option 1, Option 2, Option 3..."
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--gf-color-border-default)',
                  backgroundColor: 'var(--gf-color-surface-background)',
                  color: 'var(--gf-color-text-primary)'
                }}
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Data:</label>
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
                  <option value="between">between</option>
                  <option value="greaterThan">greater than</option>
                  <option value="lessThan">less than</option>
                  <option value="equal">equal to</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Minimum:</label>
                <input
                  type="number"
                  value={minVal}
                  onChange={(e) => setMinVal(e.target.value)}
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
                      value={maxVal}
                      onChange={(e) => setMaxVal(e.target.value)}
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
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Error Alert:</label>
            <select
              value={errorStyle}
              onChange={(e) => setErrorStyle(e.target.value as any)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              <option value="stop">Stop (Block input)</option>
              <option value="warning">Warning</option>
              <option value="info">Information</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Error Msg:</label>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Existing Validations */}
        {sheet.dataValidations.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid var(--gf-color-border-default)', paddingTop: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Existing Validations:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '90px', overflowY: 'auto' }}>
              {sheet.dataValidations.map((rule) => (
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
                    {rule.type === 'list' ? `Dropdown: ${rule.listOptions?.join(', ')}` : `${rule.type} ${rule.operator}`}
                  </span>
                  <button
                    onClick={() => onRemoveValidation(rule.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gf-color-status-danger)' }}
                    title="Delete validation"
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
          <Button size="sm" variant="primary" onClick={handleApply}>
            Apply Validation
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
