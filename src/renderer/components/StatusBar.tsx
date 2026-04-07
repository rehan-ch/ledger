import React from 'react';

interface Props {
  view: string;
}

export function StatusBar({ view }: Props) {
  const hints: Record<string, string> = {
    dashboard: 'Overview of accounts, transactions, and financial summaries',
    accounts: 'n: New | Enter/e: Edit | d: Delete | j/k: Navigate',
    journal: 'n: New | Enter: Expand | d: Delete | j/k: Navigate | Ctrl+Enter: Save | Ctrl+A: Add line',
    ledger: 'j/k: Navigate | /: Account | f: From date | t: To date | Esc: Clear',
    'trial-balance': 'j/k: Navigate | /: Set date | Esc: Clear',
    'balance-sheet': '/: Set date | Esc: Clear | Ctrl+E: Export',
    'income-statement': '/: Set date range | Esc: Clear | Ctrl+E: Export',
    currencies: 'n: New | Enter: Edit rate | j/k: Navigate',
    settings: 'Change backup path, view license info',
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        <span>{view.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Built by codeminer05@gmail.com</span>
      </div>
      <div className="status-right">
        <span>{hints[view] || ''}</span>
      </div>
    </div>
  );
}
