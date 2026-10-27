import React, { useState, useEffect } from 'react';
import { Dialog, Button, Badge, Banner } from '@gridforge/ui-kit';
import { SheetModel, cellAddress } from '@gridforge/core';
import { generateId } from '@gridforge/shared';
export interface SkuResult {
  jobId: string;
  sku: string;
  status: 'ok' | 'notfound' | 'error';
  title?: string;
  imageLink?: string;
  productLink?: string;
  price?: number;
  stock?: string;
  rating?: number;
  msg?: string;
  reason?: string;
}

export interface FlipkartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SheetModel;
  selectionRange: { startRow: number; startCol: number; endRow: number; endCol: number };
  onCommitCell: (sheetId: string, r: number, c: number, rawVal: string, formula?: string) => void;
  onSetCellHyperlink?: (r: number, c: number, val: string, url: string) => void;
}

export const FlipkartModal: React.FC<FlipkartModalProps> = ({
  isOpen,
  onClose,
  sheet,
  selectionRange,
  onCommitCell
}) => {
  const { maxCol, maxRow } = sheet.getBounds();

  // Column options
  const availableCols = Array.from({ length: Math.max(maxCol + 4, 8) }, (_, i) => ({
    index: i,
    label: sheet.getCell(0, i)?.v ? `${String(sheet.getCell(0, i)?.v)} (${cellAddress(0, i).replace(/\d+/, '')})` : `Column ${cellAddress(0, i).replace(/\d+/, '')}`
  }));

  const [skuCol, setSkuCol] = useState(selectionRange.startCol);
  const [linkCol, setLinkCol] = useState(Math.min(selectionRange.startCol + 1, availableCols.length - 1));
  const [imgCol, setImgCol] = useState(Math.min(selectionRange.startCol + 2, availableCols.length - 1));
  const [titleCol, setTitleCol] = useState(Math.min(selectionRange.startCol + 3, availableCols.length - 1));

  const [startRow, setStartRow] = useState(Math.max(1, selectionRange.startRow));
  const [endRow, setEndRow] = useState(Math.max(selectionRange.endRow, 1));
  const [skipExisting, setSkipExisting] = useState(true);

  // Status & Progress state
  const [connectedClients, setConnectedClients] = useState(0);
  const [isPaired, setIsPaired] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [failedItems, setFailedItems] = useState<Array<{ row: number; sku: string; reason: string }>>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Check bridge status
  useEffect(() => {
    if (!isOpen) return;

    const checkStatus = async () => {
      if (window.gridForge?.getBridgeStatus) {
        const s = await window.gridForge.getBridgeStatus();
        setIsPaired(s.isPaired);
        setConnectedClients(s.clientCount);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Listen for real sku results from bridge
  useEffect(() => {
    if (!isOpen || !window.gridForge?.on) return;

    const unsub = window.gridForge.on('bridge:sku-result', (res: SkuResult) => {
      if (!res || (activeJobId && res.jobId !== activeJobId)) return;

      setProcessedCount((prev) => prev + 1);

      // Find which row this sku belongs to
      for (let r = startRow; r <= endRow; r++) {
        const cell = sheet.getCell(r, skuCol);
        const cellVal = String(cell?.v ?? '').trim();
        if (cellVal === res.sku || cellVal.includes(res.sku)) {
          if (res.status === 'ok') {
            if (res.productLink) {
              onCommitCell(sheet.id, r, linkCol, res.productLink);
              const existing = sheet.getCell(r, linkCol);
              sheet.setCell(r, linkCol, { ...(existing || {}), v: res.productLink, hyperlink: res.productLink });
            }
            if (res.imageLink) {
              onCommitCell(sheet.id, r, imgCol, res.imageLink);
              const existing = sheet.getCell(r, imgCol);
              sheet.setCell(r, imgCol, { ...(existing || {}), v: res.imageLink, hyperlink: res.imageLink });
            }
            if (res.title) {
              onCommitCell(sheet.id, r, titleCol, res.title);
            }
          } else if (res.status === 'notfound') {
            const reason = res.msg || 'NOT FOUND on Flipkart Seller Hub';
            onCommitCell(sheet.id, r, linkCol, `NOT FOUND: ${reason}`);
            setFailedItems((prev) => [...prev, { row: r, sku: res.sku, reason }]);
          } else {
            const reason = res.msg || 'Lookup error';
            onCommitCell(sheet.id, r, linkCol, `ERROR: ${reason}`);
            setFailedItems((prev) => [...prev, { row: r, sku: res.sku, reason }]);
          }
          break;
        }
      }
    });

    return unsub;
  }, [isOpen, activeJobId, skuCol, linkCol, imgCol, titleCol, startRow, endRow, sheet]);

  // Start automation
  const handleStart = async () => {
    if (connectedClients === 0) {
      alert('Cannot start: No Chrome browser extension is connected to GridForge Bridge.');
      return;
    }

    const items: Array<{ sku: string; url?: string; row: number }> = [];

    for (let r = startRow; r <= endRow; r++) {
      const cell = sheet.getCell(r, skuCol);
      const val = String(cell?.v ?? '').trim();
      if (!val) continue;

      if (skipExisting) {
        const existingLink = sheet.getCell(r, linkCol);
        if (existingLink?.v && String(existingLink.v).trim().length > 0) {
          continue; // Skip already populated rows
        }
      }

      const isUrl = /^https?:\/\//i.test(val);
      const sku = isUrl ? (val.split('/').pop()?.split('?')[0] || val) : val;
      items.push({ sku, url: isUrl ? val : undefined, row: r });
    }

    if (items.length === 0) {
      alert('No SKUs found in the specified range (or all rows already have links).');
      return;
    }

    const jobId = generateId();
    setActiveJobId(jobId);
    setTotalItems(items.length);
    setProcessedCount(0);
    setFailedItems([]);
    setIsRunning(true);
    setStatusMessage(`Dispatched job with ${items.length} SKUs to connected Chrome extension...`);

    // Queue job via main process
    try {
      const api = window.gridForge as any;
      if (api?.executeModuleCommand) {
        await api.executeModuleCommand('flipkart-links', 'bridge:queue-job', {
          id: jobId,
          sheetName: sheet.name,
          items: items.map((i) => ({ sku: i.sku, url: i.url })),
          created: Date.now()
        });
      }
    } catch (err: any) {
      console.warn('Job queue warning:', err);
    }
  };

  const handleCancel = () => {
    setIsRunning(false);
    setActiveJobId(null);
    setStatusMessage('Automation cancelled by user.');
  };

  const handleRetryFailed = () => {
    if (failedItems.length === 0) return;
    handleStart();
  };

  return (
    <Dialog isOpen={isOpen} onClose={isRunning ? () => {} : onClose} title="Flipkart Seller Hub SKU Automator" width="620px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {/* Connection status banner */}
        {connectedClients === 0 ? (
          <div style={{
            padding: '10px 14px', backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid var(--gf-color-status-danger)', borderRadius: '6px',
            color: 'var(--gf-color-status-danger)', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>⚠️</span>
            <div>
              <strong>No Chrome extension connected!</strong>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                Open Flipkart Seller Hub in Chrome and connect to <code>127.0.0.1:47831</code> using the 6-digit Bridge PIN.
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '8px 12px', backgroundColor: 'rgba(22, 163, 74, 0.1)',
            border: '1px solid var(--gf-color-status-success)', borderRadius: '6px',
            color: 'var(--gf-color-status-success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span>✓ Connected to {connectedClients} active Chrome browser extension(s).</span>
            <Badge variant="success">Bridge Ready</Badge>
          </div>
        )}

        {/* Column Configuration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SKU Source Column:</label>
            <select
              value={skuCol}
              onChange={(e) => setSkuCol(Number(e.target.value))}
              disabled={isRunning}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Product Link Output:</label>
            <select
              value={linkCol}
              onChange={(e) => setLinkCol(Number(e.target.value))}
              disabled={isRunning}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Image Link Output:</label>
            <select
              value={imgCol}
              onChange={(e) => setImgCol(Number(e.target.value))}
              disabled={isRunning}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
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

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Title Output Column:</label>
            <select
              value={titleCol}
              onChange={(e) => setTitleCol(Number(e.target.value))}
              disabled={isRunning}
              style={{
                width: '100%', padding: '6px 8px', borderRadius: '4px',
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
        </div>

        {/* Row Range & Options */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '10px', backgroundColor: 'var(--gf-color-surface-panel)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px' }}>Rows:</label>
            <input
              type="number"
              min={1}
              value={startRow + 1}
              onChange={(e) => setStartRow(Math.max(0, Number(e.target.value) - 1))}
              disabled={isRunning}
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--gf-color-border-default)' }}
            />
            <span>to</span>
            <input
              type="number"
              min={startRow + 1}
              value={endRow + 1}
              onChange={(e) => setEndRow(Math.max(startRow, Number(e.target.value) - 1))}
              disabled={isRunning}
              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--gf-color-border-default)' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
              disabled={isRunning}
            />
            Don't overwrite existing links
          </label>
        </div>

        {/* Progress & Live status */}
        {isRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>Progress: {processedCount} / {totalItems} SKUs</span>
              <span>{Math.round((processedCount / (totalItems || 1)) * 100)}%</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--gf-color-border-default)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (processedCount / (totalItems || 1)) * 100)}%`,
                backgroundColor: 'var(--gf-color-interactive-primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gf-color-text-secondary)' }}>{statusMessage}</div>
          </div>
        )}

        {/* Failed items review */}
        {failedItems.length > 0 && (
          <div style={{
            maxHeight: '120px', overflowY: 'auto', padding: '8px',
            backgroundColor: 'rgba(220,38,38,0.06)', borderRadius: '6px', border: '1px solid rgba(220,38,38,0.2)'
          }}>
            <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--gf-color-status-danger)', marginBottom: '4px' }}>
              Not Found / Errors ({failedItems.length}):
            </div>
            {failedItems.map((f, i) => (
              <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Row {f.row + 1}: {f.sku}</span>
                <span style={{ color: 'var(--gf-color-status-danger)' }}>{f.reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <div>
            {failedItems.length > 0 && !isRunning && (
              <Button size="sm" variant="secondary" onClick={handleRetryFailed}>
                🔄 Retry Failed ({failedItems.length})
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isRunning ? (
              <Button size="sm" variant="danger" onClick={handleCancel}>Cancel</Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleStart}
                  disabled={connectedClients === 0}
                >
                  ⚡ Start Automation
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
