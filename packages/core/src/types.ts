export type DebtKind = 'todo' | 'fixme' | 'hack' | 'xxx' | 'bug' | 'deprecated'

export type AgeBucket =
  | 'fresh' // < 30 days
  | 'recent' // 30–90 days
  | 'aging' // 90–180 days
  | 'stale' // 180–365 days
  | 'ancient' // > 365 days
  | 'unknown'

export interface BlameInfo {
  author: string
  authorEmail: string
  committedAt: string // ISO
  ageDays: number
  commitHash: string
  summary?: string
}

export interface TicketRef {
  /** Display key, e.g. ABC-123, #42 */
  key: string
  /** Absolute URL when known (inline URL, or resolved via base / GitHub remote) */
  url?: string
}

export interface DebtItemTriage {
  status: 'dismissed' | 'snoozed'
  until?: string
  note?: string
  updatedAt: string
}

export interface DebtItem {
  id: string
  kind: DebtKind
  message: string
  raw: string
  filePath: string
  relativePath: string
  line: number
  column: number
  context?: string
  blame?: BlameInfo
  ageBucket: AgeBucket
  tickets?: TicketRef[]
  /** Present when the item is dismissed or actively snoozed */
  triage?: DebtItemTriage
}

export interface AuthorDebt {
  author: string
  authorEmail: string
  total: number
  byKind: Record<DebtKind, number>
  oldestAgeDays: number | null
  averageAgeDays: number | null
  items: string[] // debt item ids
}

export interface FileDebt {
  path: string
  relativePath: string
  total: number
  byKind: Record<DebtKind, number>
  oldestAgeDays: number | null
  items: string[]
}

export interface DebtStats {
  totalItems: number
  totalFiles: number
  scannedFiles: number
  byKind: Record<DebtKind, number>
  byAge: Record<AgeBucket, number>
  authors: number
  oldestAgeDays: number | null
  averageAgeDays: number | null
  scanDurationMs: number
  blameEnabled: boolean
  blameCoverage: number // 0–1
  /** Count of dismissed/snoozed items hidden from the open set */
  triagedHidden?: number
}

export interface ProjectConfig {
  root: string
  name: string
  isGitRepo: boolean
}

export interface SearchEntry {
  id: string
  label: string
  kind: DebtKind
  path: string
  keywords: string[]
}

export interface DebtReport {
  config: ProjectConfig
  items: DebtItem[]
  authors: AuthorDebt[]
  files: FileDebt[]
  searchIndex: SearchEntry[]
  stats: DebtStats
  scannedAt: string
}

export interface ScanOptions {
  root: string
  blame?: boolean
  incremental?: boolean
  changedFiles?: string[]
  /** Cache of previous items keyed by absolute file path */
  cache?: Map<string, DebtItem[]>
  /**
   * Template for issue keys, e.g. `https://linear.app/team/issue/{key}`.
   * Falls back to `TECH_DEBT_TICKET_BASE` env when omitted.
   */
  ticketBaseUrl?: string
  /** Apply `.tech-debt/state.json` triage (default true). */
  applyTriage?: boolean
  /** When triage is applied, keep dismissed/snoozed items in the list. */
  includeTriaged?: boolean
}

export interface ScanProgress {
  phase: 'discover' | 'scan' | 'blame' | 'aggregate' | 'done'
  message: string
  current?: number
  total?: number
}

/** All debt kinds in display order */
export const DEBT_KINDS: DebtKind[] = [
  'todo',
  'fixme',
  'hack',
  'xxx',
  'bug',
  'deprecated',
]
