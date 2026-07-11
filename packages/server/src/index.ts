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
  type DebtReport,
  type DebtItem,
} from '@tech-debt/core';

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
  let report: DebtReport | null = null;
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

  async function doScan(
    incremental = false,
    changedFiles?: string[],
  ): Promise<DebtReport> {
    report = await scanProject({
      root: projectRoot,
      blame,
      incremental,
      changedFiles,
      cache: fileCache,
    });
    return report;
  }

  app.get('/api/health', async () => ({
    status: 'ok',
    project: projectRoot,
  }));

  app.get('/api/report', async () => {
    if (!report) await doScan();
    return report;
  });

  // Alias for familiarity with arch-atlas clients
  app.get('/api/graph', async () => {
    if (!report) await doScan();
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
  if (watch) {
    watcher = chokidar.watch(projectRoot, {
      ignored: [
        /(^|[/\\])\../, // dotfiles/dirs
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        /out/,
        /\.next/,
        /coverage/,
        /android/,
        /ios/,
        /\.turbo/,
        /\.cache/,
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      ignorePermissionErrors: true,
    });

    watcher.on('error', (err: unknown) => {
      // Don't crash the dashboard if the OS hits file-watch limits
      const message = err instanceof Error ? err.message : String(err);
      console.error('[tech-debt] watcher error:', message);
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingChanges = new Set<string>();

    const handleChange = (filePath: string) => {
      pendingChanges.add(filePath);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const changed = [...pendingChanges];
        pendingChanges.clear();
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
      }, 500);
    };

    watcher.on('change', handleChange);
    watcher.on('add', handleChange);
    watcher.on('unlink', handleChange);
  }

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

function pathExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
