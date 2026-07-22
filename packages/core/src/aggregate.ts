import type {
  AgeBucket,
  AuthorDebt,
  DebtItem,
  DebtKind,
  DebtStats,
  FileDebt,
  SearchEntry,
} from './types.js'

export function ageBucketFromDays(days: number | null | undefined): AgeBucket {
  if (days == null || Number.isNaN(days)) return 'unknown'
  if (days < 30) return 'fresh'
  if (days < 90) return 'recent'
  if (days < 180) return 'aging'
  if (days < 365) return 'stale'
  return 'ancient'
}

export function emptyKindCounts(): Record<DebtKind, number> {
  return { todo: 0, fixme: 0, hack: 0, xxx: 0, bug: 0, deprecated: 0 }
}

export function emptyAgeCounts(): Record<AgeBucket, number> {
  return {
    fresh: 0,
    recent: 0,
    aging: 0,
    stale: 0,
    ancient: 0,
    unknown: 0,
  }
}

export function buildAuthors(items: DebtItem[]): AuthorDebt[] {
  const map = new Map<string, AuthorDebt>()

  for (const item of items) {
    const author = item.blame?.author ?? 'Unknown'
    const email = item.blame?.authorEmail ?? ''
    const key = `${author}|${email}`

    let entry = map.get(key)
    if (!entry) {
      entry = {
        author,
        authorEmail: email,
        total: 0,
        byKind: emptyKindCounts(),
        oldestAgeDays: null,
        averageAgeDays: null,
        items: [],
      }
      map.set(key, entry)
    }

    entry.total++
    entry.byKind[item.kind]++
    entry.items.push(item.id)

    const age = item.blame?.ageDays
    if (age != null) {
      entry.oldestAgeDays =
        entry.oldestAgeDays == null ? age : Math.max(entry.oldestAgeDays, age)
    }
  }

  for (const entry of map.values()) {
    const ages = entry.items
      .map((id) => items.find((i) => i.id === id)?.blame?.ageDays)
      .filter((d): d is number => d != null)
    entry.averageAgeDays =
      ages.length === 0
        ? null
        : Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function buildFiles(items: DebtItem[]): FileDebt[] {
  const map = new Map<string, FileDebt>()

  for (const item of items) {
    let entry = map.get(item.filePath)
    if (!entry) {
      entry = {
        path: item.filePath,
        relativePath: item.relativePath,
        total: 0,
        byKind: emptyKindCounts(),
        oldestAgeDays: null,
        items: [],
      }
      map.set(item.filePath, entry)
    }

    entry.total++
    entry.byKind[item.kind]++
    entry.items.push(item.id)

    const age = item.blame?.ageDays
    if (age != null) {
      entry.oldestAgeDays =
        entry.oldestAgeDays == null ? age : Math.max(entry.oldestAgeDays, age)
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function buildSearchIndex(items: DebtItem[]): SearchEntry[] {
  return items.map((item) => ({
    id: item.id,
    label: item.message,
    kind: item.kind,
    path: item.relativePath,
    keywords: [
      item.kind,
      item.message,
      item.relativePath,
      item.blame?.author ?? '',
      item.raw,
      ...(item.tickets?.map((t) => t.key) ?? []),
    ].filter(Boolean),
  }))
}

export function buildStats(
  items: DebtItem[],
  scannedFiles: number,
  scanDurationMs: number,
  blameEnabled: boolean,
): DebtStats {
  const byKind = emptyKindCounts()
  const byAge = emptyAgeCounts()
  const authors = new Set<string>()
  const ages: number[] = []
  let blamed = 0

  for (const item of items) {
    byKind[item.kind]++
    byAge[item.ageBucket]++
    if (item.blame) {
      blamed++
      authors.add(`${item.blame.author}|${item.blame.authorEmail}`)
      ages.push(item.blame.ageDays)
    }
  }

  const fileSet = new Set(items.map((i) => i.filePath))

  return {
    totalItems: items.length,
    totalFiles: fileSet.size,
    scannedFiles,
    byKind,
    byAge,
    authors: authors.size,
    oldestAgeDays: ages.length ? Math.max(...ages) : null,
    averageAgeDays: ages.length
      ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      : null,
    scanDurationMs,
    blameEnabled,
    blameCoverage: items.length === 0 ? 0 : blamed / items.length,
  }
}
