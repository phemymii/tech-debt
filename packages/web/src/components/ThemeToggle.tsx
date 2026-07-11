import { Moon, Sun } from 'lucide-react';
import { useExplorerStore } from '../store/explorer';

export function ThemeToggle() {
  const theme = useExplorerStore((s) => s.theme);
  const toggleTheme = useExplorerStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
