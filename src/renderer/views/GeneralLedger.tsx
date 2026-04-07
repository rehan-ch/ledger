import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SearchSelect } from '../components/SearchSelect';
import { exportToExcel } from '../utils/exportExcel';
import type { Account, LedgerEntry } from '../../shared/types';

function buildAccountTree(accounts: Account[]): { account: Account; depth: number }[] {
  const result: { account: Account; depth: number }[] = [];
  const childrenMap = new Map<number | null, Account[]>();
  for (const account of accounts) {
    const pid = account.parent_id;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(account);
  }
  function add(parentId: number | null, depth: number) {
    for (const child of childrenMap.get(parentId) || []) {
      result.push({ account: child, depth });
      add(child.id, depth + 1);
    }
  }
  add(null, 0);
  return result;
}

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function GeneralLedger({ showToast }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [ledgerData, setLedgerData] = useState<Record<number, { account: Account; entries: LedgerEntry[]; openingBalance: number; closingBalance: number }>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const accountSearchRef = useRef<HTMLDivElement>(null);

  const loadAccounts = useCallback(async () => {
    const accts = await window.api.getAccounts();
    setAccounts(accts);
  }, []);

  const loadLedger = useCallback(async () => {
    const filters: any = {};
    if (selectedAccountId) filters.accountId = selectedAccountId;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    const data = await window.api.getGeneralLedger(Object.keys(filters).length > 0 ? filters : undefined);
    setLedgerData(data);
  }, [selectedAccountId, fromDate, toDate]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadLedger(); }, [loadLedger]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        handleExport();
        return;
      }
      // / = focus account search, f = focus from date, t = focus to date
      if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        if (e.key === '/') {
          e.preventDefault();
          const input = accountSearchRef.current?.querySelector('input') as HTMLInputElement;
          input?.focus();
          return;
        }
        if (e.key === 'f') {
          e.preventDefault();
          fromRef.current?.focus();
          return;
        }
        if (e.key === 't') {
          e.preventDefault();
          toRef.current?.focus();
          return;
        }
      }
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      const allEntries = currentEntries();
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, allEntries.length - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedAccountId(undefined);
          setFromDate('');
          setToDate('');
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
  const currentData = selectedAccountId ? ledgerData[selectedAccountId] : null;
  const entries = currentEntries();

  const handleExport = () => {
    const rows: any[] = [];
    if (currentData && currentAccount) {
      // Single account: include opening and closing
      if (fromDate) rows.push({ Account: currentAccount.name, 'Voucher #': '', Date: '', Description: 'Opening Balance', User: '', Debit: '', Credit: '', Balance: currentData.openingBalance.toFixed(2) });
      entries.forEach(entry => {
        rows.push({ Account: currentAccount.name, 'Voucher #': entry.voucher_id, Date: entry.date, Description: entry.description, User: entry.user_name || '', Debit: entry.debit || '', Credit: entry.credit || '', Balance: entry.running_balance.toFixed(2) });
      });
      rows.push({ Account: currentAccount.name, 'Voucher #': '', Date: '', Description: 'Closing Balance', User: '', Debit: '', Credit: '', Balance: currentData.closingBalance.toFixed(2) });
    } else {
      entries.forEach(entry => {
        const acctData = Object.values(ledgerData).find(d => d.entries.includes(entry));
        rows.push({ Account: acctData?.account.name || '', 'Voucher #': entry.voucher_id, Date: entry.date, Description: entry.description, User: entry.user_name || '', Debit: entry.debit || '', Credit: entry.credit || '', Balance: entry.running_balance.toFixed(2) });
      });
    }
    exportToExcel(rows, 'general-ledger.xlsx', 'Ledger');
  };

  return (
    <div>
      <div className="view-header">
        <h2>General Ledger</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleExport}>Export (Ctrl+E)</button>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account:</label>
          <div style={{ width: '280px' }} ref={accountSearchRef}>
            <SearchSelect
              value={selectedAccountId?.toString() || ''}
              onChange={val => { setSelectedAccountId(val ? parseInt(val) : undefined); setSelectedIndex(0); }}
              options={[
                { value: '', label: 'All Accounts' },
                ...buildAccountTree(accounts).map(({ account: a, depth }) => ({
                  value: a.id.toString(),
                  label: `${'  '.repeat(depth)}${depth > 0 ? '└ ' : ''}${a.code} - ${a.name}`,
                })),
              ]}
              placeholder="Search account..."
            />
          </div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From (f):</label>
          <input ref={fromRef} className="form-input" type="date" style={{ width: '150px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setFromDate(''); fromRef.current?.blur(); } }} />
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To (t):</label>
          <input ref={toRef} className="form-input" type="date" style={{ width: '150px' }} value={toDate} onChange={e => setToDate(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setToDate(''); toRef.current?.blur(); } }} />
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
            <th>User / Party</th>
            <th className="amount">Debit</th>
            <th className="amount">Credit</th>
            <th className="amount">Balance</th>
          </tr>
        </thead>
        <tbody>
          {/* Opening Balance row (only when single account is selected) */}
          {currentData && selectedAccountId && (
            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
              <td></td>
              <td></td>
              <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Opening Balance</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="amount" style={{ fontWeight: 700, color: 'var(--accent)' }}>{currentData.openingBalance.toFixed(2)}</td>
            </tr>
          )}

          {entries.map((entry, i) => (
            <tr key={`${entry.transaction_id}-${i}`} className={i === selectedIndex ? 'selected' : ''}>
              {!selectedAccountId && <td>{
                Object.values(ledgerData).find(d => d.entries.includes(entry))?.account.name || ''
              }</td>}
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>{entry.voucher_id}</td>
              <td>{entry.date}</td>
              <td>{entry.description}</td>
              <td style={{ color: entry.user_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>{entry.user_name || '-'}</td>
              <td className="amount debit">{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
              <td className="amount credit">{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
              <td className="amount" style={{ fontWeight: 600 }}>{entry.running_balance.toFixed(2)}</td>
            </tr>
          ))}

          {entries.length === 0 && !currentData && (
            <tr><td colSpan={selectedAccountId ? 7 : 8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No ledger entries found.
            </td></tr>
          )}
        </tbody>

        {/* Closing Balance footer (only when single account is selected) */}
        {currentData && selectedAccountId && (
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td></td>
              <td></td>
              <td style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Closing Balance</td>
              <td></td>
              <td></td>
              <td></td>
              <td className="amount" style={{ fontWeight: 700, color: currentData.closingBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {currentData.closingBalance.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
