import { useExplorerStore } from '../store/explorer';
import { formatAge, kindLabel } from '../utils/format';

export function AuthorsView() {
  const report = useExplorerStore((s) => s.report);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!report) return null;

  const max = Math.max(...report.authors.map((a) => a.total), 1);

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          By author
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Who owns the open markers (from git blame)
        </p>
      </header>

      {report.authors.length === 0 ? (
        <Empty />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {report.authors.map((author) => (
            <button
              key={`${author.author}|${author.authorEmail}`}
              type="button"
              onClick={() => {
                setSearchQuery(author.author);
                setViewMode('items');
                const first = author.items[0];
                if (first) selectItem(first);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 16,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {author.author}
                  </div>
                  {author.authorEmail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginTop: 2,
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
                    fontSize: 18,
                    color: 'var(--accent)',
                  }}
                >
                  {author.total}
                </div>
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--bg-tertiary)',
                  overflow: 'hidden',
                  marginBottom: 10,
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
                <span>
                  {kindLabel('todo')} {author.byKind.todo}
                </span>
                <span>
                  {kindLabel('fixme')} {author.byKind.fixme}
                </span>
                <span>
                  {kindLabel('deprecated')} {author.byKind.deprecated}
                </span>
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
      style={{
        padding: 40,
        textAlign: 'center',
        color: 'var(--text-muted)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-secondary)',
      }}
    >
      No author data yet. Run with git blame enabled inside a git repo.
    </div>
  );
}
