import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import chokidar, { type FSWatcher } from 'chokidar';
import open from 'open';
import {
  scanProject,
  getItemDetail,
  getFileDebt,
  getAuthorDebt,
  loadIgnoreMatcher,
  getGitUser,
  applyTriageToReport,
  loadTriageState,
  saveTriageState,
  dismissItem,
  snoozeItem,
  restoreItem,
  triageKey,
  SOURCE_EXTENSIONS,
  IGNORE_DIRS,
  type DebtReport,
  type DebtItem,
} from '@tech-debt/core';
import { openInEditor } from './open-editor.js';

export interface ServerOptions {
  projectRoot: string;
  port?: number;
  openBrowser?: boolean;
  watch?: boolean;
  blame?: boolean;
  webDistPath?: string;
}

export interface ServerInstance {
  url: string;
  port: number;
  close: () => Promise<void>;
  rescan: () => Promise<DebtReport>;
}

const DEFAULT_PORT = 4589;

export async function startServer(options: ServerOptions): Promise<ServerInstance> {
  const {
    projectRoot,
    port = DEFAULT_PORT,
    openBrowser = true,
    watch = true,
    blame = true,
    webDistPath,
  } = options;

  const app = Fastify({ logger: false });
  /** Full scan without triage filtering (items may still lack triage annotations). */
  let rawReport: DebtReport | null = null;
  let report: DebtReport | null = null;
  let includeTriaged = false;
  const fileCache = new Map<string, DebtItem[]>();
  const wsClients = new Set<{ send: (data: string) => void }>();

  await app.register(cors, { origin: true });
  await app.register(websocket);

  const webPath =
    webDistPath ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'web');

  if (webDistPath || pathExists(webPath)) {
    await app.register(fastifyStatic, {
      root: webPath,
      prefix: '/',
      wildcard: false,
    });
  }

  function presentReport(include = includeTriaged): DebtReport | null {
    if (!rawReport) return null;
    return applyTriageToReport(rawReport, loadTriageState(projectRoot), {
      includeTriaged: include,
    });
  }

  async function doScan(
    incremental = false,
    changedFiles?: string[],
  ): Promise<DebtReport> {
    rawReport = await scanProject({
      root: projectRoot,
      blame,
      incremental,
      changedFiles,
      cache: fileCache,
      applyTriage: false,
    });
    report = presentReport()!;
    return report;
  }

  function publishReport(): DebtReport {
    report = presentReport()!;
    broadcast({ type: 'report-update', data: report });
    return report;
  }

  app.get('/api/health', async () => ({
    status: 'ok',
    project: projectRoot,
  }));

  app.get('/api/me', async () => {
    const user = getGitUser(projectRoot);
    return user ?? { name: null, email: null };
  });

  app.get('/api/report', async (req) => {
    if (!rawReport) await doScan();
    const q = req.query as { triaged?: string };
    const showTriaged = q.triaged === '1' || q.triaged === 'true';
    includeTriaged = showTriaged;
    report = presentReport(showTriaged)!;
    return report;
  });

  // Alias for familiarity with arch-atlas clients
  app.get('/api/graph', async (req) => {
    if (!rawReport) await doScan();
    const q = req.query as { triaged?: string };
    const showTriaged = q.triaged === '1' || q.triaged === 'true';
    includeTriaged = showTriaged;
    report = presentReport(showTriaged)!;
    return report;
  });

  app.get('/api/stats', async () => {
    if (!report) await doScan();
    return report!.stats;
  });

  app.get('/api/items', async (req) => {
    if (!report) await doScan();
    const q = req.query as {
      kind?: string;
      author?: string;
      age?: string;
      file?: string;
    };
    let items = report!.items;
    if (q.kind && q.kind !== 'all') {
      items = items.filter((i) => i.kind === q.kind);
    }
    if (q.author) {
      const a = q.author.toLowerCase();
      items = items.filter(
        (i) =>
          i.blame?.author.toLowerCase().includes(a) ||
          i.blame?.authorEmail.toLowerCase().includes(a),
      );
    }
    if (q.age && q.age !== 'all') {
      items = items.filter((i) => i.ageBucket === q.age);
    }
    if (q.file) {
      const f = q.file.toLowerCase();
      items = items.filter((i) => i.relativePath.toLowerCase().includes(f));
    }
    return items;
  });

  app.get('/api/item/*', async (req) => {
    if (!report) await doScan();
    const wildcard = (req.params as Record<string, string>)['*'] ?? '';
    const id = decodeURIComponent(wildcard);
    return getItemDetail(report!, id) ?? { error: 'Item not found' };
  });

  app.get('/api/authors', async () => {
    if (!report) await doScan();
    return report!.authors;
  });

  app.get('/api/author/:name', async (req) => {
    if (!report) await doScan();
    const name = decodeURIComponent((req.params as { name: string }).name);
    return getAuthorDebt(report!, name) ?? { error: 'Author not found' };
  });

  app.get('/api/files', async () => {
    if (!report) await doScan();
    return report!.files;
  });

  app.get('/api/file/*', async (req) => {
    if (!report) await doScan();
    const wildcard = (req.params as Record<string, string>)['*'] ?? '';
    const filePath = decodeURIComponent(wildcard);
    return getFileDebt(report!, filePath) ?? { error: 'File not found' };
  });

  app.get('/api/search', async (req) => {
    if (!report) await doScan();
    const q = ((req.query as { q?: string }).q ?? '').toLowerCase();
    if (!q) return report!.searchIndex.slice(0, 50);
    return report!.searchIndex
      .filter(
        (entry) =>
          entry.keywords.some((k) => k.toLowerCase().includes(q)) ||
          entry.label.toLowerCase().includes(q) ||
          entry.path.toLowerCase().includes(q),
      )
      .slice(0, 50);
  });

  app.post('/api/rescan', async () => {
    const result = await doScan();
    broadcast({ type: 'report-update', data: result });
    return { ok: true, stats: result.stats };
  });

  app.get('/api/triage', async () => {
    const state = loadTriageState(projectRoot);
    return {
      entries: state.entries,
      count: Object.keys(state.entries).length,
    };
  });

  app.post<{
    Body: {
      itemId?: string;
      action?: 'dismiss' | 'snooze' | 'restore';
      days?: number;
      note?: string;
      includeTriaged?: boolean;
    };
  }>('/api/triage', async (req) => {
    if (!rawReport) await doScan();
    const body = req.body ?? {};
    const itemId = body.itemId;
    const action = body.action;
    if (!itemId || typeof itemId !== 'string') {
      return { ok: false, error: 'Missing itemId' };
    }
    if (
      action !== 'dismiss' &&
      action !== 'snooze' &&
      action !== 'restore'
    ) {
      return { ok: false, error: 'Invalid action' };
    }

    const item =
      rawReport!.items.find((i) => i.id === itemId) ??
      report?.items.find((i) => i.id === itemId);
    if (!item) {
      return { ok: false, error: 'Item not found' };
    }

    let state = loadTriageState(projectRoot);
    if (action === 'dismiss') {
      state = dismissItem(state, item, body.note);
    } else if (action === 'snooze') {
      const days = typeof body.days === 'number' ? body.days : 7;
      state = snoozeItem(state, item, days, body.note);
    } else {
      state = restoreItem(state, item);
    }
    saveTriageState(projectRoot, state);

    if (typeof body.includeTriaged === 'boolean') {
      includeTriaged = body.includeTriaged;
    }
    const next = publishReport();
    return {
      ok: true,
      key: triageKey(item),
      action,
      stats: next.stats,
      report: next,
    };
  });

  app.post<{
    Body: { path?: string; line?: number; column?: number };
  }>('/api/open', async (req) => {
    const filePath = req.body?.path;
    if (!filePath || typeof filePath !== 'string') {
      return { ok: false, error: 'Missing path' };
    }

    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, filePath);

    const line =
      typeof req.body?.line === 'number' ? req.body.line : undefined;
    const column =
      typeof req.body?.column === 'number' ? req.body.column : undefined;

    return openInEditor(absolute, projectRoot, { line, column });
  });

  app.get('/ws', { websocket: true }, (socket) => {
    wsClients.add(socket);
    if (report) {
      socket.send(JSON.stringify({ type: 'report-update', data: report }));
    }
    socket.on('close', () => wsClients.delete(socket));
  });

  function broadcast(message: unknown): void {
    const data = JSON.stringify(message);
    for (const client of wsClients) {
      try {
        client.send(data);
      } catch {
        wsClients.delete(client);
      }
    }
  }

  let watcher: FSWatcher | null = null;

  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith('/ws')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    if (pathExists(path.join(webPath, 'index.html'))) {
      return reply.sendFile('index.html');
    }
    return reply
      .status(404)
      .send({ error: 'Web UI not built. Run npm run build.' });
  });

  await doScan();

  await app.listen({ port, host: '127.0.0.1' });
  const url = `http://localhost:${port}`;

  if (watch) {
    watcher = startProjectWatcher({
      projectRoot,
      onChange: async (changed) => {
        broadcast({ type: 'scanning', changed });
        try {
          const result = await doScan(true, changed);
          broadcast({ type: 'report-update', data: result });
        } catch (err) {
          console.error(
            '[tech-debt] rescan failed:',
            err instanceof Error ? err.message : err,
          );
          broadcast({ type: 'scanning', changed: [] });
        }
      },
      onDisabled: () => {
        watcher = null;
      },
    });
  }

  if (openBrowser) {
    await open(url);
  }

  return {
    url,
    port,
    close: async () => {
      if (watcher) await watcher.close();
      await app.close();
    },
    rescan: () => doScan(),
  };
}

function startProjectWatcher(options: {
  projectRoot: string;
  onChange: (changed: string[]) => void | Promise<void>;
  onDisabled: () => void;
}): FSWatcher {
  const { projectRoot, onChange, onDisabled } = options;
  const ignore = loadIgnoreMatcher(projectRoot);

  const watcher = chokidar.watch(projectRoot, {
    ignored: (watchedPath: string) =>
      shouldIgnoreWatchPath(watchedPath, projectRoot, ignore),
    persistent: true,
    ignoreInitial: true,
    // Avoid opening an extra FD per path via existsSync/stat in ignored.
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignorePermissionErrors: true,
  });

  let disabled = false;
  const disableWatcher = (reason: string) => {
    if (disabled) return;
    disabled = true;
    console.error(`[tech-debt] ${reason}`);
    void watcher.close().finally(() => onDisabled());
  };

  watcher.on('error', (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    if (/EMFILE|ENFILE|too many open files/i.test(message)) {
      disableWatcher(
        'Live reload disabled (too many open files). Use Rescan in the UI or run with --no-watch.',
      );
      return;
    }
    console.error('[tech-debt] watcher error:', message);
  });

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingChanges = new Set<string>();

  const handleChange = (filePath: string) => {
    if (disabled) return;
    pendingChanges.add(filePath);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const changed = [...pendingChanges];
      pendingChanges.clear();
      void onChange(changed);
    }, 500);
  };

  watcher.on('change', handleChange);
  watcher.on('add', handleChange);
  watcher.on('unlink', handleChange);

  return watcher;
}

/** Fast ignore path — no fs.stat (stat during watch setup blows the FD limit). */
function shouldIgnoreWatchPath(
  watchedPath: string,
  projectRoot: string,
  ignore: ReturnType<typeof loadIgnoreMatcher>,
): boolean {
  if (watchedPath === projectRoot) return false;

  const base = path.basename(watchedPath);
  if (base.startsWith('.')) return true;
  if (IGNORE_DIRS.has(base)) return true;

  // Any path segment that matches a known heavy directory.
  for (const part of watchedPath.split(/[/\\]/)) {
    if (IGNORE_DIRS.has(part)) return true;
  }

  const relative = path.relative(projectRoot, watchedPath).replace(/\\/g, '/');
  if (!relative || relative === '.' || relative.startsWith('..')) return true;

  const ext = path.extname(base).toLowerCase();
  // Files with a non-source extension never need watching.
  if (ext && !SOURCE_EXTENSIONS.has(ext)) return true;

  if (ignore.ignoresDirectory(relative) || ignore.ignores(relative)) {
    return true;
  }

  return false;
}

function pathExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
