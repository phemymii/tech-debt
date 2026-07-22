import fs from 'node:fs'
import path from 'node:path'
import {
  buildAuthors,
  buildFiles,
  buildSearchIndex,
  buildStats,
} from './aggregate.js'
import type { DebtItem, DebtReport } from './types.js'

export type TriageStatus = 'dismissed' | 'snoozed'

export interface TriageEntry {
  status: TriageStatus
  /** ISO timestamp — required while snoozed; ignored for dismissed */
  until?: string
  note?: string
  updatedAt: string
  label?: string
}

export interface TriageState {
  version: 1
  entries: Record<string, TriageEntry>
}

const STATE_DIR = '.tech-debt'
const STATE_FILE = 'state.json'

export function triageStatePath(root: string): string {
  return path.join(root, STATE_DIR, STATE_FILE)
}

/** Stable key so reordering matches on a line does not orphan triage. */
export function triageKey(
  item: Pick<DebtItem, 'relativePath' | 'line' | 'kind' | 'message'>,
): string {
  const msg = item.message
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 120)
  return `${item.relativePath}:${item.line}:${item.kind}:${msg}`
}

export function emptyTriageState(): TriageState {
  return { version: 1, entries: {} }
}

export function loadTriageState(root: string): TriageState {
  const file = triageStatePath(root)
  if (!fs.existsSync(file)) return emptyTriageState()
  try {
    const raw = JSON.parse(
      fs.readFileSync(file, 'utf-8'),
    ) as Partial<TriageState>
    if (!raw || typeof raw !== 'object' || !raw.entries) {
      return emptyTriageState()
    }
    return { version: 1, entries: raw.entries }
  } catch {
    return emptyTriageState()
  }
}

export function saveTriageState(root: string, state: TriageState): void {
  const dir = path.join(root, STATE_DIR)
  fs.mkdirSync(dir, { recursive: true })
  const cleaned = pruneExpired(state, new Date())
  fs.writeFileSync(
    triageStatePath(root),
    `${JSON.stringify(cleaned, null, 2)}\n`,
    'utf-8',
  )
}

export function pruneExpired(
  state: TriageState,
  now = new Date(),
): TriageState {
  const entries: Record<string, TriageEntry> = {}
  for (const [key, entry] of Object.entries(state.entries)) {
    if (entry.status === 'snoozed' && entry.until) {
      if (new Date(entry.until).getTime() <= now.getTime()) continue
    }
    entries[key] = entry
  }
  return { version: 1, entries }
}

export function isTriageActive(
  entry: TriageEntry | undefined,
  now = new Date(),
): entry is TriageEntry {
  if (!entry) return false
  if (entry.status === 'dismissed') return true
  if (entry.status === 'snoozed') {
    if (!entry.until) return true
    return new Date(entry.until).getTime() > now.getTime()
  }
  return false
}

export function dismissItem(
  state: TriageState,
  item: DebtItem,
  note?: string,
): TriageState {
  const key = triageKey(item)
  return {
    version: 1,
    entries: {
      ...state.entries,
      [key]: {
        status: 'dismissed',
        note: note?.trim() || undefined,
        updatedAt: new Date().toISOString(),
        label: `${item.kind}: ${item.message}`.slice(0, 160),
      },
    },
  }
}

export function snoozeItem(
  state: TriageState,
  item: DebtItem,
  days: number,
  note?: string,
): TriageState {
  const until = new Date()
  until.setDate(until.getDate() + Math.max(1, Math.floor(days)))
  const key = triageKey(item)
  return {
    version: 1,
    entries: {
      ...state.entries,
      [key]: {
        status: 'snoozed',
        until: until.toISOString(),
        note: note?.trim() || undefined,
        updatedAt: new Date().toISOString(),
        label: `${item.kind}: ${item.message}`.slice(0, 160),
      },
    },
  }
}

export function restoreItem(state: TriageState, item: DebtItem): TriageState {
  const key = triageKey(item)
  if (!(key in state.entries)) return state
  const entries = { ...state.entries }
  delete entries[key]
  return { version: 1, entries }
}

/**
 * Annotate items with triage, optionally hide active triage from the open set,
 * and rebuild aggregations for the visible items.
 */
export function applyTriageToReport(
  report: DebtReport,
  state: TriageState,
  options?: { includeTriaged?: boolean; now?: Date },
): DebtReport {
  const now = options?.now ?? new Date()
  const pruned = pruneExpired(state, now)
  const includeTriaged = options?.includeTriaged === true

  const annotated: DebtItem[] = report.items.map((item) => {
    const entry = pruned.entries[triageKey(item)]
    if (!isTriageActive(entry, now)) {
      if (!item.triage) return item
      const { triage: _removed, ...rest } = item
      return rest
    }
    return {
      ...item,
      triage: {
        status: entry.status,
        until: entry.until,
        note: entry.note,
        updatedAt: entry.updatedAt,
      },
    }
  })

  const open = annotated.filter((item) => !item.triage)
  const items = includeTriaged ? annotated : open
  const hiddenCount = annotated.length - open.length

  // Aggregations always reflect open (non-triaged) debt for stable defaults.
  return {
    ...report,
    items,
    authors: buildAuthors(open),
    files: buildFiles(open),
    searchIndex: buildSearchIndex(items),
    stats: {
      ...buildStats(
        open,
        report.stats.scannedFiles,
        report.stats.scanDurationMs,
        report.stats.blameEnabled,
      ),
      triagedHidden: hiddenCount,
    },
  }
}

export function findItemByTriageKey(
  items: DebtItem[],
  key: string,
): DebtItem | null {
  return items.find((item) => triageKey(item) === key) ?? null
}
