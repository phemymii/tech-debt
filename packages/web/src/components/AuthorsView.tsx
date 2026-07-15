import { useExplorerStore } from '../store/explorer';
import { DEBT_KINDS, formatAge, kindLabel } from '../utils/format';

export function AuthorsView() {
  const report = useExplorerStore((s) => s.report);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const setFilterAuthor = useExplorerStore((s) => s.setFilterAuthor);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!report) return null;

  const max = Math.max(...report.authors.map((a) => a.total), 1);

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 4,
            letterSpacing: '-0.03em',
          }}
        >
          By author
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Who owns the open markers (from git blame)
        </p>
      </header>

      {report.authors.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {report.authors.map((author) => (
            <button
              key={`${author.author}|${author.authorEmail}`}
              type="button"
              onClick={() => {
                setFilterAuthor(author.author);
                setViewMode('items');
                const first = author.items[0];
                if (first) selectItem(first);
              }}
              className="surface"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 18,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                border: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 650,
                      fontSize: 15,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {author.author}
                  </div>
                  {author.authorEmail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {author.authorEmail}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 22,
                    color: 'var(--accent)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {author.total}
                </div>
              </div>

              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: 'var(--bg-tertiary)',
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: `${(author.total / max) * 100}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 3,
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  flexWrap: 'wrap',
                }}
              >
                {DEBT_KINDS.filter((k) => author.byKind[k] > 0).map((kind) => (
                  <span key={kind}>
                    {kindLabel(kind)} {author.byKind[kind]}
                  </span>
                ))}
                <span>oldest {formatAge(author.oldestAgeDays)}</span>
                <span>avg {formatAge(author.averageAgeDays)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div
      className="surface"
      style={{
        padding: 48,
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      No author data yet. Run with git blame enabled inside a git repo.
    </div>
  );
}
