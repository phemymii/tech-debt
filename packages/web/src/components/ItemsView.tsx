import { useExplorerStore } from '../store/explorer';
import type { AgeBucket, DebtKind } from '@tech-debt/core';
import {
  ageColor,
  ageLabel,
  filterItems,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format';

const KINDS: Array<DebtKind | 'all'> = ['all', 'todo', 'fixme', 'deprecated'];
const AGES: Array<AgeBucket | 'all'> = [
  'all',
  'fresh',
  'recent',
  'aging',
  'stale',
  'ancient',
  'unknown',
];

export function ItemsView() {
  const report = useExplorerStore((s) => s.report);
  const filterKind = useExplorerStore((s) => s.filterKind);
  const filterAge = useExplorerStore((s) => s.filterAge);
  const searchQuery = useExplorerStore((s) => s.searchQuery);
  const selectedItemId = useExplorerStore((s) => s.selectedItemId);
  const setFilterKind = useExplorerStore((s) => s.setFilterKind);
  const setFilterAge = useExplorerStore((s) => s.setFilterAge);
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!report) return null;

  const items = filterItems(report.items, {
    kind: filterKind,
    age: filterAge,
    query: searchQuery,
  });

  return (
    <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            All debt
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {items.length} of {report.items.length} items
          </p>
        </div>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter list…"
          style={{
            height: 36,
            minWidth: 200,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </header>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        {KINDS.map((k) => (
          <FilterChip
            key={k}
            active={filterKind === k}
            label={k === 'all' ? 'All kinds' : kindLabel(k)}
            onClick={() => setFilterKind(k)}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        {AGES.map((a) => (
          <FilterChip
            key={a}
            active={filterAge === a}
            label={a === 'all' ? 'All ages' : ageLabel(a)}
            onClick={() => setFilterAge(a)}
          />
        ))}
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No matching debt items.
          </div>
        ) : (
          items.map((item) => {
            const selected = selectedItemId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '88px 1fr 120px 72px',
                  gap: 12,
                  width: '100%',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  background: selected ? 'var(--accent-soft)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: kindColor(item.kind),
                  }}
                >
                  {kindLabel(item.kind)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}
                  >
                    {item.message}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.relativePath}:{item.line}
                    {item.blame?.author ? ` · ${item.blame.author}` : ''}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: ageColor(item.ageBucket),
                    fontWeight: 600,
                  }}
                >
                  {ageLabel(item.ageBucket)}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    textAlign: 'right',
                  }}
                >
                  {formatAge(item.blame?.ageDays)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 6,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--bg-secondary)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
