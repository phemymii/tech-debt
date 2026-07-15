import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { discoverProject, collectSourceFiles } from './discovery.js';
import { parseComments } from './comment-parser.js';
import { blameFileLines } from './blame.js';
import {
  ageBucketFromDays,
  buildAuthors,
  buildFiles,
  buildSearchIndex,
  buildStats,
} from './aggregate.js';
import { extractTickets, resolveGithubIssuesBase } from './tickets.js';
import { applyTriageToReport, loadTriageState } from './triage.js';
import type {
  DebtItem,
  DebtReport,
  ScanOptions,
  ScanProgress,
} from './types.js';

export type ProgressCallback = (progress: ScanProgress) => void;

export async function scanProject(
  options: ScanOptions,
  onProgress?: ProgressCallback,
): Promise<DebtReport> {
  const started = Date.now();
  const blameEnabled = options.blame !== false;

  onProgress?.({ phase: 'discover', message: 'Discovering project...' });
  const config = discoverProject(options.root);
  const shouldBlame = blameEnabled && config.isGitRepo;
  const ticketBaseUrl =
    options.ticketBaseUrl?.trim() ||
    process.env.TECH_DEBT_TICKET_BASE?.trim() ||
    undefined;
  const githubIssuesBase = resolveGithubIssuesBase(config.root);

  let files: string[];
  if (options.incremental && options.changedFiles && options.cache) {
    files = options.changedFiles.filter((f) => fs.existsSync(f));
    for (const changed of options.changedFiles) {
      if (!files.includes(changed)) {
        options.cache.delete(changed);
      }
    }
  } else {
    files = collectSourceFiles(config.root);
    options.cache?.clear();
  }

  onProgress?.({
    phase: 'scan',
    message: `Scanning ${files.length} files...`,
    current: 0,
    total: files.length,
  });

  const fileItems = new Map<string, DebtItem[]>();
  let scanned = 0;

  for (const filePath of files) {
    scanned++;
    if (scanned % 50 === 0 || scanned === files.length) {
      onProgress?.({
        phase: 'scan',
        message: `Scanning files (${scanned}/${files.length})...`,
        current: scanned,
        total: files.length,
      });
    }

    try {
      const content = await fsp.readFile(filePath, 'utf-8');
      // Skip huge / binary-looking files
      if (content.length > 1_500_000 || content.includes('\0')) continue;

      const relativePath = path.relative(config.root, filePath);
      const matches = parseComments(content, relativePath);
      if (matches.length === 0) {
        fileItems.set(filePath, []);
        continue;
      }

      const items: DebtItem[] = matches.map((m, idx) => {
        const tickets = extractTickets(`${m.message} ${m.raw}`, {
          ticketBaseUrl,
          githubIssuesBase,
        });
        return {
          id: `debt:${relativePath}:${m.line}:${m.kind}:${idx}`,
          kind: m.kind,
          message: m.message,
          raw: m.raw,
          filePath,
          relativePath,
          line: m.line,
          column: m.column,
          context: m.context,
          ageBucket: 'unknown' as const,
          ...(tickets.length > 0 ? { tickets } : {}),
        };
      });

      fileItems.set(filePath, items);
    } catch {
      // Unreadable file — skip
    }
  }

  // Merge with cache for incremental scans
  if (options.incremental && options.cache) {
    for (const [filePath, items] of fileItems) {
      options.cache.set(filePath, items);
    }
  } else if (options.cache) {
    for (const [filePath, items] of fileItems) {
      options.cache.set(filePath, items);
    }
  }

  const cacheSource = options.cache ?? fileItems;
  const allBeforeBlame: DebtItem[] = [];
  for (const items of cacheSource.values()) {
    allBeforeBlame.push(...items);
  }

  // Group by file for blame
  if (shouldBlame) {
    const byFile = new Map<string, DebtItem[]>();
    for (const item of allBeforeBlame) {
      const list = byFile.get(item.filePath) ?? [];
      list.push(item);
      byFile.set(item.filePath, list);
    }

    const filePaths = [...byFile.keys()];
    onProgress?.({
      phase: 'blame',
      message: `Running git blame on ${filePaths.length} files...`,
      current: 0,
      total: filePaths.length,
    });

    let blamed = 0;
    // Concurrency limit to avoid spawning too many git processes
    const concurrency = 8;
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (filePath) => {
          const items = byFile.get(filePath)!;
          const lines = items.map((it) => it.line);
          const blameMap = await blameFileLines(config.root, filePath, lines);
          for (const item of items) {
            const blame = blameMap.get(item.line);
            if (blame) {
              item.blame = blame;
              item.ageBucket = ageBucketFromDays(blame.ageDays);
            }
          }
        }),
      );
      blamed += batch.length;
      onProgress?.({
        phase: 'blame',
        message: `Git blame (${blamed}/${filePaths.length})...`,
        current: blamed,
        total: filePaths.length,
      });
    }
  }

  onProgress?.({ phase: 'aggregate', message: 'Building report...' });

  const items = allBeforeBlame.sort((a, b) => {
    const ageA = a.blame?.ageDays ?? -1;
    const ageB = b.blame?.ageDays ?? -1;
    if (ageA !== ageB) return ageB - ageA;
    return a.relativePath.localeCompare(b.relativePath) || a.line - b.line;
  });

  // Re-sync cache with blamed items
  if (options.cache) {
    const regrouped = new Map<string, DebtItem[]>();
    for (const item of items) {
      const list = regrouped.get(item.filePath) ?? [];
      list.push(item);
      regrouped.set(item.filePath, list);
    }
    for (const [filePath, list] of regrouped) {
      options.cache.set(filePath, list);
    }
  }

  const scannedFiles =
    options.incremental && options.cache
      ? options.cache.size
      : files.length;

  let report: DebtReport = {
    config,
    items,
    authors: buildAuthors(items),
    files: buildFiles(items),
    searchIndex: buildSearchIndex(items),
    stats: buildStats(items, scannedFiles, Date.now() - started, shouldBlame),
    scannedAt: new Date().toISOString(),
  };

  if (options.applyTriage !== false) {
    report = applyTriageToReport(report, loadTriageState(config.root), {
      includeTriaged: options.includeTriaged === true,
    });
  }

  onProgress?.({
    phase: 'done',
    message: `Found ${report.items.length} debt items`,
  });
  return report;
}

export function getItemDetail(
  report: DebtReport,
  itemId: string,
): DebtItem | null {
  return report.items.find((i) => i.id === itemId) ?? null;
}

export function getFileDebt(
  report: DebtReport,
  filePath: string,
): { file: DebtReport['files'][number]; items: DebtItem[] } | null {
  const normalized = filePath.replace(/^file:/, '');
  const file =
    report.files.find(
      (f) =>
        f.path === normalized ||
        f.relativePath === normalized ||
        f.path.endsWith(normalized),
    ) ?? null;
  if (!file) return null;
  const items = report.items.filter((i) => file.items.includes(i.id));
  return { file, items };
}

export function getAuthorDebt(
  report: DebtReport,
  author: string,
): { author: DebtReport['authors'][number]; items: DebtItem[] } | null {
  const entry =
    report.authors.find(
      (a) => a.author === author || a.authorEmail === author,
    ) ?? null;
  if (!entry) return null;
  const items = report.items.filter((i) => entry.items.includes(i.id));
  return { author: entry, items };
}
