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
        width: 36,
        height: 36,
        borderRadius: 10,
        border: 'none',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
