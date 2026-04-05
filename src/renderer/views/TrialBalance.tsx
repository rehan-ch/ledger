import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel } from '../utils/exportExcel';
import type { TrialBalanceRow } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function TrialBalance({ showToast }: Props) {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [asOfDate, setAsOfDate] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dateRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const filters: any = {};
    if (asOfDate) filters.date = asOfDate;
    const data = await window.api.getTrialBalance(Object.keys(filters).length > 0 ? filters : undefined);
    setRows(data);
  }, [asOfDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        exportToExcel(rows.map(r => ({ Code: r.account_code, Account: r.account_name, Type: r.account_type, Debits: r.debit_total, Credits: r.credit_total, Balance: r.balance })), 'trial-balance.xlsx', 'Trial Balance');
        return;
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        dateRef.current?.focus();
        return;
      }
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, rows.length - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Escape':
          e.preventDefault();
          setAsOfDate('');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rows]);

  const totalDebits = rows.reduce((sum, r) => sum + r.debit_total, 0);
  const totalCredits = rows.reduce((sum, r) => sum + r.credit_total, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005;

  return (
    <div>
      <div className="view-header">
        <h2>Trial Balance</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={() => exportToExcel(rows.map(r => ({ Code: r.account_code, Account: r.account_name, Type: r.account_type, Debits: r.debit_total, Credits: r.credit_total, Balance: r.balance })), 'trial-balance.xlsx', 'Trial Balance')}>
            Export (Ctrl+E)
          </button>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>As of:</label>
          <input
            ref={dateRef}
            className="form-input"
            type="date"
            style={{ width: '180px' }}
            value={asOfDate}
            onChange={e => setAsOfDate(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAsOfDate(''); dateRef.current?.blur(); } }}
            placeholder="Current"
          />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Account</th>
            <th>Type</th>
            <th className="amount">Debits</th>
            <th className="amount">Credits</th>
            <th className="amount">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.account_id} className={i === selectedIndex ? 'selected' : ''}>
              <td>{row.account_code}</td>
              <td>{row.account_name}</td>
              <td><span className={`badge ${row.account_type}`}>{row.account_type}</span></td>
              <td className="amount debit">{row.debit_total > 0 ? row.debit_total.toFixed(2) : ''}</td>
              <td className="amount credit">{row.credit_total > 0 ? row.credit_total.toFixed(2) : ''}</td>
              <td className="amount" style={{ fontWeight: 600 }}>{row.balance.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No data. Create accounts and transactions first.
            </td></tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
              <td colSpan={3} style={{ textAlign: 'right', padding: '8px 12px' }}>TOTALS</td>
              <td className="amount debit">{totalDebits.toFixed(2)}</td>
              <td className="amount credit">{totalCredits.toFixed(2)}</td>
              <td className="amount" style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)' }}>
                {isBalanced ? 'BALANCED' : (totalDebits - totalCredits).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
