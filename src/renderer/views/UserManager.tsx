import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { exportToExcel } from '../utils/exportExcel';
import type { User } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function UserManager({ showToast, refresh }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const loadData = useCallback(async () => {
    const data = await window.api.getUsers();
    setUsers(data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        exportToExcel(users.map(u => ({ ID: u.id, Name: u.name, Email: u.email, Phone: u.phone, Address: u.address, Status: u.is_active ? 'Active' : 'Inactive' })), 'users.xlsx', 'Users');
        return;
      }

      if (showForm || confirmDelete) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setEditUser(null);
          setShowForm(true);
          break;
        case 'Enter':
        case 'e':
          e.preventDefault();
          if (users[selectedIndex]) {
            setEditUser(users[selectedIndex]);
            setShowForm(true);
          }
          break;
        case 'd':
          e.preventDefault();
          if (users[selectedIndex]) {
            setConfirmDelete(users[selectedIndex]);
          }
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, users.length - 1));
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
  }, [users, selectedIndex, showForm, confirmDelete]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await window.api.deleteUser(confirmDelete.id);
    if (result.success) {
      showToast(`Deleted user: ${confirmDelete.name}`, 'success');
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
      if (editUser) {
        const result = await window.api.updateUser(editUser.id, formData);
        if (result.success) showToast(`Updated user: ${formData.name}`, 'success');
        else { showToast(result.error || 'Failed to update', 'error'); return; }
      } else {
        const result = await window.api.createUser(formData);
        if (result.success) showToast(`Created user: ${formData.name} (ID: ${result.data.id})`, 'success');
        else { showToast(result.error || 'Failed to create', 'error'); return; }
      }
      setShowForm(false);
      loadData();
      refresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save user', 'error');
    }
  };

  return (
    <div>
      <div className="view-header">
        <h2>Users</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => exportToExcel(users.map(u => ({ ID: u.id, Name: u.name, Email: u.email, Phone: u.phone, Address: u.address, Status: u.is_active ? 'Active' : 'Inactive' })), 'users.xlsx', 'Users')}>
            Export (Ctrl+E)
          </button>
          <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowForm(true); }}>
            New User (n)
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr
              key={user.id}
              className={i === selectedIndex ? 'selected' : ''}
              onClick={() => setSelectedIndex(i)}
              onDoubleClick={() => { setEditUser(user); setShowForm(true); }}
            >
              <td style={{ fontFamily: 'var(--font-mono)' }}>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.phone}</td>
              <td>{user.address}</td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No users yet. Press <strong>n</strong> to create one.
            </td></tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <UserForm user={editUser} onSubmit={handleSubmit} onClose={() => setShowForm(false)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete User"
          message={`Delete user "${confirmDelete.name}" (ID: ${confirmDelete.id})?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function UserForm({ user, onSubmit, onClose }: {
  user: User | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
  };

  return (
    <Modal title={user ? 'Edit User' : 'New User'} onClose={onClose}>
      <div onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label>Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Country" />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancel (Esc)</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Save (Ctrl+Enter)</button>
        </div>
      </div>
    </Modal>
  );
}
