import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchSelect } from '../components/SearchSelect';
import { exportToExcel } from '../utils/exportExcel';
import type { Account, Currency, Transaction, TransactionEntry, User } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

interface EntryRow {
  account_id: string;
  debit: string;
  credit: string;
  currency_code: string;
  exchange_rate: string;
}

function emptyEntry(defaultCurrency: string): EntryRow {
  return { account_id: '', debit: '', credit: '', currency_code: defaultCurrency, exchange_rate: '1' };
}

export function JournalEntry({ showToast, refresh }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [nextVoucherId, setNextVoucherId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([emptyEntry('USD'), emptyEntry('USD')]);
  const [showForm, setShowForm] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    const [accts, currs, usrs, txns, nextVid] = await Promise.all([
      window.api.getAccounts(),
      window.api.getCurrencies(),
      window.api.getUsers(),
      window.api.getTransactions(),
      window.api.getNextVoucherId(),
    ]);
    setAccounts(accts);
    setCurrencies(currs);
    setUsers(usrs);
    setTransactions(txns);
    setNextVoucherId(nextVid);

    const baseCurrency = currs.find((c: Currency) => c.is_base)?.code || 'USD';
    setEntries([emptyEntry(baseCurrency), emptyEntry(baseCurrency)]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape always closes form regardless of focus
      if (e.key === 'Escape' && showForm && !confirmDelete) {
        e.preventDefault();
        setShowForm(false);
        return;
      }

      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        const rows: any[] = [];
        transactions.forEach(txn => {
          txn.entries?.forEach((entry: any) => {
            const acct = accounts.find(a => a.id === entry.account_id);
            rows.push({ 'Voucher #': txn.voucher_id, Date: txn.date, User: txn.user_name || '', Description: txn.description, Account: acct ? `${acct.code} - ${acct.name}` : '', Debit: entry.debit || '', Credit: entry.credit || '', Currency: entry.currency_code });
          });
        });
        exportToExcel(rows, 'journal-entries.xlsx', 'Journal');
        return;
      }

      if (showForm || confirmDelete) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setShowForm(true);
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, transactions.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (transactions[selectedIndex]) {
            setExpandedId(prev => prev === transactions[selectedIndex].id ? null : transactions[selectedIndex].id);
          }
          break;
        case 'd':
          e.preventDefault();
          if (transactions[selectedIndex]) {
            setConfirmDelete(transactions[selectedIndex]);
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showForm, confirmDelete, transactions, selectedIndex]);

  const updateEntry = (index: number, field: keyof EntryRow, value: string) => {
    setEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'currency_code') {
        const curr = currencies.find(c => c.code === value);
        if (curr) updated[index].exchange_rate = curr.exchange_rate.toString();
      }
      // Auto-populate user when account is selected
      if (field === 'account_id' && value) {
        const account = accounts.find(a => a.id === parseInt(value));
        if (account?.user_id) {
          setUserId(account.user_id.toString());
        }
      }
      return updated;
    });
  };

  const addEntry = () => {
    const baseCurrency = currencies.find(c => c.is_base)?.code || 'USD';
    setEntries(prev => [...prev, emptyEntry(baseCurrency)]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const totalDebits = entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0) * (parseFloat(e.exchange_rate) || 1), 0);
  const totalCredits = entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0) * (parseFloat(e.exchange_rate) || 1), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005;

  const handleSubmit = async () => {
    if (!date || !description.trim()) { showToast('Date and description are required', 'error'); return; }

    const txnEntries: TransactionEntry[] = entries
      .filter(e => e.account_id && (parseFloat(e.debit) > 0 || parseFloat(e.credit) > 0))
      .map(e => ({
        account_id: parseInt(e.account_id),
        debit: parseFloat(e.debit) || 0,
        credit: parseFloat(e.credit) || 0,
        currency_code: e.currency_code,
        exchange_rate: parseFloat(e.exchange_rate) || 1,
      }));

    if (txnEntries.length < 2) { showToast('At least 2 entries required', 'error'); return; }

    const result = await window.api.createTransaction({
      user_id: userId ? parseInt(userId) : null, date, description: description.trim(), reference: '', entries: txnEntries,
    });

    if (result.success) {
      showToast(`Transaction recorded (Voucher #${result.data.voucher_id})`, 'success');
      setDescription('');
      const baseCurrency = currencies.find(c => c.is_base)?.code || 'USD';
      setEntries([emptyEntry(baseCurrency), emptyEntry(baseCurrency)]);
      setShowForm(false);
      loadData();
      refresh();
    } else {
      showToast(result.error || 'Failed to save', 'error');
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') { e.preventDefault(); setShowForm(false); }
    if (e.key === 'a' && e.ctrlKey) { e.preventDefault(); addEntry(); }
  };

  const handleDeleteTransaction = async () => {
    if (!confirmDelete) return;
    const result = await window.api.deleteTransaction(confirmDelete.id);
    if (result.success) {
      showToast(`Deleted voucher #${confirmDelete.voucher_id}`, 'success');
      setConfirmDelete(null);
      loadData();
      refresh();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
      setConfirmDelete(null);
    }
  };

  const getAccountName = (accountId: number) => {
    const a = accounts.find(acc => acc.id === accountId);
    return a ? `${a.code} - ${a.name}` : `Account #${accountId}`;
  };

  return (
    <div>
      <div className="view-header">
        <h2>Journal Entries</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => {
            const rows: any[] = [];
            transactions.forEach(txn => {
              txn.entries?.forEach((entry: any) => {
                const acct = accounts.find(a => a.id === entry.account_id);
                rows.push({ 'Voucher #': txn.voucher_id, Date: txn.date, User: txn.user_name || '', Description: txn.description, Account: acct ? `${acct.code} - ${acct.name}` : '', Debit: entry.debit || '', Credit: entry.credit || '', Currency: entry.currency_code });
              });
            });
            exportToExcel(rows, 'journal-entries.xlsx', 'Journal');
          }}>
            Export (Ctrl+E)
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel (Esc)' : 'New Entry (n)'}
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }} onKeyDown={handleFormKeyDown}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 2fr', gap: '12px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Voucher No.</label>
              <div className="form-input" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', fontWeight: 700, fontSize: '16px', textAlign: 'center', cursor: 'default' }}>
                {nextVoucherId ?? '...'}
              </div>
            </div>
            <div className="form-group">
              <label>User (auto from account)</label>
              <div className="form-input" style={{ background: 'var(--bg-tertiary)', cursor: 'default', color: userId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {userId ? (users.find(u => u.id.toString() === userId)?.name || `ID ${userId}`) : 'None (general entry)'}
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Transaction description" />
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <div className="entry-row" style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              <span>Account</span>
              <span>Debit</span>
              <span>Credit</span>
              <span>Currency</span>
              <span></span>
            </div>
            {entries.map((entry, i) => (
              <div className="entry-row" key={i}>
                <SearchSelect
                  value={entry.account_id}
                  onChange={val => updateEntry(i, 'account_id', val)}
                  options={accounts.map(a => ({
                    value: a.id.toString(),
                    label: `${a.code} - ${a.name}${a.user_name ? ` [${a.user_name}]` : ''}`,
                  }))}
                  placeholder="Type to search account..."
                />
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                  value={entry.debit} onChange={e => updateEntry(i, 'debit', e.target.value)} />
                <input className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                  value={entry.credit} onChange={e => updateEntry(i, 'credit', e.target.value)} />
                <select className="form-select" value={entry.currency_code} onChange={e => updateEntry(i, 'currency_code', e.target.value)}>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <button className="btn btn-danger" onClick={() => removeEntry(i)} disabled={entries.length <= 2}
                  style={{ padding: '4px 8px', fontSize: '12px' }}>x</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <button className="btn" onClick={addEntry}>+ Add Line (Ctrl+A)</button>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
              <span>Debits: <strong style={{ color: 'var(--danger)' }}>{totalDebits.toFixed(2)}</strong></span>
              <span>Credits: <strong style={{ color: 'var(--success)' }}>{totalCredits.toFixed(2)}</strong></span>
              <span style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                {isBalanced ? 'BALANCED' : 'UNBALANCED'}
              </span>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!isBalanced}>
                Save (Ctrl+Enter)
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Voucher #</th>
            <th>Date</th>
            <th>User</th>
            <th>Description</th>
            <th>Entries</th>
            <th className="amount">Debit</th>
            <th className="amount">Credit</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn, i) => (
            <React.Fragment key={txn.id}>
              <tr
                className={i === selectedIndex ? 'selected' : ''}
                onClick={() => setSelectedIndex(i)}
                onDoubleClick={() => setExpandedId(prev => prev === txn.id ? null : txn.id)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                  {expandedId === txn.id ? '- ' : '+ '}{txn.voucher_id}
                </td>
                <td>{txn.date}</td>
                <td>{txn.user_name || `ID ${txn.user_id}`}</td>
                <td>{txn.description}</td>
                <td>{txn.entries?.length || 0}</td>
                <td className="amount debit">{txn.entries?.reduce((s: number, e: any) => s + e.debit, 0).toFixed(2)}</td>
                <td className="amount credit">{txn.entries?.reduce((s: number, e: any) => s + e.credit, 0).toFixed(2)}</td>
              </tr>
              {expandedId === txn.id && txn.entries?.map((entry: any, ei: number) => (
                <tr key={`${txn.id}-entry-${ei}`} style={{ background: 'var(--bg-secondary)' }}>
                  <td></td>
                  <td colSpan={2} style={{ paddingLeft: '24px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {getAccountName(entry.account_id)}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{entry.description || ''}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{entry.currency_code}</td>
                  <td className="amount debit" style={{ fontSize: '12px' }}>{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
                  <td className="amount credit" style={{ fontSize: '12px' }}>{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          {transactions.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No transactions yet. Press <strong>n</strong> to create one.
            </td></tr>
          )}
        </tbody>
      </table>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Transaction"
          message={`Delete voucher #${confirmDelete.voucher_id} "${confirmDelete.description}"?`}
          onConfirm={handleDeleteTransaction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
