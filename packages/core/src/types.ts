export type DebtKind = 'todo' | 'fixme' | 'deprecated';

export type AgeBucket =
  | 'fresh'      // < 30 days
  | 'recent'     // 30–90 days
  | 'aging'      // 90–180 days
  | 'stale'      // 180–365 days
  | 'ancient'    // > 365 days
  | 'unknown';

export interface BlameInfo {
  author: string;
  authorEmail: string;
  committedAt: string; // ISO
  ageDays: number;
  commitHash: string;
  summary?: string;
}

export interface DebtItem {
  id: string;
  kind: DebtKind;
  message: string;
  raw: string;
  filePath: string;
  relativePath: string;
  line: number;
  column: number;
  context?: string;
  blame?: BlameInfo;
  ageBucket: AgeBucket;
}

export interface AuthorDebt {
  author: string;
  authorEmail: string;
  total: number;
  byKind: Record<DebtKind, number>;
  oldestAgeDays: number | null;
  averageAgeDays: number | null;
  items: string[]; // debt item ids
}

export interface FileDebt {
  path: string;
  relativePath: string;
  total: number;
  byKind: Record<DebtKind, number>;
  oldestAgeDays: number | null;
  items: string[];
}

export interface DebtStats {
  totalItems: number;
  totalFiles: number;
  scannedFiles: number;
  byKind: Record<DebtKind, number>;
  byAge: Record<AgeBucket, number>;
  authors: number;
  oldestAgeDays: number | null;
  averageAgeDays: number | null;
  scanDurationMs: number;
  blameEnabled: boolean;
  blameCoverage: number; // 0–1
}

export interface ProjectConfig {
  root: string;
  name: string;
  isGitRepo: boolean;
}

export interface SearchEntry {
  id: string;
  label: string;
  kind: DebtKind;
  path: string;
  keywords: string[];
}

export interface DebtReport {
  config: ProjectConfig;
  items: DebtItem[];
  authors: AuthorDebt[];
  files: FileDebt[];
  searchIndex: SearchEntry[];
  stats: DebtStats;
  scannedAt: string;
}

export interface ScanOptions {
  root: string;
  blame?: boolean;
  incremental?: boolean;
  changedFiles?: string[];
  /** Cache of previous items keyed by absolute file path */
  cache?: Map<string, DebtItem[]>;
}

export interface ScanProgress {
  phase: 'discover' | 'scan' | 'blame' | 'aggregate' | 'done';
  message: string;
  current?: number;
  total?: number;
}
