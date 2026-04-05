import React, { useState } from 'react';

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const [backupPath, setBackupPath] = useState('');
  const [error, setError] = useState('');

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder();
    if (folder) setBackupPath(folder);
  };

  const handleSubmit = async () => {
    setError('');
    if (!backupPath.trim()) { setError('Please select a backup folder'); return; }

    const result = await window.api.setup('', '', backupPath.trim());
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Setup failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onKeyDown={handleKeyDown}>
        <h1 style={{ color: 'var(--accent)', fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>Ledger</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '32px' }}>First Time Setup</p>

        {error && (
          <div style={{ background: '#3a1a1a', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Backup Folder</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="form-input"
              value={backupPath}
              placeholder="Select a folder..."
              style={{ flex: 1 }}
              readOnly
            />
            <button className="btn" onClick={handleSelectFolder} autoFocus style={{ whiteSpace: 'nowrap' }}>Browse...</button>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Database will be backed up here daily and synced in real-time
          </span>
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '16px', padding: '10px' }}>
          Complete Setup (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
}
