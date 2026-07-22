import type { AgeBucket, DebtKind, DebtItem } from '@tech-debt/core'

/** Keep in sync with @tech-debt/core DEBT_KINDS (avoid importing Node-only package entry). */
export const DEBT_KINDS: DebtKind[] = [
  'todo',
  'fixme',
  'hack',
  'xxx',
  'bug',
  'deprecated',
]

export function kindColor(kind: DebtKind): string {
  return `var(--${kind})`
}

export function ageColor(bucket: AgeBucket): string {
  return `var(--${bucket})`
}

export function formatAge(days: number | null | undefined): string {
  if (days == null) return '—'
  if (days < 1) return 'today'
  if (days === 1) return '1 day'
  if (days < 30) return `${days}d`
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months}mo`
  }
  const years = (days / 365).toFixed(1)
  return `${years}y`
}

export function kindLabel(kind: DebtKind): string {
  const labels: Record<DebtKind, string> = {
    todo: 'TODO',
    fixme: 'FIXME',
    hack: 'HACK',
    xxx: 'XXX',
    bug: 'BUG',
    deprecated: '@deprecated',
  }
  return labels[kind]
}

export function ageLabel(bucket: AgeBucket): string {
  const labels: Record<AgeBucket, string> = {
    fresh: '< 30d',
    recent: '30–90d',
    aging: '90–180d',
    stale: '180–365d',
    ancient: '> 1y',
    unknown: 'Unknown',
  }
  return labels[bucket]
}

export function matchesGitUser(
  item: DebtItem,
  user: { name?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!user || !item.blame) return false
  const email = user.email?.trim().toLowerCase()
  const name = user.name?.trim().toLowerCase()
  if (email && item.blame.authorEmail?.toLowerCase() === email) return true
  if (name && item.blame.author?.toLowerCase() === name) return true
  return false
}

export function filterItems(
  items: DebtItem[],
  opts: {
    kind?: DebtKind | 'all'
    age?: AgeBucket | 'all'
    query?: string
    mine?: boolean
    gitUser?: { name?: string | null; email?: string | null } | null
    author?: string | null
  },
): DebtItem[] {
  const q = opts.query?.trim().toLowerCase() ?? ''
  const author = opts.author?.trim().toLowerCase() ?? ''
  return items.filter((item) => {
    if (opts.kind && opts.kind !== 'all' && item.kind !== opts.kind)
      return false
    if (opts.age && opts.age !== 'all' && item.ageBucket !== opts.age)
      return false
    if (opts.mine && !matchesGitUser(item, opts.gitUser)) return false
    if (author) {
      const blameAuthor = item.blame?.author.toLowerCase() ?? ''
      const blameEmail = item.blame?.authorEmail.toLowerCase() ?? ''
      if (!blameAuthor.includes(author) && !blameEmail.includes(author)) {
        return false
      }
    }
    if (!q) return true
    return (
      item.message.toLowerCase().includes(q) ||
      item.relativePath.toLowerCase().includes(q) ||
      (item.blame?.author.toLowerCase().includes(q) ?? false) ||
      (item.tickets?.some((t) => t.key.toLowerCase().includes(q)) ?? false) ||
      item.kind.includes(q)
    )
  })
}
