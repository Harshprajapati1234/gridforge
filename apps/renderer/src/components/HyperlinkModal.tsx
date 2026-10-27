import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';

export interface HyperlinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl?: string;
  onSave: (url: string) => void;
  onRemove: () => void;
}

export const HyperlinkModal: React.FC<HyperlinkModalProps> = ({
  isOpen,
  onClose,
  currentUrl = '',
  onSave,
  onRemove
}) => {
  const [url, setUrl] = useState(currentUrl);

  const handleSave = () => {
    let clean = url.trim();
    if (clean && !/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean;
    }
    onSave(clean);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Insert Hyperlink" width="400px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: '80px', color: 'var(--gf-color-text-secondary)' }}>Address:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          {currentUrl ? (
            <Button size="sm" variant="danger" onClick={() => { onRemove(); onClose(); }}>
              Remove Link
            </Button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave}>
              Save Link
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
