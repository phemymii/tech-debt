export type {
  DebtKind,
  AgeBucket,
  BlameInfo,
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

export { discoverProject, collectSourceFiles } from './discovery.js';
export { parseComments } from './comment-parser.js';
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
