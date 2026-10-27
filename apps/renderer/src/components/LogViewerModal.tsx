import React from 'react';
import { Dialog } from '@gridforge/ui-kit';

export const LogViewerModal: React.FC<{ moduleId: string | null; onClose: () => void }> = ({ moduleId, onClose }) => {
  const [logs, setLogs] = React.useState('Loading logs...');
  React.useEffect(() => {
    if (!moduleId) return;
    if (window.gridForge?.readModuleLogs) {
      window.gridForge.readModuleLogs(moduleId).then((res) => setLogs(res || '(No logs recorded)'));
    } else {
      setLogs('(Preview mode: logs stored in ~/Library/Logs/GridForge/modules/)');
    }
  }, [moduleId]);

  if (!moduleId) return null;
  return (
    <Dialog isOpen={Boolean(moduleId)} title={`Logs: ${moduleId}`} details={logs} onClose={onClose}>
      <p>Log location: <code>~/Library/Logs/GridForge/modules/{moduleId}.log</code></p>
    </Dialog>
  );
};
