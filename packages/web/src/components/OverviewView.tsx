import { motion } from 'framer-motion'
import { useExplorerStore } from '../store/explorer'
import type { AgeBucket } from '@tech-debt/core'
import {
  ageColor,
  ageLabel,
  DEBT_KINDS,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format'

const AGES: AgeBucket[] = [
  'fresh',
  'recent',
  'aging',
  'stale',
  'ancient',
  'unknown',
]

export function OverviewView() {
  const report = useExplorerStore((s) => s.report)
  const setViewMode = useExplorerStore((s) => s.setViewMode)
  const setFilterKind = useExplorerStore((s) => s.setFilterKind)
  const setFilterAge = useExplorerStore((s) => s.setFilterAge)
  if (!report) return null

  const { stats } = report
  const presentKinds = DEBT_KINDS.filter((k) => stats.byKind[k] > 0)
  const maxKind = Math.max(...DEBT_KINDS.map((k) => stats.byKind[k]), 1)
  const maxAge = Math.max(...AGES.map((a) => stats.byAge[a]), 1)
  const statCards = [
    { label: 'Total', value: stats.totalItems, color: 'var(--accent)' },
    ...presentKinds.map((kind) => ({
      label: kindLabel(kind),
      value: stats.byKind[kind],
      color: kindColor(kind),
    })),
    { label: 'Authors', value: stats.authors, color: 'var(--info)' },
  ]

  return (
    <div className="fade-up" style={{ maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            marginBottom: 8,
            lineHeight: 1.15,
          }}
        >
          Hidden debt, mapped
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            maxWidth: 480,
          }}
        >
          {stats.totalItems} open markers across {stats.totalFiles} files
          {stats.oldestAgeDays != null && (
            <>
              {' '}
              · oldest {formatAge(stats.oldestAgeDays)}
              {stats.averageAgeDays != null &&
                ` · avg ${formatAge(stats.averageAgeDays)}`}
            </>
          )}
          {(stats.triagedHidden ?? 0) > 0 && (
            <> · {stats.triagedHidden} triaged</>
          )}
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10,
          marginBottom: 28,
        }}
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="surface"
            style={{
              padding: '18px 16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 12,
                bottom: 12,
                width: 3,
                borderRadius: 2,
                // background: card.color,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 10,
                paddingLeft: 8,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: card.color,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                paddingLeft: 8,
              }}
            >
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 14,
        }}
      >
        <section className="surface" style={{ padding: 22 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 650,
              marginBottom: 18,
              letterSpacing: '-0.02em',
            }}
          >
            By kind
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {DEBT_KINDS.filter(
              (kind) => stats.byKind[kind] > 0 || presentKinds.length === 0,
            ).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setFilterKind(kind)
                  setViewMode('items')
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 7,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ color: kindColor(kind), fontWeight: 600 }}>
                    {kindLabel(kind)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {stats.byKind[kind]}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(stats.byKind[kind] / maxKind) * 100}%`,
                    }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: '100%',
                      background: kindColor(kind),
                      borderRadius: 3,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface" style={{ padding: 22 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 650,
              marginBottom: 18,
              letterSpacing: '-0.02em',
            }}
          >
            By age
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {AGES.filter((a) => stats.byAge[a] > 0 || a !== 'unknown').map(
              (age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    setFilterAge(age)
                    setViewMode('items')
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 7,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span style={{ color: ageColor(age), fontWeight: 600 }}>
                      {ageLabel(age)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                      {stats.byAge[age]}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: 'var(--bg-tertiary)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(stats.byAge[age] / maxAge) * 100}%`,
                      }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        height: '100%',
                        background: ageColor(age),
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </button>
              ),
            )}
          </div>
        </section>
      </div>

      {report.items.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 650,
              marginBottom: 14,
              letterSpacing: '-0.02em',
            }}
          >
            Oldest open items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.items.slice(0, 5).map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
                onClick={() => {
                  useExplorerStore.getState().selectItem(item.id)
                  setViewMode('items')
                }}
                className="surface"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                  border: 'none',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: kindColor(item.kind),
                    fontFamily: 'var(--font-mono)',
                    minWidth: 72,
                    letterSpacing: '0.02em',
                  }}
                >
                  {kindLabel(item.kind)}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.message}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: ageColor(item.ageBucket),
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {formatAge(item.blame?.ageDays)}
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {!stats.blameEnabled && (
        <p
          style={{
            marginTop: 22,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          Git blame is off or unavailable — age and author data may be missing.
        </p>
      )}
    </div>
  )
}
