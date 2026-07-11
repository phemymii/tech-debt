import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { ProjectConfig } from './types.js';

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.kt', '.kts',
  '.swift', '.rb', '.php', '.cs', '.scala',
  '.vue', '.svelte', '.css', '.scss', '.sass', '.less',
  '.html', '.htm',
  '.sh', '.bash', '.zsh', '.yml', '.yaml',
  '.sql', '.graphql', '.gql',
]);

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.expo',
  'android',
  'ios',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  '__tests__',
  '__mocks__',
  '.venv',
  'venv',
  '.idea',
  '.turbo',
  '.cache',
  'vendor',
  'Pods',
  '.gradle',
  'DerivedData',
  '.svelte-kit',
  'target',
  'bin',
  'obj',
  '.parcel-cache',
  '.yarn',
  'storybook-static',
]);

export function discoverProject(root: string): ProjectConfig {
  const resolved = path.resolve(root);
  const pkgPath = findNearestFile(resolved, 'package.json');
  const pkg = pkgPath ? readJson(pkgPath) : null;
  const name = (pkg?.name as string) ?? path.basename(resolved);
  const isGitRepo = isInsideGitRepo(resolved);

  return {
    root: resolved,
    name,
    isGitRepo,
  };
}

export function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  walk(root, root, files);
  return files;
}

function walk(root: string, dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(root, full, out);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    out.push(full);
  }
}

function findNearestFile(root: string, filename: string): string | null {
  let current = root;
  while (current !== path.dirname(current)) {
    const candidate = path.join(current, filename);
    if (fs.existsSync(candidate)) return candidate;
    current = path.dirname(current);
  }
  return null;
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isInsideGitRepo(root: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

export { SOURCE_EXTENSIONS, IGNORE_DIRS };
