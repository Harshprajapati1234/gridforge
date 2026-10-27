import React from 'react';
import { Button, Badge, Switch, Dialog } from '@gridforge/ui-kit';
import { ModuleInfo, ManifestInspectionResult } from '../types/electron';
import { LogViewerModal } from './LogViewerModal';

export const ModuleManager: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  modules: ModuleInfo[];
  onRefresh: () => void;
}> = ({ isOpen, onClose, modules, onRefresh }) => {
  const [activeLogId, setActiveLogId] = React.useState<string | null>(null);
  const [healthStatus, setHealthStatus] = React.useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [devMode, setDevMode] = React.useState(false);

  // Install & Update state
  const [showInstallPicker, setShowInstallPicker] = React.useState(false);
  const [manualPath, setManualPath] = React.useState('');
  const [inspectedModule, setInspectedModule] = React.useState<ManifestInspectionResult | null>(null);
  const [isInstalling, setIsInstalling] = React.useState(false);
  const [installError, setInstallError] = React.useState<string | null>(null);

  // Rollback state
  const [rollbackVersions, setRollbackVersions] = React.useState<{ moduleId: string; versions: string[] } | null>(null);
  const [selectedRollbackVersion, setSelectedRollbackVersion] = React.useState<string>('');

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

  const handleOpenRollback = async (m: ModuleInfo) => {
    const v = await window.gridForge?.listModuleArchives(m.id);
    if (!v || v.length === 0) {
      alert(`No archived versions found for module "${m.name}".`);
      return;
    }
    setRollbackVersions({ moduleId: m.id, versions: v });
    setSelectedRollbackVersion(v[v.length - 1]);
  };

  const handleConfirmRollback = async () => {
    if (!rollbackVersions || !selectedRollbackVersion) return;
    const ok = await window.gridForge?.rollbackModule(rollbackVersions.moduleId, selectedRollbackVersion);
    if (ok) {
      setRollbackVersions(null);
      onRefresh();
    } else {
      alert('Rollback failed. Check module logs for details.');
    }
  };

  const handleRemove = async (m: ModuleInfo) => {
    if (m.isBuiltIn) {
      alert('Built-in modules cannot be removed.');
      return;
    }
    const confirmed = confirm(`Are you sure you want to remove "${m.name}"? This will delete the module files.`);
    if (!confirmed) return;
    try {
      await window.gridForge?.removeModule(m.id);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to remove module: ${err.message}`);
    }
  };

  const handlePickFolderForInstall = async () => {
    setInstallError(null);
    const chosen = await window.gridForge?.pickModulePathDialog();
    if (!chosen) return;
    await inspectAndShowConfirmation(chosen);
  };

  const handleInspectManualPath = async () => {
    if (!manualPath.trim()) return;
    setInstallError(null);
    await inspectAndShowConfirmation(manualPath.trim());
  };

  const inspectAndShowConfirmation = async (targetPath: string) => {
    try {
      const res = await window.gridForge?.inspectModulePath(targetPath);
      if (!res || !res.valid) {
        setInstallError(res?.errors?.join(', ') || 'Folder does not contain a valid module.json.');
        return;
      }
      setInspectedModule(res);
      setShowInstallPicker(false);
    } catch (err: any) {
      setInstallError(err.message);
    }
  };

  const handleConfirmInstall = async () => {
    if (!inspectedModule?.sourcePath) return;
    setIsInstalling(true);
    try {
      await window.gridForge?.installModulePath(inspectedModule.sourcePath);
      setInspectedModule(null);
      setIsInstalling(false);
      onRefresh();
    } catch (err: any) {
      setIsInstalling(false);
      alert(`Installation failed: ${err.message}`);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '840px', maxHeight: '85vh', backgroundColor: 'var(--gf-color-surface-panel)',
        borderRadius: 'var(--gf-border-radius-lg)', boxShadow: 'var(--gf-elevation-shadow-lg)',
        border: '1px solid var(--gf-color-border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--gf-color-border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--gf-color-surface-header)'
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Modules & Plug-ins</h2>
            <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>Isolated, hot-swappable plugins with permission enforcement.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <span>Developer mode</span>
              <Switch checked={devMode} onChange={setDevMode} />
            </div>
            <Button size="sm" variant="primary" onClick={() => setShowInstallPicker(true)}>+ Install Module...</Button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{mod.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)' }}>v{mod.version}</span>
                    <Badge variant={mod.status === 'running' ? 'success' : mod.status === 'error' ? 'error' : 'default'}>{mod.status}</Badge>
                    {mod.isBuiltIn && <Badge variant="info">Built-in</Badge>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)', marginTop: '4px' }}>{mod.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Button size="sm" variant={mod.status === 'running' ? 'secondary' : 'primary'} onClick={() => handleToggle(mod)}>
                    {mod.status === 'running' ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.gridForge?.restartModule(mod.id).then(onRefresh)}>Restart</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleCheckHealth(mod)}>Check Health</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenRollback(mod)}>Rollback</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveLogId(mod.id)}>Show Logs</Button>
                  {!mod.isBuiltIn && (
                    <Button size="sm" variant="danger" onClick={() => handleRemove(mod)}>Remove</Button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gf-color-text-muted)', borderTop: '1px solid var(--gf-color-border-muted)', paddingTop: '6px' }}>
                Permissions: <strong>{mod.permissions?.join(', ') || 'None'}</strong>
                {mod.errorReason && (
                  <span style={{ color: 'var(--gf-color-status-error)', marginLeft: '12px', fontWeight: 600 }}>
                    Error: {mod.errorReason}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gf-color-border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>{modules.length} modules registered</span>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>

      {/* Install Source Picker Modal */}
      {showInstallPicker && (
        <Dialog isOpen={showInstallPicker} onClose={() => setShowInstallPicker(false)} title="Install New Module" width="500px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <p style={{ color: 'var(--gf-color-text-secondary)' }}>
              Choose a module folder or directory containing a valid <code>module.json</code> manifest:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="primary" onClick={handlePickFolderForInstall}>
                📁 Browse Folder...
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>Or enter absolute path:</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  placeholder="/path/to/my-module"
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: '4px',
                    border: '1px solid var(--gf-color-border-default)',
                    backgroundColor: 'var(--gf-color-surface-background)',
                    color: 'var(--gf-color-text-primary)'
                  }}
                />
                <Button size="sm" variant="secondary" onClick={handleInspectManualPath}>Inspect</Button>
              </div>
            </div>

            {installError && (
              <div style={{ padding: '8px', borderRadius: '4px', backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--gf-color-status-error)', fontSize: '12px' }}>
                {installError}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Permissions Confirmation Modal */}
      {inspectedModule && (
        <Dialog isOpen={!!inspectedModule} onClose={() => setInspectedModule(null)} title="Confirm Module Installation" width="520px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{inspectedModule.manifest?.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--gf-color-text-secondary)' }}>
                Version {inspectedModule.manifest?.version} by {inspectedModule.manifest?.author}
              </p>
              <p style={{ fontSize: '12px', marginTop: '6px' }}>{inspectedModule.manifest?.description}</p>
            </div>

            <div style={{ padding: '10px', backgroundColor: 'var(--gf-color-surface-background)', borderRadius: '6px', border: '1px solid var(--gf-color-border-default)' }}>
              <strong style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>Requested Permissions:</strong>
              {inspectedModule.manifest?.permissions && inspectedModule.manifest.permissions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {inspectedModule.manifest.permissions.map((p) => (
                    <Badge key={p} variant="warning">{p}</Badge>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--gf-color-text-muted)' }}>No special permissions requested.</span>
              )}
            </div>

            <p style={{ fontSize: '11px', color: 'var(--gf-color-text-secondary)' }}>
              Installing will copy the module into your GridForge user modules directory and run it in an isolated worker thread.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button size="sm" variant="secondary" onClick={() => setInspectedModule(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleConfirmInstall} disabled={isInstalling}>
                {isInstalling ? 'Installing...' : 'Confirm & Install'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Rollback Version Picker Modal */}
      {rollbackVersions && (
        <Dialog isOpen={!!rollbackVersions} onClose={() => setRollbackVersions(null)} title="Roll Back Module Version" width="450px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <p>Select a previously archived version of <strong>{rollbackVersions.moduleId}</strong> to restore:</p>
            <select
              value={selectedRollbackVersion}
              onChange={(e) => setSelectedRollbackVersion(e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: '4px',
                border: '1px solid var(--gf-color-border-default)',
                backgroundColor: 'var(--gf-color-surface-background)',
                color: 'var(--gf-color-text-primary)'
              }}
            >
              {rollbackVersions.versions.map((ver) => (
                <option key={ver} value={ver}>Version {ver}</option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button size="sm" variant="secondary" onClick={() => setRollbackVersions(null)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={handleConfirmRollback}>Restore Version</Button>
            </div>
          </div>
        </Dialog>
      )}

      {activeLogId && <LogViewerModal moduleId={activeLogId} onClose={() => setActiveLogId(null)} />}
    </div>
  );
};
