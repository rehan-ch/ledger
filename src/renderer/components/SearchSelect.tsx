import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchSelect({ options, value, onChange, placeholder = 'Search...', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); return; }
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (open && filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].value);
        } else {
          setOpen(true);
        }
        break;
      case 'Escape':
        if (open) {
          e.stopPropagation();
          setOpen(false);
          setQuery('');
        }
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const handleFocus = () => {
    setOpen(true);
    setQuery('');
  };

  const handleBlur = () => {
    // Delay to allow click on list item
    setTimeout(() => { setOpen(false); setQuery(''); }, 150);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="form-input"
        value={open ? query : selectedLabel}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={value ? selectedLabel : placeholder}
        autoFocus={autoFocus}
      />
      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {filtered.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={() => handleSelect(opt.value)}
              onMouseEnter={() => setHighlightIndex(i)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                background: i === highlightIndex ? 'var(--bg-highlight)' : 'transparent',
                color: opt.value === value ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              {opt.label}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}
