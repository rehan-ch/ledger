import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { exportToExcel } from '../utils/exportExcel';
import type { Currency } from '../../shared/types';

interface Props {
  showToast: (msg: string, type: 'success' | 'error') => void;
  refresh: () => void;
}

export function CurrencyManager({ showToast, refresh }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<{ code: string; rate: string } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadData = useCallback(async () => {
    const currs = await window.api.getCurrencies();
    setCurrencies(currs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' && e.ctrlKey) {
        e.preventDefault();
        exportToExcel(currencies.map(c => ({ Code: c.code, Name: c.name, Symbol: c.symbol, 'Exchange Rate': c.exchange_rate, Base: c.is_base ? 'Yes' : '' })), 'currencies.xlsx', 'Currencies');
        return;
      }

      if (showForm || editingRate) return;
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case 'n':
          e.preventDefault();
          setShowForm(true);
          break;
        case 'Enter':
          e.preventDefault();
          if (currencies[selectedIndex] && !currencies[selectedIndex].is_base) {
            setEditingRate({ code: currencies[selectedIndex].code, rate: currencies[selectedIndex].exchange_rate.toString() });
          }
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, currencies.length - 1));
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
  }, [currencies, selectedIndex, showForm, editingRate]);

  const handleAddCurrency = async (data: { code: string; name: string; symbol: string; rate: string }) => {
    try {
      await window.api.createCurrency({
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        exchange_rate: parseFloat(data.rate) || 1,
        is_base: false,
      });
      showToast(`Added currency: ${data.code}`, 'success');
      setShowForm(false);
      loadData();
      refresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to add currency', 'error');
    }
  };

  const handleUpdateRate = async () => {
    if (!editingRate) return;
    const rate = parseFloat(editingRate.rate);
    if (isNaN(rate) || rate <= 0) {
      showToast('Invalid exchange rate', 'error');
      return;
    }
    await window.api.updateExchangeRate(editingRate.code, rate);
    showToast(`Updated ${editingRate.code} rate to ${rate}`, 'success');
    setEditingRate(null);
    loadData();
  };

  return (
    <div>
      <div className="view-header">
        <h2>Currencies</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={() => exportToExcel(currencies.map(c => ({ Code: c.code, Name: c.name, Symbol: c.symbol, 'Exchange Rate': c.exchange_rate, Base: c.is_base ? 'Yes' : '' })), 'currencies.xlsx', 'Currencies')}>
            Export (Ctrl+E)
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>New Currency (n)</button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Symbol</th>
            <th className="amount">Exchange Rate</th>
            <th>Base</th>
          </tr>
        </thead>
        <tbody>
          {currencies.map((curr, i) => (
            <tr key={curr.code} className={i === selectedIndex ? 'selected' : ''} onClick={() => setSelectedIndex(i)}>
              <td>{curr.code}</td>
              <td>{curr.name}</td>
              <td>{curr.symbol}</td>
              <td className="amount">
                {editingRate?.code === curr.code ? (
                  <input
                    className="form-input"
                    type="number"
                    step="0.0001"
                    value={editingRate.rate}
                    onChange={e => setEditingRate({ ...editingRate, rate: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdateRate();
                      if (e.key === 'Escape') setEditingRate(null);
                    }}
                    autoFocus
                    style={{ width: '120px', display: 'inline' }}
                  />
                ) : (
                  <span onDoubleClick={() => {
                    if (!curr.is_base) setEditingRate({ code: curr.code, rate: curr.exchange_rate.toString() });
                  }}>
                    {curr.exchange_rate.toFixed(4)}
                  </span>
                )}
              </td>
              <td>{curr.is_base ? 'Yes' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <CurrencyForm onSubmit={handleAddCurrency} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function CurrencyForm({ onSubmit, onClose }: {
  onSubmit: (data: { code: string; name: string; symbol: string; rate: string }) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [rate, setRate] = useState('1');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (code.trim() && name.trim()) onSubmit({ code, name, symbol, rate });
    }
  };

  return (
    <Modal title="New Currency" onClose={onClose}>
      <div onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label>Currency Code (e.g. JPY)</label>
          <input className="form-input" value={code} onChange={e => setCode(e.target.value)} maxLength={3} autoFocus />
        </div>
        <div className="form-group">
          <label>Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Japanese Yen" />
        </div>
        <div className="form-group">
          <label>Symbol</label>
          <input className="form-input" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="¥" />
        </div>
        <div className="form-group">
          <label>Exchange Rate (to base currency)</label>
          <input className="form-input" type="number" step="0.0001" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className="btn-row">
          <button className="btn" onClick={onClose}>Cancel (Esc)</button>
          <button className="btn btn-primary" onClick={() => onSubmit({ code, name, symbol, rate })}>Save (Ctrl+Enter)</button>
        </div>
      </div>
    </Modal>
  );
}
