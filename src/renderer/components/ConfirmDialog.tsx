import React, { useEffect, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); onConfirm(); }
      else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') { e.preventDefault(); onCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ minWidth: '380px', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{message}</p>
        <div className="btn-row">
          <button className="btn" onClick={onCancel}>No (n/Esc)</button>
          <button className="btn btn-danger" ref={confirmRef} onClick={onConfirm}>Yes (y/Enter)</button>
        </div>
      </div>
    </div>
  );
}
