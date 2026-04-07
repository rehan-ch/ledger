import React, { useState, useEffect, useCallback } from 'react';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function Settings({ showToast }: Props) {
  const [backupPath, setBackupPath] = useState('');
  const [machineId, setMachineId] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');

  const loadData = useCallback(async () => {
    const [bp, mid, ls] = await Promise.all([
      window.api.getSetting('backup_path'),
      window.api.getMachineId(),
      window.api.getLicenseStatus(),
    ]);
    setBackupPath(bp || '');
    setMachineId(mid);
    setLicenseStatus(ls);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleChangeBackupPath = async () => {
    const folder = await window.api.selectFolder();
    if (folder) {
      await window.api.setSetting('backup_path', folder);
      setBackupPath(folder);
      showToast(`Backup path updated to: ${folder}`, 'success');
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) { showToast('Enter a license key', 'error'); return; }
    const result = await window.api.activateLicense(licenseKey.trim());
    if (result.success) {
      showToast(`License activated until ${result.expiryDate}`, 'success');
      setLicenseKey('');
      loadData();
    } else {
      showToast(result.error || 'Invalid key', 'error');
    }
  };

  const statusColors: Record<string, string> = {
    trial_active: 'var(--success)',
    licensed: 'var(--accent)',
    trial_expired: 'var(--danger)',
    license_expired: 'var(--danger)',
  };

  const statusLabels: Record<string, string> = {
    trial_active: 'Trial Active',
    licensed: 'Licensed',
    trial_expired: 'Trial Expired',
    license_expired: 'License Expired',
  };

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Settings</h2>

      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Backup Path */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px' }}>Backup</h3>
          <div className="form-group">
            <label>Backup Folder</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input className="form-input" value={backupPath} readOnly style={{ flex: 1, color: 'var(--text-muted)' }} />
              <button className="btn" onClick={handleChangeBackupPath}>Change...</button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Real-time sync + daily backups saved here
            </span>
          </div>
        </div>

        {/* License Info */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px' }}>License</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Machine ID</span>
              <span style={{ userSelect: 'all' }}>{machineId}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Status</span>
              <span style={{ color: statusColors[licenseStatus?.status] || 'var(--text-muted)' }}>
                {statusLabels[licenseStatus?.status] || licenseStatus?.status || 'Unknown'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Expires</span>
              <span>{licenseStatus?.expiryDate || '-'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Days Remaining</span>
              <span style={{ color: (licenseStatus?.daysRemaining || 0) <= 7 ? 'var(--warning)' : 'var(--text-primary)' }}>
                {licenseStatus?.daysRemaining ?? '-'}
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Activate License Key</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}
                onKeyDown={e => { if (e.key === 'Enter') handleActivate(); }}
              />
              <button className="btn btn-primary" onClick={handleActivate}>Activate</button>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '12px' }}>About</h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <div><strong>Ledger</strong> — Double Entry Accounting</div>
            <div>Version: 1.1.1</div>
            <div>Built by: codeminer05@gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
