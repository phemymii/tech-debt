import { useExplorerStore } from '../store/explorer'
import type { AgeBucket, DebtKind } from '@tech-debt/core'
import {
  ageColor,
  ageLabel,
  DEBT_KINDS,
  filterItems,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format'

const KINDS: Array<DebtKind | 'all'> = ['all', ...DEBT_KINDS]
const AGES: Array<AgeBucket | 'all'> = [
  'all',
  'fresh',
  'recent',
  'aging',
  'stale',
  'ancient',
  'unknown',
]

export function ItemsView() {
  const report = useExplorerStore((s) => s.report)
  const filterKind = useExplorerStore((s) => s.filterKind)
  const filterAge = useExplorerStore((s) => s.filterAge)
  const filterMine = useExplorerStore((s) => s.filterMine)
  const filterAuthor = useExplorerStore((s) => s.filterAuthor)
  const showTriaged = useExplorerStore((s) => s.showTriaged)
  const gitUser = useExplorerStore((s) => s.gitUser)
  const searchQuery = useExplorerStore((s) => s.searchQuery)
  const selectedItemId = useExplorerStore((s) => s.selectedItemId)
  const setFilterKind = useExplorerStore((s) => s.setFilterKind)
  const setFilterAge = useExplorerStore((s) => s.setFilterAge)
  const setFilterMine = useExplorerStore((s) => s.setFilterMine)
  const setFilterAuthor = useExplorerStore((s) => s.setFilterAuthor)
  const setShowTriaged = useExplorerStore((s) => s.setShowTriaged)
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery)
  const selectItem = useExplorerStore((s) => s.selectItem)

  if (!report) return null

  const canFilterMine = Boolean(gitUser?.email || gitUser?.name)
  const hidden = report.stats.triagedHidden ?? 0
  const items = filterItems(report.items, {
    kind: filterKind,
    age: filterAge,
    query: searchQuery,
    mine: filterMine,
    gitUser,
    author: filterAuthor,
  })

  return (
    <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              marginBottom: 4,
              letterSpacing: '-0.03em',
            }}
          >
            All debt
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {items.length} of {report.items.length} items
            {hidden > 0 && !showTriaged ? ` · ${hidden} triaged hidden` : ''}
          </p>
        </div>
        <div className="input-shell" style={{ height: 38, minWidth: 210 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter list…"
            style={{
              height: '100%',
              width: '100%',
              padding: '0 14px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: 10,
          alignItems: 'center',
        }}
      >
        {canFilterMine && (
          <FilterChip
            active={filterMine}
            label={
              filterMine
                ? `My debt${gitUser?.name ? ` · ${gitUser.name}` : ''}`
                : 'My debt'
            }
            onClick={() => setFilterMine(!filterMine)}
          />
        )}
        <FilterChip
          active={showTriaged}
          label={
            hidden > 0 || showTriaged
              ? `Triaged${hidden > 0 ? ` · ${hidden}` : ''}`
              : 'Triaged'
          }
          onClick={() => setShowTriaged(!showTriaged)}
        />
        {filterAuthor && (
          <FilterChip
            active
            label={`Author · ${filterAuthor}`}
            onClick={() => setFilterAuthor(null)}
          />
        )}
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
          gap: 6,
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

      <div className="surface" style={{ overflow: 'hidden', padding: 6 }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No matching debt items.
          </div>
        ) : (
          items.map((item) => {
            const selected = selectedItemId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item.id)}
                className="row-btn"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '88px 1fr 120px 72px',
                  gap: 12,
                  width: '100%',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: selected ? 'var(--row-selected)' : 'transparent',
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
                    letterSpacing: '0.02em',
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
                      marginBottom: 3,
                      fontWeight: selected ? 560 : 450,
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
                    color: item.triage
                      ? 'var(--text-muted)'
                      : ageColor(item.ageBucket),
                    fontWeight: 600,
                    textTransform: item.triage ? 'capitalize' : undefined,
                  }}
                >
                  {item.triage ? item.triage.status : ageLabel(item.ageBucket)}
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
            )
          })
        )}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? 'chip-active' : 'chip-idle'}`}
    >
      {label}
    </button>
  )
}
