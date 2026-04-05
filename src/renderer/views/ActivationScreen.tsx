import React, { useState, useEffect } from 'react';

interface Props {
  machineId: string;
  status: 'trial_expired' | 'license_expired';
  expiryDate: string;
  onActivated: () => void;
}

export function ActivationScreen({ machineId, status, expiryDate, onActivated }: Props) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!key.trim()) { setError('Please enter a license key'); return; }

    const result = await window.api.activateLicense(key.trim());
    if (result.success) {
      onActivated();
    } else {
      setError(result.error || 'Invalid license key');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onKeyDown={handleKeyDown}>
        <h1 style={{ color: 'var(--accent)', fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>Ledger</h1>
        <p style={{ color: 'var(--danger)', fontSize: '14px', textAlign: 'center', marginBottom: '24px', fontWeight: 600 }}>
          {status === 'trial_expired' ? 'Your free trial has expired' : 'Your license has expired'}
        </p>

        <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Machine ID:</span>
            <span style={{ color: 'var(--text-primary)', userSelect: 'all' }}>{machineId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Expired on:</span>
            <span style={{ color: 'var(--danger)' }}>{expiryDate}</span>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
          Please provide your Machine ID to the software provider to receive a license key.
        </p>

        {error && (
          <div style={{ background: '#3a1a1a', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>License Key</label>
          <input
            className="form-input"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'center', letterSpacing: '1px' }}
            autoFocus
          />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '12px', padding: '10px' }}>
          Activate (Enter)
        </button>
      </div>
    </div>
  );
}
