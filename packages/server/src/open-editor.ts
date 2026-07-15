import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface OpenInEditorOptions {
  line?: number;
  column?: number;
}

/**
 * Open a file in the user's editor.
 * Paths are confined to projectRoot via realpath. Prefers TECH_DEBT_EDITOR,
 * then GUI CLIs (cursor/code), then OS openers. Ignores bare $EDITOR/$VISUAL
 * when they look like terminal editors (vim/nano).
 */
export async function openInEditor(
  filePath: string,
  projectRoot: string,
  options: OpenInEditorOptions = {},
): Promise<{ ok: boolean; editor?: string; error?: string; resolved?: string }> {
  let resolved: string;
  let root: string;
  try {
    resolved = fs.realpathSync(path.resolve(filePath));
    root = fs.realpathSync(path.resolve(projectRoot));
  } catch {
    resolved = path.resolve(filePath);
    root = path.resolve(projectRoot);
  }

  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootPrefix)) {
    return { ok: false, error: 'Path is outside the project root', resolved };
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return { ok: false, error: `File not found: ${filePath}`, resolved };
  }

  const target = formatGotoTarget(resolved, options.line, options.column);
  const candidates = buildEditorCandidates();

  for (const { command, args, supportsGoto } of candidates) {
    const fileArg = supportsGoto ? target : resolved;
    const ok = await tryLaunch(command, [...args, fileArg]);
    if (ok) return { ok: true, editor: command, resolved };
  }

  return {
    ok: false,
    error:
      'No editor found. Install the Cursor/VS Code CLI, or set TECH_DEBT_EDITOR.',
    resolved,
  };
}

function formatGotoTarget(
  filePath: string,
  line?: number,
  column?: number,
): string {
  if (line == null || !Number.isFinite(line) || line < 1) return filePath;
  const col =
    column != null && Number.isFinite(column) && column >= 1
      ? Math.floor(column)
      : undefined;
  return col != null
    ? `${filePath}:${Math.floor(line)}:${col}`
    : `${filePath}:${Math.floor(line)}`;
}

interface EditorCandidate {
  command: string;
  args: string[];
  /** Whether the CLI accepts file:line:column as the path argument */
  supportsGoto: boolean;
}

function buildEditorCandidates(): EditorCandidate[] {
  const list: EditorCandidate[] = [];

  const explicit = process.env.TECH_DEBT_EDITOR?.trim();
  if (explicit) {
    const parts = explicit.split(/\s+/);
    list.push({
      command: parts[0],
      args: parts.slice(1),
      supportsGoto: true,
    });
  }

  // GUI editors first — $EDITOR is often vim/nano in shells and would "succeed" wrongly
  list.push(
    { command: 'cursor', args: ['-g'], supportsGoto: true },
    { command: 'code', args: ['-g'], supportsGoto: true },
    { command: 'subl', args: [], supportsGoto: true },
  );

  const fromEnv = [process.env.VISUAL, process.env.EDITOR]
    .filter((v): v is string => !!v?.trim())
    .filter((v) => !isTerminalEditor(v));

  for (const v of fromEnv) {
    const parts = v.trim().split(/\s+/);
    list.push({
      command: parts[0],
      args: parts.slice(1),
      supportsGoto: true,
    });
  }

  if (process.platform === 'darwin') {
    list.push(
      { command: 'open', args: ['-a', 'Cursor'], supportsGoto: false },
      {
        command: 'open',
        args: ['-a', 'Visual Studio Code'],
        supportsGoto: false,
      },
      { command: 'open', args: [], supportsGoto: false },
    );
  }

  if (process.platform === 'linux') {
    list.push({ command: 'xdg-open', args: [], supportsGoto: false });
  }

  if (process.platform === 'win32') {
    // `start "" <file>` — empty quoted title required by cmd
    list.push({
      command: 'cmd',
      args: ['/c', 'start', '""'],
      supportsGoto: false,
    });
  }

  return list;
}

function isTerminalEditor(cmd: string): boolean {
  const base = path.basename(cmd.trim().split(/\s+/)[0] ?? '').toLowerCase();
  return ['vim', 'nvim', 'vi', 'nano', 'emacs', 'ed', 'pico', 'micro'].includes(
    base,
  );
}

async function commandExists(command: string): Promise<boolean> {
  if (command.includes(path.sep) || command.includes('/')) {
    return fs.existsSync(command);
  }
  try {
    const which = process.platform === 'win32' ? 'where' : 'which';
    await execFileAsync(which, [command]);
    return true;
  } catch {
    return false;
  }
}

async function tryLaunch(command: string, args: string[]): Promise<boolean> {
  if (!(await commandExists(command))) return false;

  return new Promise((resolve) => {
    // Never use shell: true with a separate args array (Node DEP0190).
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      env: process.env,
      windowsHide: true,
    });

    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    child.on('error', () => done(false));
    // Non-zero exit soon after launch usually means the CLI rejected the args
    child.on('exit', (code) => {
      if (code !== null && code !== 0) done(false);
    });

    child.unref();
    setTimeout(() => done(true), 120);
  });
}
