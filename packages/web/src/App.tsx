import { useEffect } from 'react';
import { useDebtData } from './hooks/useDebtData';
import { useExplorerStore } from './store/explorer';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { MainView } from './components/MainView';
import { InspectorPanel } from './components/InspectorPanel';
import { ThemeToggle } from './components/ThemeToggle';

export function App() {
  useDebtData();
  const scanning = useExplorerStore((s) => s.scanning);
  const theme = useExplorerStore((s) => s.theme);
  const report = useExplorerStore((s) => s.report);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <header
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <img
            src="/favicon.svg"
            alt="Tech Debt"
            width={32}
            height={32}
            style={{ borderRadius: 8, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>
              Tech Debt
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
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
              color: 'var(--accent)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
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
  );
}
