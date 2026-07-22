export type {
  DebtKind,
  AgeBucket,
  BlameInfo,
  TicketRef,
  DebtItemTriage,
  DebtItem,
  AuthorDebt,
  FileDebt,
  DebtStats,
  ProjectConfig,
  SearchEntry,
  DebtReport,
  ScanOptions,
  ScanProgress,
} from './types.js';
export { DEBT_KINDS } from './types.js';

export {
  discoverProject,
  collectSourceFiles,
  getGitUser,
  SOURCE_EXTENSIONS,
  IGNORE_DIRS,
} from './discovery.js';
export {
  loadIgnoreMatcher,
  createIgnoreMatcher,
  parseIgnoreFile,
  DEFAULT_IGNORE_PATTERNS,
  type IgnoreMatcher,
} from './ignore.js';
export { parseComments } from './comment-parser.js';
export {
  extractTickets,
  resolveGithubIssuesBase,
  githubIssuesBaseFromRemote,
} from './tickets.js';
export {
  triageKey,
  triageStatePath,
  emptyTriageState,
  loadTriageState,
  saveTriageState,
  pruneExpired,
  isTriageActive,
  dismissItem,
  snoozeItem,
  restoreItem,
  applyTriageToReport,
  findItemByTriageKey,
  type TriageStatus,
  type TriageEntry,
  type TriageState,
} from './triage.js';
export { blameFileLines } from './blame.js';
export {
  ageBucketFromDays,
  buildAuthors,
  buildFiles,
  buildSearchIndex,
  buildStats,
  emptyKindCounts,
  emptyAgeCounts,
} from './aggregate.js';
export {
  scanProject,
  getItemDetail,
  getFileDebt,
  getAuthorDebt,
  type ProgressCallback,
} from './scanner.js';
