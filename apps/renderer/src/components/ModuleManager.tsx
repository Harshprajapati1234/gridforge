import React from 'react';
import { Button, Badge, Switch, Dialog } from '@gridforge/ui-kit';
import { ModuleInfo } from '../types/electron';
import { LogViewerModal } from './LogViewerModal';

export const ModuleManager: React.FC<{
  isOpen: boolean; onClose: () => void; modules: ModuleInfo[]; onRefresh: () => void;
}> = ({ isOpen, onClose, modules, onRefresh }) => {
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null);
  const [healthStatus, setHealthStatus] = React.useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [devMode, setDevMode] = React.useState(false);
  const [installPath, setInstallPath] = React.useState('');
  const [showInstall, setShowInstall] = React.useState(false);
  const [rollbackVersions, setRollbackVersions] = React.useState<{ moduleId: string; versions: string[] } | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (m: ModuleInfo) => {
    if (m.status === 'running') await window.gridForge?.disableModule(m.id);
    else await window.gridForge?.enableModule(m.id);
    onRefresh();
  };

  const handleCheckHealth = async (m: ModuleInfo) => {
    const res = await window.gridForge?.checkModuleHealth(m.id);
    setHealthStatus({ id: m.id, msg: res?.message || (res?.ok ? 'Healthy' : 'Error detected'), ok: !!res?.ok });
  };

  const handleRollback = async (m: ModuleInfo) => {
    const v = await window.gridForge?.listModuleArchives(m.id);
    setRollbackVersions({ moduleId: m.id, versions: v || [] });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '780px', maxHeight: '85vh', backgroundColor: 'var(--gf-color-surface-panel)',
        borderRadius: 'var(--gf-border-radius-lg)', boxShadow: 'var(--gf-elevation-shadow-lg)',
        border: '1px solid var(--gf-color-border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--gf-color-border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--gf-color-surface-header)'
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Modules & Plug-ins</h2>
            <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>Independent, hot-swappable plugins.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span>Developer mode</span>
              <Switch checked={devMode} onChange={setDevMode} />
            </div>
            <Button size="sm" variant="primary" onClick={() => setShowInstall(true)}>+ Install Module...</Button>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
        </div>

        {healthStatus && (
          <div style={{
            padding: '8px 20px', backgroundColor: healthStatus.ok ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
            display: 'flex', justifyContent: 'space-between', fontSize: '12px'
          }}>
            <span><strong>Health:</strong> {healthStatus.msg}</span>
            <Button size="sm" variant="ghost" onClick={() => setHealthStatus(null)}>Dismiss</Button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {modules.map((mod) => (
            <div key={mod.id} style={{
              border: '1px solid var(--gf-color-border-default)', borderRadius: '6px', padding: '12px',
              backgroundColor: 'var(--gf-color-surface-background)', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{mod.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)' }}>v{mod.version}</span>
                    <Badge variant={mod.status === 'running' ? 'success' : mod.status === 'error' ? 'error' : 'default'}>{mod.status}</Badge>
                    {mod.isBuiltIn && <Badge variant="info">Built-in</Badge>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)', marginTop: '4px' }}>{mod.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button size="sm" variant={mod.status === 'running' ? 'secondary' : 'primary'} onClick={() => handleToggle(mod)}>
                    {mod.status === 'running' ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.gridForge?.restartModule(mod.id).then(onRefresh)}>Restart</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleCheckHealth(mod)}>Health Check</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRollback(mod)}>Rollback</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveLogId(mod.id)}>Logs</Button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)', borderTop: '1px solid var(--gf-color-border-muted)', paddingTop: '6px' }}>
                Permissions: {mod.permissions?.join(', ') || 'None'}
                {mod.errorReason && <span style={{ color: 'var(--gf-color-status-error)', marginLeft: '12px' }}>{mod.errorReason}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px' }}>{modules.length} modules loaded</span>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>

      {activeLogId && <LogViewerModal moduleId={activeLogId} onClose={() => setActiveLogId(null)} />}
    </div>
  );
};
