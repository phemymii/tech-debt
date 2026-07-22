import {
  LayoutDashboard,
  ListTodo,
  Users,
  FolderTree,
  RefreshCw,
} from 'lucide-react'
import { useExplorerStore, type ViewMode } from '../store/explorer'
import { rescan } from '../hooks/useDebtData'
import { DEBT_KINDS, kindLabel } from '../utils/format'

const NAV: Array<{
  id: ViewMode
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'items', label: 'All debt', icon: ListTodo },
  { id: 'authors', label: 'By author', icon: Users },
  { id: 'files', label: 'Hotspots', icon: FolderTree },
]

export function Sidebar() {
  const viewMode = useExplorerStore((s) => s.viewMode)
  const setViewMode = useExplorerStore((s) => s.setViewMode)
  const report = useExplorerStore((s) => s.report)
  const setScanning = useExplorerStore((s) => s.setScanning)

  return (
    <aside
      className="panel"
      style={{
        width: 228,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: 4,
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = viewMode === id
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
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: active ? 'var(--nav-active)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                textAlign: 'left',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          )
        })}
      </nav>

      {report && (
        <div
          style={{
            marginTop: 'auto',
            padding: 14,
            borderRadius: 12,
            background: 'var(--bg-tertiary)',
            fontSize: 12,
          }}
        >
          <div
            style={{
              color: 'var(--text-muted)',
              marginBottom: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: 10,
            }}
          >
            Snapshot
          </div>
          <StatRow label="Items" value={String(report.stats.totalItems)} />
          {DEBT_KINDS.filter((k) => report.stats.byKind[k] > 0).map((kind) => (
            <StatRow
              key={kind}
              label={kindLabel(kind)}
              value={String(report.stats.byKind[kind])}
            />
          ))}
          <StatRow label="Files" value={String(report.stats.totalFiles)} />
          <button
            type="button"
            onClick={async () => {
              setScanning(true)
              await rescan()
            }}
            style={{
              marginTop: 12,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 10px',
              borderRadius: 9,
              border: 'none',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 560,
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <RefreshCw size={13} />
            Rescan
          </button>
        </div>
      )}
    </aside>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        color: 'var(--text-secondary)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          fontWeight: 500,
          fontSize: 12,
        }}
      >
        {value}
      </span>
    </div>
  )
}
