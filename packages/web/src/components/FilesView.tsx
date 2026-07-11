import { useExplorerStore } from '../store/explorer';
import { formatAge, kindLabel } from '../utils/format';

export function FilesView() {
  const report = useExplorerStore((s) => s.report);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery);
  const selectItem = useExplorerStore((s) => s.selectItem);

  if (!report) return null;

  const max = Math.max(...report.files.map((f) => f.total), 1);

  return (
    <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Hotspots
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Files carrying the most TODO / FIXME / @deprecated markers
        </p>
      </header>

      {report.files.length === 0 ? (
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
          No debt files found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
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
                    marginBottom: 8,
                  }}
                >
                  {file.relativePath}
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    background: 'var(--bg-tertiary)',
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: `${(file.total / max) * 100}%`,
                      height: '100%',
                      background: 'var(--warn)',
                      borderRadius: 3,
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
                  <span>
                    {kindLabel('todo')} {file.byKind.todo}
                  </span>
                  <span>
                    {kindLabel('fixme')} {file.byKind.fixme}
                  </span>
                  <span>
                    {kindLabel('deprecated')} {file.byKind.deprecated}
                  </span>
                  <span>oldest {formatAge(file.oldestAgeDays)}</span>
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--warn)',
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
