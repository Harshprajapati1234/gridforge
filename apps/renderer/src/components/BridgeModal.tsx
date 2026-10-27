import React, { useState, useEffect } from 'react';
import { Dialog, Button } from '@gridforge/ui-kit';

export interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BridgeModal: React.FC<BridgeModalProps> = ({ isOpen, onClose }) => {
  const [pin, setPin] = useState('------');
  const [remaining, setRemaining] = useState(0);
  const [isPaired, setIsPaired] = useState(false);
  const [clientCount, setClientCount] = useState(0);

  const refreshPin = async () => {
    if (window.gridForge?.getBridgePin) {
      const res = await window.gridForge.getBridgePin();
      setPin(res.pin);
      setRemaining(res.remainingSeconds);
    }
  };

  const refreshStatus = async () => {
    if (window.gridForge?.getBridgeStatus) {
      const res = await window.gridForge.getBridgeStatus();
      setIsPaired(res.isPaired);
      setClientCount(res.clientCount);
    }
  };

  const handleGenerateNew = async () => {
    if (window.gridForge?.generateBridgePin) {
      const newPin = await window.gridForge.generateBridgePin();
      setPin(newPin);
      setRemaining(600);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPin();
      refreshStatus();
      const interval = setInterval(() => {
        setRemaining((r) => Math.max(0, r - 1));
        refreshStatus();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pair Chrome Extension (Link-Sheet)" width="440px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
        {/* Status banner */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: isPaired ? 'rgba(22, 163, 74, 0.1)' : 'rgba(2, 132, 199, 0.1)',
            border: `1px solid ${isPaired ? 'var(--gf-color-status-success)' : 'var(--gf-color-border-focus)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isPaired ? 'var(--gf-color-status-success)' : '#eab308'
              }}
            />
            <span style={{ fontWeight: 600 }}>
              {isPaired ? 'Extension Paired' : 'Waiting for Pairing'}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--gf-color-text-secondary)' }}>
            {clientCount} connected client{clientCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* 6-Digit PIN display */}
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: 'var(--gf-color-surface-panel)',
            borderRadius: '8px',
            border: '1px solid var(--gf-color-border-default)'
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            One-Time Pairing Code
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 800,
              letterSpacing: '8px',
              fontFamily: 'var(--gf-font-font-family-mono)',
              color: 'var(--gf-color-interactive-primary)'
            }}
          >
            {pin}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gf-color-text-secondary)', marginTop: '8px' }}>
            Expires in {mins}:{secs < 10 ? `0${secs}` : secs}
          </div>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)', lineHeight: 1.5 }}>
          <ol style={{ paddingLeft: '18px', margin: 0 }}>
            <li>Open the <strong>Link-Sheet extension</strong> in Google Chrome.</li>
            <li>Click <strong>Pair with Desktop</strong>.</li>
            <li>Enter the 6-digit PIN shown above.</li>
          </ol>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <Button size="sm" variant="secondary" onClick={handleGenerateNew}>
            Generate New PIN
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
