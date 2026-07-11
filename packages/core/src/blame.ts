import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { BlameInfo } from './types.js';

const execFileAsync = promisify(execFile);

interface LineBlame {
  line: number;
  info: BlameInfo;
}

/**
 * Blame specific lines in a file using a single `git blame --line-porcelain` pass.
 * Returns a map of line number → blame info.
 */
export async function blameFileLines(
  root: string,
  filePath: string,
  lines: number[],
): Promise<Map<number, BlameInfo>> {
  const result = new Map<number, BlameInfo>();
  if (lines.length === 0) return result;

  const unique = [...new Set(lines)].sort((a, b) => a - b);

  try {
    // Blame the whole file once — cheaper than N -L calls for dense debt files
    const { stdout } = await execFileAsync(
      'git',
      ['blame', '--line-porcelain', '--', filePath],
      {
        cwd: root,
        maxBuffer: 20 * 1024 * 1024,
        encoding: 'utf-8',
      },
    );

    const parsed = parsePorcelain(stdout);
    const wanted = new Set(unique);
    for (const entry of parsed) {
      if (wanted.has(entry.line)) {
        result.set(entry.line, entry.info);
      }
    }
  } catch {
    // Not a git repo, untracked file, or git unavailable — leave empty
  }

  return result;
}

function parsePorcelain(stdout: string): LineBlame[] {
  const entries: LineBlame[] = [];
  const blocks = stdout.split(/\n(?=[0-9a-f]{40} )/i);

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    const header = lines[0]?.match(/^([0-9a-f]{40})\s+(\d+)\s+(\d+)(?:\s+(\d+))?/i);
    if (!header) continue;

    const commitHash = header[1];
    const resultLine = parseInt(header[3], 10);
    let author = 'Unknown';
    let authorEmail = '';
    let authorTime = 0;
    let summary = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('author ')) author = line.slice(7);
      else if (line.startsWith('author-mail ')) {
        authorEmail = line.slice(12).replace(/^<|>$/g, '');
      } else if (line.startsWith('author-time ')) {
        authorTime = parseInt(line.slice(12), 10) * 1000;
      } else if (line.startsWith('summary ')) {
        summary = line.slice(8);
      } else if (line.startsWith('\t')) {
        break;
      }
    }

    const committedAt = authorTime
      ? new Date(authorTime).toISOString()
      : new Date(0).toISOString();
    const ageDays = authorTime
      ? Math.max(0, Math.floor((Date.now() - authorTime) / (1000 * 60 * 60 * 24)))
      : 0;

    entries.push({
      line: resultLine,
      info: {
        author,
        authorEmail,
        committedAt,
        ageDays,
        commitHash: commitHash.slice(0, 12),
        summary: summary || undefined,
      },
    });
  }

  return entries;
}
