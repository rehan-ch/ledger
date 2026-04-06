import React from 'react';

interface Props {
  view: string;
}

export function StatusBar({ view }: Props) {
  const hints: Record<string, string> = {
    dashboard: 'Overview of accounts, transactions, and financial summaries',
    accounts: 'n: New | Enter/e: Edit | d: Delete | j/k: Navigate',
    journal: 'n: New | Enter: Expand | d: Delete | j/k: Navigate | Ctrl+Enter: Save | Ctrl+A: Add line',
    ledger: 'j/k: Navigate | /: Filter account | Esc: Clear filter',
    'trial-balance': 'j/k: Navigate | /: Set date | Esc: Clear',
    currencies: 'n: New | Enter: Edit rate | j/k: Navigate',
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
