import { useExplorerStore } from '../store/explorer';
import { DEBT_KINDS, formatAge, kindLabel } from '../utils/format';

export function FilesView() {
  const report = useExplorerStore((s) => s.report);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!report) return null;

  const max = Math.max(...report.files.map((f) => f.total), 1);

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
          Hotspots
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Files carrying the most debt markers
        </p>
      </header>

      {report.files.length === 0 ? (
        <div
          className="surface"
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          No debt files found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {report.files.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => {
                setSearchQuery(file.relativePath);
                setViewMode('items');
                const first = file.items[0];
                if (first) selectItem(first);
              }}
              className="surface"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
                width: '100%',
                textAlign: 'left',
                padding: '15px 18px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                border: 'none',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 10,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {file.relativePath}
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: `${(file.total / max) * 100}%`,
                      height: '100%',
                      background: 'var(--warn)',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  {DEBT_KINDS.filter((k) => file.byKind[k] > 0).map((kind) => (
                    <span key={kind}>
                      {kindLabel(kind)} {file.byKind[kind]}
                    </span>
                  ))}
                  <span>oldest {formatAge(file.oldestAgeDays)}</span>
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 24,
                  color: 'var(--warn)',
                  letterSpacing: '-0.03em',
                }}
              >
                {file.total}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
