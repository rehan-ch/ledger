import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel } from '../utils/exportExcel';
import type { Account, LedgerEntry } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function GeneralLedger({ showToast }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [ledgerData, setLedgerData] = useState<Record<number, { account: Account; entries: LedgerEntry[] }>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filterRef = useRef<HTMLSelectElement>(null);

  const loadAccounts = useCallback(async () => {
    const accts = await window.api.getAccounts();
    setAccounts(accts);
  }, []);

  const loadLedger = useCallback(async () => {
    const filters: any = {};
    if (selectedAccountId) filters.accountId = selectedAccountId;
    const data = await window.api.getGeneralLedger(Object.keys(filters).length > 0 ? filters : undefined);
    setLedgerData(data);
  }, [selectedAccountId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadLedger(); }, [loadLedger]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // / to focus account filter
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        const rows = currentEntries().map(entry => {
          const acctData = Object.values(ledgerData).find(d => d.entries.includes(entry));
          return { Account: acctData?.account.name || '', 'Voucher #': entry.voucher_id, Date: entry.date, Description: entry.description, Debit: entry.debit || '', Credit: entry.credit || '', Balance: entry.running_balance };
        });
        exportToExcel(rows, 'general-ledger.xlsx', 'Ledger');
        return;
      }
      if (e.key === '/' && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        filterRef.current?.focus();
        return;
      }
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      const entries = currentEntries();
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, entries.length - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedAccountId(undefined);
          setSelectedIndex(0);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ledgerData, selectedAccountId]);

  const currentEntries = (): LedgerEntry[] => {
    if (selectedAccountId && ledgerData[selectedAccountId]) {
      return ledgerData[selectedAccountId].entries;
    }
    return Object.values(ledgerData).flatMap(d => d.entries);
  };

  const currentAccount = selectedAccountId ? ledgerData[selectedAccountId]?.account : null;
  const entries = currentEntries();

  return (
    <div>
      <div className="view-header">
        <h2>General Ledger</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={() => {
            const rows = entries.map(entry => {
              const acctData = Object.values(ledgerData).find(d => d.entries.includes(entry));
              return { Account: acctData?.account.name || '', 'Voucher #': entry.voucher_id, Date: entry.date, Description: entry.description, Debit: entry.debit || '', Credit: entry.credit || '', Balance: entry.running_balance };
            });
            exportToExcel(rows, 'general-ledger.xlsx', 'Ledger');
          }}>
            Export (Ctrl+E)
          </button>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account:</label>
          <select
            ref={filterRef}
            className="form-select"
            style={{ width: '300px' }}
            value={selectedAccountId || ''}
            onChange={e => { setSelectedAccountId(e.target.value ? parseInt(e.target.value) : undefined); setSelectedIndex(0); }}
          >
            <option value="">All Accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
      </div>

      {currentAccount && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '4px', display: 'flex', gap: '16px', fontSize: '13px' }}>
          <span><strong>Account:</strong> {currentAccount.code} - {currentAccount.name}</span>
          <span><strong>Type:</strong> <span className={`badge ${currentAccount.type}`}>{currentAccount.type}</span></span>
          <span><strong>Currency:</strong> {currentAccount.currency_code}</span>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            {!selectedAccountId && <th>Account</th>}
            <th>Voucher #</th>
            <th>Date</th>
            <th>Description</th>
            <th className="amount">Debit</th>
            <th className="amount">Credit</th>
            <th className="amount">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={`${entry.transaction_id}-${i}`} className={i === selectedIndex ? 'selected' : ''}>
              {!selectedAccountId && <td>{
                Object.values(ledgerData).find(d => d.entries.includes(entry))?.account.name || ''
              }</td>}
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{entry.voucher_id}</td>
              <td>{entry.date}</td>
              <td>{entry.description}</td>
              <td className="amount debit">{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
              <td className="amount credit">{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
              <td className="amount" style={{ fontWeight: 600 }}>{entry.running_balance.toFixed(2)}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={selectedAccountId ? 6 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No ledger entries found.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
