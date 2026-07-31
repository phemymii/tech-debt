import { useExplorerStore } from '../store/explorer'
import { OverviewView } from './OverviewView'
import { ItemsView } from './ItemsView'
import { AuthorsView } from './AuthorsView'
import { FilesView } from './FilesView'
import { DocsView } from './DocsView'

export function MainView() {
  const loading = useExplorerStore((s) => s.loading)
  const viewMode = useExplorerStore((s) => s.viewMode)

  if (loading) {
    return (
      <main
        style={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Scanning for technical debt…
      </main>
    )
  }

  return (
    <main
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '28px 28px 40px',
      }}
    >
      {viewMode === 'overview' && <OverviewView />}
      {viewMode === 'items' && <ItemsView />}
      {viewMode === 'authors' && <AuthorsView />}
      {viewMode === 'files' && <FilesView />}
      {viewMode === 'docs' && <DocsView />}
    </main>
  )
}
