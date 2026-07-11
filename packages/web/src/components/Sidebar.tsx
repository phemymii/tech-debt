import {
  LayoutDashboard,
  ListTodo,
  Users,
  FolderTree,
  RefreshCw,
} from 'lucide-react';
import { useExplorerStore, type ViewMode } from '../store/explorer';
import { rescan } from '../hooks/useDebtData';
import { kindLabel } from '../utils/format';

const NAV: Array<{ id: ViewMode; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'items', label: 'All debt', icon: ListTodo },
  { id: 'authors', label: 'By author', icon: Users },
  { id: 'files', label: 'Hotspots', icon: FolderTree },
];

export function Sidebar() {
  const viewMode = useExplorerStore((s) => s.viewMode);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const report = useExplorerStore((s) => s.report);
  const setScanning = useExplorerStore((s) => s.setScanning);

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 12,
        gap: 4,
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      {report && (
        <div
          style={{
            marginTop: 'auto',
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-tertiary)',
            fontSize: 12,
          }}
        >
          <div
            style={{
              color: 'var(--text-muted)',
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: 10,
            }}
          >
            Snapshot
          </div>
          <StatRow label="Items" value={String(report.stats.totalItems)} />
          <StatRow
            label={kindLabel('todo')}
            value={String(report.stats.byKind.todo)}
          />
          <StatRow
            label={kindLabel('fixme')}
            value={String(report.stats.byKind.fixme)}
          />
          <StatRow
            label={kindLabel('deprecated')}
            value={String(report.stats.byKind.deprecated)}
          />
          <StatRow label="Files" value={String(report.stats.totalFiles)} />
          <button
            type="button"
            onClick={async () => {
              setScanning(true);
              await rescan();
            }}
            style={{
              marginTop: 10,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <RefreshCw size={13} />
            Rescan
          </button>
        </div>
      )}
    </aside>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '3px 0',
        color: 'var(--text-secondary)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
