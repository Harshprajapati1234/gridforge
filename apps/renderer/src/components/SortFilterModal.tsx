import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';
import { SheetModel, cellAddress, SortRule, FilterCriteria } from '@gridforge/core';

export interface SortFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  onApplySort: (rules: SortRule[]) => void;
  onApplyFilter: (col: number, criteria: FilterCriteria | null) => void;
  selectedCol?: number;
}

export const SortFilterModal: React.FC<SortFilterModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onApplySort,
  onApplyFilter,
  selectedCol = 0
}) => {
  const [activeTab, setActiveTab] = useState<'sort' | 'filter'>('sort');
  const [sortRules, setSortRules] = useState<SortRule[]>([{ col: selectedCol, ascending: true }]);
  const [filterCol, setFilterCol] = useState(selectedCol);
  const [filterOperator, setFilterOperator] = useState<'contains' | 'equals' | 'greaterThan' | 'lessThan'>('contains');
  const [filterText, setFilterText] = useState('');

  const { maxCol } = sheet.getBounds();
  const columns = Array.from({ length: Math.max(maxCol + 1, 10) }, (_, i) => ({
    index: i,
    label: `Column ${cellAddress(0, i).replace(/\d+/, '')} ${sheet.getCell(0, i)?.v ? `(${sheet.getCell(0, i)?.v})` : ''}`
  }));

  const handleAddSortLevel = () => {
    if (sortRules.length < 5) {
      setSortRules([...sortRules, { col: (sortRules[sortRules.length - 1].col + 1) % columns.length, ascending: true }]);
    }
  };

  const handleRemoveSortLevel = (idx: number) => {
    if (sortRules.length > 1) {
      setSortRules(sortRules.filter((_, i) => i !== idx));
    }
  };

  const handleApplySortClick = () => {
    onApplySort(sortRules);
    onClose();
  };

  const handleApplyFilterClick = () => {
    if (!filterText) {
      onApplyFilter(filterCol, null);
    } else if (filterOperator === 'greaterThan' || filterOperator === 'lessThan') {
      const num = Number(filterText);
      onApplyFilter(filterCol, {
        col: filterCol,
        numberFilter: { operator: filterOperator, value: isNaN(num) ? 0 : num }
      });
    } else {
      onApplyFilter(filterCol, {
        col: filterCol,
        textFilter: { operator: filterOperator, value: filterText }
      });
    }
    onClose();
  };

  const handleClearFilter = () => {
    onApplyFilter(filterCol, null);
    setFilterText('');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Sort & Filter" width="480px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gf-color-border-default)', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveTab('sort')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: activeTab === 'sort' ? 'var(--gf-color-interactive-primary)' : 'transparent',
              color: activeTab === 'sort' ? 'var(--gf-color-interactive-text)' : 'var(--gf-color-text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'sort' ? 600 : 400
            }}
          >
            Custom Sort
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: activeTab === 'filter' ? 'var(--gf-color-interactive-primary)' : 'transparent',
              color: activeTab === 'filter' ? 'var(--gf-color-interactive-text)' : 'var(--gf-color-text-secondary)',
              cursor: 'pointer',
              fontWeight: activeTab === 'filter' ? 600 : 400
            }}
          >
            Filter Column
          </button>
        </div>

        {activeTab === 'sort' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--gf-color-text-secondary)', fontSize: '12px' }}>
                Define sort hierarchy:
              </span>
              <Button size="sm" variant="secondary" onClick={handleAddSortLevel} disabled={sortRules.length >= 5}>
                + Add Level
              </Button>
            </div>

            {sortRules.map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ width: '60px', color: 'var(--gf-color-text-muted)', fontSize: '11px' }}>
                  {idx === 0 ? 'Sort by' : 'Then by'}
                </span>
                <select
                  value={rule.col}
                  onChange={(e) => {
                    const next = [...sortRules];
                    next[idx].col = Number(e.target.value);
                    setSortRules(next);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--gf-color-border-default)',
                    backgroundColor: 'var(--gf-color-surface-background)',
                    color: 'var(--gf-color-text-primary)'
                  }}
                >
                  {columns.map((c) => (
                    <option key={c.index} value={c.index}>{c.label}</option>
                  ))}
                </select>

                <select
                  value={rule.ascending ? 'asc' : 'desc'}
                  onChange={(e) => {
                    const next = [...sortRules];
                    next[idx].ascending = e.target.value === 'asc';
                    setSortRules(next);
                  }}
                  style={{
                    width: '130px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--gf-color-border-default)',
                    backgroundColor: 'var(--gf-color-surface-background)',
                    color: 'var(--gf-color-text-primary)'
                  }}
                >
                  <option value="asc">A to Z (Ascending)</option>
                  <option value="desc">Z to A (Descending)</option>
                </select>

                {sortRules.length > 1 && (
                  <button
                    onClick={() => handleRemoveSortLevel(idx)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--gf-color-status-danger)' }}
                    title="Remove level"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button size="sm" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleApplySortClick}>
                Apply Sort
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Column:</label>
              <select
                value={filterCol}
                onChange={(e) => setFilterCol(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--gf-color-border-default)',
                  backgroundColor: 'var(--gf-color-surface-background)',
                  color: 'var(--gf-color-text-primary)'
                }}
              >
                {columns.map((c) => (
                  <option key={c.index} value={c.index}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Condition:</label>
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--gf-color-border-default)',
                  backgroundColor: 'var(--gf-color-surface-background)',
                  color: 'var(--gf-color-text-primary)'
                }}
              >
                <option value="contains">Text contains</option>
                <option value="equals">Equals</option>
                <option value="greaterThan">Greater than (&gt;)</option>
                <option value="lessThan">Less than (&lt;)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '90px', color: 'var(--gf-color-text-secondary)' }}>Value:</label>
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Value to match..."
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <Button size="sm" variant="secondary" onClick={handleClearFilter}>
                Clear Filter
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleApplyFilterClick}>
                  Apply Filter
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
