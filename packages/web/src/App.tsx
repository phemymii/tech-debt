import { useEffect } from 'react'
import { useDebtData } from './hooks/useDebtData'
import { useExplorerStore } from './store/explorer'
import { Sidebar } from './components/Sidebar'
import { SearchBar } from './components/SearchBar'
import { MainView } from './components/MainView'
import { InspectorPanel } from './components/InspectorPanel'
import { ThemeToggle } from './components/ThemeToggle'

export function App() {
  useDebtData()
  const scanning = useExplorerStore((s) => s.scanning)
  const theme = useExplorerStore((s) => s.theme)
  const report = useExplorerStore((s) => s.report)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <header
        className="panel"
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 20px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <img
            src="/favicon.svg"
            alt="Tech Debt"
            width={30}
            height={30}
            style={{ borderRadius: 9, flexShrink: 0 }}
          />
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
              }}
            >
              Tech Debt
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 2,
                letterSpacing: '0.01em',
              }}
            >
              {report?.config.name ?? 'Technical Debt Explorer'}
            </div>
          </div>
        </div>

        <SearchBar />
        <ThemeToggle />

        {scanning && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--accent)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              letterSpacing: '0.02em',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'pulse 1s ease infinite',
              }}
            />
            Live
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <MainView />
        <InspectorPanel />
      </div>
    </div>
  )
}
