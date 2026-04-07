import React, { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

const sections = [
  {
    title: 'Global',
    shortcuts: [
      ['Ctrl+P', 'Command palette'],
      ['Alt+1-9', 'Switch views'],
      ['?', 'Show this help'],
      ['Escape', 'Close dialog / clear filter'],
    ],
  },
  {
    title: 'Tables',
    shortcuts: [
      ['j / ArrowDown', 'Move down'],
      ['k / ArrowUp', 'Move up'],
      ['n', 'New item'],
      ['e / Enter', 'Edit / expand'],
      ['d', 'Delete (with confirmation)'],
      ['Ctrl+E', 'Export to Excel'],
    ],
  },
  {
    title: 'Journal Entry',
    shortcuts: [
      ['/', 'Focus search'],
      ['Ctrl+Enter', 'Save transaction'],
      ['Ctrl+A', 'Add entry line'],
      ['Enter', 'Expand/collapse entries'],
    ],
  },
  {
    title: 'General Ledger',
    shortcuts: [
      ['/', 'Focus account search'],
      ['f', 'Focus from date'],
      ['t', 'Focus to date'],
    ],
  },
  {
    title: 'Search Dropdowns',
    shortcuts: [
      ['Type', 'Filter options'],
      ['ArrowDown/Up', 'Navigate'],
      ['Enter', 'Select'],
      ['Escape', 'Close dropdown'],
      ['Tab', 'Next field'],
    ],
  },
  {
    title: 'Confirm Dialog',
    shortcuts: [
      ['y / Enter', 'Confirm'],
      ['n / Escape', 'Cancel'],
    ],
  },
];

export function HelpOverlay({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 250 }}>
      <div className="modal" style={{ maxWidth: '650px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: '16px' }}>Keyboard Shortcuts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {sections.map(section => (
            <div key={section.title}>
              <h3 style={{ fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                {section.title}
              </h3>
              {section.shortcuts.map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '13px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>{key}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          Press <strong>?</strong> or <strong>Esc</strong> to close
        </div>
      </div>
    </div>
  );
}
