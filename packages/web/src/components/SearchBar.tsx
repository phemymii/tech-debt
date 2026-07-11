import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { searchApi } from '../hooks/useDebtData';
import { useExplorerStore } from '../store/explorer';
import type { SearchEntry } from '@tech-debt/core';
import { kindColor, kindLabel } from '../utils/format';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [open, setOpen] = useState(false);
  const selectItem = useExplorerStore((s) => s.selectItem);
  const setViewMode = useExplorerStore((s) => s.setViewMode);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const data = await searchApi(query);
      setResults(data);
      setOpen(true);
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: 36,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <Search size={14} color="var(--text-muted)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search debt by message, file, or author…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        />
      </div>

      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 42,
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow)',
            maxHeight: 320,
            overflow: 'auto',
            zIndex: 50,
          }}
        >
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={() => {
                selectItem(r.id);
                setViewMode('items');
                setQuery('');
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: kindColor(r.kind),
                  marginBottom: 2,
                }}
              >
                {kindLabel(r.kind)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                {r.path}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
