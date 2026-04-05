import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Enter username and password');
      return;
    }

    const success = await window.api.login(username.trim(), password);
    if (success) {
      onLogin();
    } else {
      setError('Invalid username or password');
      setPassword('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }} onKeyDown={handleKeyDown}>
        <h1 style={{ color: 'var(--accent)', fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>Ledger</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginBottom: '32px' }}>Enter credentials to continue</p>

        {error && (
          <div style={{ background: '#3a1a1a', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Username</label>
          <input ref={usernameRef} className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} style={{ width: '100%', marginTop: '16px', padding: '10px' }}>
          Login (Enter)
        </button>
      </div>
    </div>
  );
}
