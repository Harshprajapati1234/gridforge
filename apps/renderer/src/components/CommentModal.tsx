import React, { useState } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';

export interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingComment?: { author: string; timestamp: number; text: string };
  onSave: (text: string) => void;
  onDelete: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  existingComment,
  onSave,
  onDelete
}) => {
  const [text, setText] = useState(existingComment?.text || '');

  const handleSave = () => {
    onSave(text.trim());
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={existingComment ? 'Edit Note / Comment' : 'Add Note / Comment'} width="400px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        {existingComment && (
          <div style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)' }}>
            Author: <strong>{existingComment.author}</strong> • {new Date(existingComment.timestamp).toLocaleString()}
          </div>
        )}

        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your comment or note here..."
          autoFocus
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--gf-color-border-default)',
            backgroundColor: 'var(--gf-color-surface-background)',
            color: 'var(--gf-color-text-primary)',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          {existingComment ? (
            <Button size="sm" variant="danger" onClick={() => { onDelete(); onClose(); }}>
              Delete Note
            </Button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={!text.trim()}>
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
