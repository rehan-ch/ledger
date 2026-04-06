import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

const COLORS = {
  asset: '#9ece6a',
  liability: '#f7768e',
  equity: '#bb9af7',
  revenue: '#7aa2f7',
  expense: '#e0af68',
};

const PIE_COLORS = ['#9ece6a', '#f7768e', '#bb9af7', '#7aa2f7', '#e0af68'];

export function Dashboard({ showToast }: Props) {
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    const data = await window.api.getDashboardStats();
    setStats(data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSeed = async () => {
    const result = await window.api.seedDemoData();
    if (result.success) {
      showToast(`Seeded: ${result.users} users, ${result.accounts} accounts, ${result.transactions} transactions`, 'success');
      loadData();
    } else {
      showToast(result.error || 'Failed to seed', 'error');
    }
  };

  if (!stats) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)', textAlign: 'center' }}>Loading dashboard...</div>;
  }

  const { totalAccounts, totalTransactions, totalUsers, summary, monthlyChart, topAccounts, recentTransactions, accountsByType } = stats;

  const netIncome = summary.revenue - summary.expense;
  const isEmpty = totalAccounts === 0 && totalTransactions === 0;

  return (
    <div>
      <div className="view-header">
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Dashboard</h2>
        {isEmpty && process.env.IS_DEV && (
          <button className="btn btn-primary" onClick={handleSeed}>Load Demo Data</button>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Accounts" value={totalAccounts} color="var(--accent)" />
        <StatCard label="Total Transactions" value={totalTransactions} color="var(--accent-secondary)" />
        <StatCard label="Total Users" value={totalUsers} color="var(--success)" />
        <StatCard label="Net Income" value={`$${netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={netIncome >= 0 ? 'var(--success)' : 'var(--danger)'} />
      </div>

      {/* Balance Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map(type => (
          <div key={type} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '14px', borderLeft: `3px solid ${COLORS[type]}` }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{type}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: COLORS[type] }}>
              ${Math.abs(summary[type]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Monthly Revenue vs Expense */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Monthly Revenue vs Expense</h3>
          {monthlyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: 13 }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, '']}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#7aa2f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#e0af68" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data yet</div>
          )}
        </div>

        {/* Account Type Distribution */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Accounts by Type</h3>
          {accountsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={accountsByType.map((a: any) => ({ name: a.type, value: a.count }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {accountsByType.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Accounts + Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Top Accounts */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Top Accounts by Activity</h3>
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Account</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Txns</th>
                <th style={{ textAlign: 'right' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {topAccounts.map((a: any, i: number) => (
                <tr key={i}>
                  <td>{a.code}</td>
                  <td>{a.name}</td>
                  <td><span className={`badge ${a.type}`}>{a.type}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{a.txn_count}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${a.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Transactions */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Recent Transactions</h3>
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th>V#</th>
                <th>Date</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((t: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.voucher_id}</td>
                  <td>{t.date}</td>
                  <td>{t.description}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${t.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
    </div>
  );
}
