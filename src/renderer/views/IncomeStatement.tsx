import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { exportToExcel } from '../utils/exportExcel';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

interface LineItem {
  account_code: string;
  account_name: string;
  amount: number;
}

export function IncomeStatement({ showToast }: Props) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<any>(null);
  const fromRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    const filters: any = {};
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    const result = await window.api.getIncomeStatement(Object.keys(filters).length > 0 ? filters : undefined);
    setData(result);
  }, [fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        handleExport();
        return;
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        fromRef.current?.focus();
        return;
      }
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setFromDate('');
        setToDate('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    const rows: any[] = [];
    const period = fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'Present'}` : 'All Time';

    rows.push({ Section: 'INCOME STATEMENT', Account: period, Amount: '' });
    rows.push({ Section: '', Account: '', Amount: '' });

    rows.push({ Section: 'REVENUE', Account: '', Amount: '' });
    data.revenue.forEach((r: LineItem) => rows.push({ Section: '', Account: `${r.account_code} - ${r.account_name}`, Amount: r.amount.toFixed(2) }));
    rows.push({ Section: '', Account: 'Total Revenue', Amount: data.totalRevenue.toFixed(2) });
    rows.push({ Section: '', Account: '', Amount: '' });

    rows.push({ Section: 'EXPENSES', Account: '', Amount: '' });
    data.expenses.forEach((r: LineItem) => rows.push({ Section: '', Account: `${r.account_code} - ${r.account_name}`, Amount: r.amount.toFixed(2) }));
    rows.push({ Section: '', Account: 'Total Expenses', Amount: data.totalExpenses.toFixed(2) });
    rows.push({ Section: '', Account: '', Amount: '' });

    rows.push({ Section: 'SUMMARY', Account: 'Net Income', Amount: data.netIncome.toFixed(2) });

    exportToExcel(rows, 'income-statement.xlsx', 'Income Statement');
  };

  if (!data) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>;
  }

  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = data;
  const isProfit = netIncome >= 0;

  // Chart data
  const chartData = [
    { name: 'Revenue', value: totalRevenue, color: '#7aa2f7' },
    { name: 'Expenses', value: totalExpenses, color: '#e0af68' },
    { name: isProfit ? 'Net Profit' : 'Net Loss', value: Math.abs(netIncome), color: isProfit ? '#9ece6a' : '#f7768e' },
  ];

  const period = fromDate || toDate
    ? `${fromDate || 'Start'} to ${toDate || 'Present'}`
    : 'All Time';

  return (
    <div>
      <div className="view-header">
        <h2>Income Statement</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={handleExport}>Export (Ctrl+E)</button>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From:</label>
          <input ref={fromRef} className="form-input" type="date" style={{ width: '150px' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To:</label>
          <input className="form-input" type="date" style={{ width: '150px' }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: '3px solid #7aa2f7' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Revenue</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#7aa2f7' }}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: '3px solid #e0af68' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Expenses</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#e0af68' }}>
            ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: `3px solid ${isProfit ? '#9ece6a' : '#f7768e'}` }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{isProfit ? 'Net Profit' : 'Net Loss'}</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isProfit ? '#9ece6a' : '#f7768e' }}>
            ${Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Revenue & Expense Detail Tables */}
        <div>
          {/* Revenue Section */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', color: '#7aa2f7', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Revenue</h3>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r: LineItem) => (
                  <tr key={r.account_code}>
                    <td>{r.account_code}</td>
                    <td>{r.account_name}</td>
                    <td className="amount credit">{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {revenue.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>No revenue</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px' }}>Total Revenue</td>
                  <td className="amount" style={{ color: '#7aa2f7' }}>
                    {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses Section */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', color: '#e0af68', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Expenses</h3>
            <table className="data-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((r: LineItem) => (
                  <tr key={r.account_code}>
                    <td>{r.account_code}</td>
                    <td>{r.account_name}</td>
                    <td className="amount debit">{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>No expenses</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '8px 12px' }}>Total Expenses</td>
                  <td className="amount" style={{ color: '#e0af68' }}>
                    {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net Income Summary */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: `1px solid ${isProfit ? '#9ece6a' : '#f7768e'}` }}>
            <table className="data-table" style={{ fontSize: '14px' }}>
              <tbody>
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ width: '70%' }}>Total Revenue</td>
                  <td className="amount" style={{ color: '#7aa2f7' }}>{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr style={{ fontWeight: 700 }}>
                  <td>Less: Total Expenses</td>
                  <td className="amount" style={{ color: '#e0af68' }}>({totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
                </tr>
                <tr style={{ borderTop: '3px double var(--border)', fontWeight: 700, fontSize: '16px' }}>
                  <td>{isProfit ? 'NET PROFIT' : 'NET LOSS'}</td>
                  <td className="amount" style={{ color: isProfit ? '#9ece6a' : '#f7768e', fontSize: '18px' }}>
                    ${Math.abs(netIncome).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Summary — {period}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} width={90} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: 13 }}
                formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Profit Margin */}
          {totalRevenue > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Profit Margin</div>
              <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isProfit ? '#9ece6a' : '#f7768e' }}>
                {((netIncome / totalRevenue) * 100).toFixed(1)}%
              </div>
              <div style={{ marginTop: '8px', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(Math.abs((netIncome / totalRevenue) * 100), 100)}%`,
                  height: '100%',
                  background: isProfit ? '#9ece6a' : '#f7768e',
                  borderRadius: '4px',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
