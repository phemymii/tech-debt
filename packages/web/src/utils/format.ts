import type { AgeBucket, DebtKind, DebtItem } from '@tech-debt/core';

export function kindColor(kind: DebtKind): string {
  return `var(--${kind})`;
}

export function ageColor(bucket: AgeBucket): string {
  return `var(--${bucket})`;
}

export function formatAge(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  }
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

export function kindLabel(kind: DebtKind): string {
  if (kind === 'todo') return 'TODO';
  if (kind === 'fixme') return 'FIXME';
  return '@deprecated';
}

export function ageLabel(bucket: AgeBucket): string {
  const labels: Record<AgeBucket, string> = {
    fresh: '< 30d',
    recent: '30–90d',
    aging: '90–180d',
    stale: '180–365d',
    ancient: '> 1y',
    unknown: 'Unknown',
  };
  return labels[bucket];
}

export function filterItems(
  items: DebtItem[],
  opts: {
    kind?: DebtKind | 'all';
    age?: AgeBucket | 'all';
    query?: string;
  },
): DebtItem[] {
  const q = opts.query?.trim().toLowerCase() ?? '';
  return items.filter((item) => {
    if (opts.kind && opts.kind !== 'all' && item.kind !== opts.kind) return false;
    if (opts.age && opts.age !== 'all' && item.ageBucket !== opts.age) return false;
    if (!q) return true;
    return (
      item.message.toLowerCase().includes(q) ||
      item.relativePath.toLowerCase().includes(q) ||
      (item.blame?.author.toLowerCase().includes(q) ?? false) ||
      item.kind.includes(q)
    );
  });
}
