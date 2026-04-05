import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SearchSelect } from '../components/SearchSelect';
import { exportToExcel } from '../utils/exportExcel';
import type { Account, AccountType, Currency, User } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export function ChartOfAccounts({ showToast, refresh }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);

  const loadData = useCallback(async () => {
    const [accts, currs, usrs] = await Promise.all([
      window.api.getAccounts(),
      window.api.getCurrencies(),
      window.api.getUsers(),
    ]);
    setAccounts(accts);
    setCurrencies(currs);
    setUsers(usrs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        exportToExcel(accounts.map(a => ({ Code: a.code, Name: a.name, Type: a.type, User: a.user_name || '', Currency: a.currency_code, Status: a.is_active ? 'Active' : 'Inactive' })), 'chart-of-accounts.xlsx', 'Accounts');
        return;
      }

      if (showForm || confirmDelete) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setEditAccount(null);
          setShowForm(true);
          break;
        case 'Enter':
        case 'e':
          e.preventDefault();
          if (accounts[selectedIndex]) {
            setEditAccount(accounts[selectedIndex]);
            setShowForm(true);
          }
          break;
        case 'd':
          e.preventDefault();
          if (accounts[selectedIndex]) {
            setConfirmDelete(accounts[selectedIndex]);
          }
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, accounts.length - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [accounts, selectedIndex, showForm, confirmDelete]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await window.api.deleteAccount(confirmDelete.id);
    if (result.success) {
      showToast(`Deleted account: ${confirmDelete.name}`, 'success');
      setConfirmDelete(null);
      loadData();
      refresh();
    } else {
      showToast(result.error || 'Failed to delete', 'error');
      setConfirmDelete(null);
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      // If formData has newUserName, create the user first
      let userId = formData.user_id;
      if (formData.newUserName) {
        const result = await window.api.createUser({
          name: formData.newUserName,
          email: formData.newUserEmail || '',
          phone: formData.newUserPhone || '',
          address: '',
        });
        if (result.success) {
          userId = result.data.id;
        } else {
          showToast(result.error || 'Failed to create user', 'error');
          return;
        }
      }

      const accountData = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        user_id: userId,
        parent_id: formData.parent_id,
        currency_code: formData.currency_code,
        is_active: formData.is_active,
      };

      if (editAccount) {
        await window.api.updateAccount(editAccount.id, accountData);
        showToast(`Updated account: ${formData.name}`, 'success');
      } else {
        await window.api.createAccount(accountData);
        showToast(`Created account: ${formData.name}`, 'success');
      }
      setShowForm(false);
      loadData();
      refresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save account', 'error');
    }
  };

  return (
    <div>
      <div className="view-header">
        <h2>Chart of Accounts</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => exportToExcel(accounts.map(a => ({ Code: a.code, Name: a.name, Type: a.type, User: a.user_name || '', Currency: a.currency_code, Status: a.is_active ? 'Active' : 'Inactive' })), 'chart-of-accounts.xlsx', 'Accounts')}>
            Export (Ctrl+E)
          </button>
          <button className="btn btn-primary" onClick={() => { setEditAccount(null); setShowForm(true); }}>
            New Account (n)
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>User</th>
            <th>Currency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account, i) => (
            <tr
              key={account.id}
              className={i === selectedIndex ? 'selected' : ''}
              onClick={() => setSelectedIndex(i)}
              onDoubleClick={() => { setEditAccount(account); setShowForm(true); }}
            >
              <td>{account.code}</td>
              <td>{account.name}</td>
              <td><span className={`badge ${account.type}`}>{account.type}</span></td>
              <td>{account.user_name || '-'}</td>
              <td>{account.currency_code}</td>
              <td>{account.is_active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No accounts yet. Press <strong>n</strong> to create one.
            </td></tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <AccountForm
          account={editAccount}
          currencies={currencies}
          accounts={accounts}
          users={users}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Account"
          message={`Delete account "${confirmDelete.code} - ${confirmDelete.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AccountForm({ account, currencies, accounts, users, onSubmit, onClose }: {
  account: Account | null;
  currencies: Currency[];
  accounts: Account[];
  users: User[];
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(account?.code || '');
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || 'asset');
  const [userMode, setUserMode] = useState<'existing' | 'new'>(account?.user_id ? 'existing' : 'existing');
  const [accountUserId, setAccountUserId] = useState<string>(account?.user_id?.toString() || '');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [parentId, setParentId] = useState<string>(account?.parent_id?.toString() || '');
  const [currencyCode, setCurrencyCode] = useState(account?.currency_code || currencies[0]?.code || 'USD');
  const [isActive, setIsActive] = useState(account?.is_active !== false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!code.trim() || !name.trim()) return;

    if (userMode === 'new' && newUserName.trim()) {
      onSubmit({
        code: code.trim(),
        name: name.trim(),
        type,
        user_id: null,
        newUserName: newUserName.trim(),
        newUserEmail: newUserEmail.trim(),
        newUserPhone: newUserPhone.trim(),
        parent_id: parentId ? parseInt(parentId) : null,
        currency_code: currencyCode,
        is_active: isActive,
      });
    } else {
      onSubmit({
        code: code.trim(),
        name: name.trim(),
        type,
        user_id: accountUserId ? parseInt(accountUserId) : null,
        parent_id: parentId ? parseInt(parentId) : null,
        currency_code: currencyCode,
        is_active: isActive,
      });
    }
  };

  return (
    <Modal title={account ? 'Edit Account' : 'New Account'} onClose={onClose}>
      <div onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label>Account Code</label>
          <input className="form-input" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 1000" autoFocus />
        </div>
        <div className="form-group">
          <label>Account Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cash" />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select className="form-select" value={type} onChange={e => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {/* User: pick existing or create new */}
        <div className="form-group">
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>User (owner)</span>
            <button
              type="button"
              onClick={() => { setUserMode(m => m === 'existing' ? 'new' : 'existing'); setAccountUserId(''); setNewUserName(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
            >
              {userMode === 'existing' ? '+ Create new user' : 'Pick existing user'}
            </button>
          </label>

          {userMode === 'existing' ? (
            <SearchSelect
              value={accountUserId}
              onChange={setAccountUserId}
              options={[
                { value: '', label: 'None (no user)' },
                ...users.map(u => ({ value: u.id.toString(), label: `${u.id} - ${u.name}` })),
              ]}
              placeholder="Type to search user..."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
              <input className="form-input" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="User name (required)" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email (optional)" style={{ flex: 1 }} />
                <input className="form-input" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} placeholder="Phone (optional)" style={{ flex: 1 }} />
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Parent Account</label>
          <select className="form-select" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">None (Top Level)</option>
            {accounts.filter(a => a.id !== account?.id).map(a => (
              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Currency</label>
          <select className="form-select" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)}>
            {currencies.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancel (Esc)</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save (Ctrl+Enter)</button>
        </div>
      </div>
    </Modal>
  );
}
