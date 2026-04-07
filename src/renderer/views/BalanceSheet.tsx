import React, { useState, useEffect, useCallback, useRef } from 'react';
import { exportToExcel } from '../utils/exportExcel';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function BalanceSheet({ showToast }: Props) {
  const [asOfDate, setAsOfDate] = useState('');
  const [data, setData] = useState<any>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const result = await window.api.getBalanceSheet(asOfDate || undefined);
    setData(result);
  }, [asOfDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) { e.preventDefault(); handleExport(); return; }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); dateRef.current?.focus(); return; }
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') { e.preventDefault(); setAsOfDate(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    const rows: any[] = [];
    rows.push({ Section: 'BALANCE SHEET', Account: asOfDate ? `As of ${asOfDate}` : 'All Time', Amount: '' });
    rows.push({ Section: '', Account: '', Amount: '' });
    rows.push({ Section: 'ASSETS', Account: '', Amount: '' });
    data.assets.forEach((r: any) => rows.push({ Section: '', Account: `${r.account_code} - ${r.account_name}`, Amount: r.balance.toFixed(2) }));
    rows.push({ Section: '', Account: 'Total Assets', Amount: data.totalAssets.toFixed(2) });
    rows.push({ Section: '', Account: '', Amount: '' });
    rows.push({ Section: 'LIABILITIES', Account: '', Amount: '' });
    data.liabilities.forEach((r: any) => rows.push({ Section: '', Account: `${r.account_code} - ${r.account_name}`, Amount: r.balance.toFixed(2) }));
    rows.push({ Section: '', Account: 'Total Liabilities', Amount: data.totalLiabilities.toFixed(2) });
    rows.push({ Section: '', Account: '', Amount: '' });
    rows.push({ Section: 'EQUITY', Account: '', Amount: '' });
    data.equity.forEach((r: any) => rows.push({ Section: '', Account: `${r.account_code} - ${r.account_name}`, Amount: r.balance.toFixed(2) }));
    if (data.retainedEarnings !== 0) rows.push({ Section: '', Account: 'Retained Earnings (Net Income)', Amount: data.retainedEarnings.toFixed(2) });
    rows.push({ Section: '', Account: 'Total Equity', Amount: data.totalEquity.toFixed(2) });
    rows.push({ Section: '', Account: '', Amount: '' });
    rows.push({ Section: 'CHECK', Account: 'Assets - (Liabilities + Equity)', Amount: (data.totalAssets - data.totalLiabilities - data.totalEquity).toFixed(2) });
    exportToExcel(rows, 'balance-sheet.xlsx', 'Balance Sheet');
  };

  if (!data) return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>;

  const { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, retainedEarnings, isBalanced } = data;

  const renderSection = (title: string, items: any[], total: number, color: string) => (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '13px', color, textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{title}</h3>
      <table className="data-table" style={{ fontSize: '13px' }}>
        <thead>
          <tr><th>Code</th><th>Account</th><th className="amount">Balance</th></tr>
        </thead>
        <tbody>
          {items.filter((r: any) => Math.abs(r.balance) > 0.005).map((r: any) => (
            <tr key={r.account_code}>
              <td>{r.account_code}</td>
              <td>{r.account_name}</td>
              <td className="amount" style={{ fontFamily: 'var(--font-mono)' }}>{r.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {title === 'Equity' && retainedEarnings !== 0 && (
            <tr>
              <td></td>
              <td style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Retained Earnings (Net Income)</td>
              <td className="amount" style={{ fontFamily: 'var(--font-mono)', color: retainedEarnings >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {retainedEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
            <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px' }}>Total {title}</td>
            <td className="amount" style={{ color, fontSize: '14px' }}>
              {(title === 'Equity' ? totalEquity : total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div>
      <div className="view-header">
        <h2>Balance Sheet</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={handleExport}>Export (Ctrl+E)</button>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>As of (/):</label>
          <input ref={dateRef} className="form-input" type="date" style={{ width: '160px' }} value={asOfDate} onChange={e => setAsOfDate(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setAsOfDate(''); dateRef.current?.blur(); }}} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: '3px solid #9ece6a' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Assets</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#9ece6a' }}>
            ${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: '3px solid #f7768e' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Liabilities</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f7768e' }}>
            ${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: '3px solid #bb9af7' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Equity</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#bb9af7' }}>
            ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Accounting equation check */}
      <div style={{ marginBottom: '24px', padding: '10px 16px', borderRadius: '6px', fontSize: '14px', fontFamily: 'var(--font-mono)', textAlign: 'center', background: isBalanced ? '#1a3a2a' : '#3a1a1a', border: `1px solid ${isBalanced ? 'var(--success)' : 'var(--danger)'}`, color: isBalanced ? 'var(--success)' : 'var(--danger)' }}>
        Assets (${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}) = Liabilities (${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}) + Equity (${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}) — {isBalanced ? 'BALANCED' : 'NOT BALANCED'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          {renderSection('Assets', assets, totalAssets, '#9ece6a')}
        </div>
        <div>
          {renderSection('Liabilities', liabilities, totalLiabilities, '#f7768e')}
          {renderSection('Equity', equity, totalEquity, '#bb9af7')}
        </div>
      </div>
    </div>
  );
}
