import { motion } from 'framer-motion';
import { useExplorerStore } from '../store/explorer';
import type { AgeBucket, DebtKind } from '@tech-debt/core';
import {
  ageColor,
  ageLabel,
  formatAge,
  kindColor,
  kindLabel,
} from '../utils/format';

const KINDS: DebtKind[] = ['todo', 'fixme', 'deprecated'];
const AGES: AgeBucket[] = [
  'fresh',
  'recent',
  'aging',
  'stale',
  'ancient',
  'unknown',
];

export function OverviewView() {
  const report = useExplorerStore((s) => s.report);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const setFilterKind = useExplorerStore((s) => s.setFilterKind);
  const setFilterAge = useExplorerStore((s) => s.setFilterAge);
  if (!report) return null;

  const { stats } = report;
  const maxKind = Math.max(...KINDS.map((k) => stats.byKind[k]), 1);
  const maxAge = Math.max(...AGES.map((a) => stats.byAge[a]), 1);

  return (
    <div className="fade-up" style={{ maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Hidden debt, mapped
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {stats.totalItems} markers across {stats.totalFiles} files
          {stats.oldestAgeDays != null && (
            <>
              {' '}
              · oldest {formatAge(stats.oldestAgeDays)}
              {stats.averageAgeDays != null &&
                ` · avg ${formatAge(stats.averageAgeDays)}`}
            </>
          )}
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        {[
          { label: 'Total', value: stats.totalItems, color: 'var(--accent)' },
          { label: 'TODO', value: stats.byKind.todo, color: 'var(--todo)' },
          { label: 'FIXME', value: stats.byKind.fixme, color: 'var(--fixme)' },
          {
            label: 'Deprecated',
            value: stats.byKind.deprecated,
            color: 'var(--deprecated)',
          },
          { label: 'Authors', value: stats.authors, color: 'var(--info)' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: card.color,
                lineHeight: 1,
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
          gap: 20,
        }}
      >
        <section
          style={{
            padding: 20,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            By kind
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setFilterKind(kind);
                  setViewMode('items');
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
                    marginBottom: 6,
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
                    height: 8,
                    borderRadius: 4,
                    background: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(stats.byKind[kind] / maxKind) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: kindColor(kind),
                      borderRadius: 4,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            padding: 20,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            By age
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {AGES.filter((a) => stats.byAge[a] > 0 || a !== 'unknown').map(
              (age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => {
                    setFilterAge(age);
                    setViewMode('items');
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
                      marginBottom: 6,
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
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--bg-tertiary)',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(stats.byAge[age] / maxAge) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: ageColor(age),
                        borderRadius: 4,
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
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Oldest open items
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.items.slice(0, 5).map((item, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                onClick={() => {
                  useExplorerStore.getState().selectItem(item.id);
                  setViewMode('items');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: kindColor(item.kind),
                    fontFamily: 'var(--font-mono)',
                    minWidth: 72,
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
            marginTop: 20,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          Git blame is off or unavailable — age and author data may be missing.
        </p>
      )}
    </div>
  );
}
