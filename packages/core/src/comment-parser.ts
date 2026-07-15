import type { DebtKind } from './types.js';

export interface RawMatch {
  kind: DebtKind;
  message: string;
  raw: string;
  line: number;
  column: number;
  context?: string;
}

interface PatternDef {
  kind: DebtKind;
  /** Group 1 = optional prefix, group 2 = message (or group 1 = message for inline). */
  regex: RegExp;
  /** When true, group1 is prefix and group2 is message. */
  hasPrefix?: boolean;
}

const MARKERS: Array<{ kind: DebtKind; token: string }> = [
  { kind: 'todo', token: 'TODO' },
  { kind: 'fixme', token: 'FIXME' },
  { kind: 'hack', token: 'HACK' },
  { kind: 'xxx', token: 'XXX' },
  { kind: 'bug', token: 'BUG' },
  { kind: 'deprecated', token: '@deprecated' },
];

function escapeToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLinePatterns(): PatternDef[] {
  const prefixes = [
    String.raw`(\s*\/\/\/?!?\s*)`,
    String.raw`(\s*#\s*)`,
    String.raw`(\s*\*\s*)`,
  ];
  const patterns: PatternDef[] = [];
  for (const { kind, token } of MARKERS) {
    const t = escapeToken(token);
    for (const prefix of prefixes) {
      patterns.push({
        kind,
        hasPrefix: true,
        regex: new RegExp(`^${prefix}${t}\\b\\s*:?\\s*(.*)$`, 'i'),
      });
    }
  }
  return patterns;
}

function buildMarkdownLinePatterns(): PatternDef[] {
  return MARKERS.filter((m) => m.kind !== 'deprecated').map(({ kind, token }) => ({
    kind,
    hasPrefix: true,
    regex: new RegExp(
      `^(\\s*[-*]\\s+(?:\\[[ xX]\\]\\s*)?)${escapeToken(token)}\\b\\s*:?\\s*(.*)$`,
      'i',
    ),
  }));
}

function buildInlinePatterns(): PatternDef[] {
  const patterns: PatternDef[] = [];
  for (const { kind, token } of MARKERS) {
    const t = escapeToken(token);
    patterns.push({
      kind,
      regex: new RegExp(`<!--\\s*${t}\\b\\s*:?\\s*(.*?)-->`, 'gi'),
    });
    patterns.push({
      kind,
      regex: new RegExp(`\\/\\*+\\s*${t}\\b\\s*:?\\s*(.*?)(?:\\*\\/|$)`, 'gi'),
    });
  }
  return patterns;
}

const LINE_PATTERNS = buildLinePatterns();
const MARKDOWN_LINE_PATTERNS = buildMarkdownLinePatterns();
const INLINE_PATTERNS = buildInlinePatterns();

export function parseComments(content: string, filePath = ''): RawMatch[] {
  const lines = content.split(/\r?\n/);
  const matches: RawMatch[] = [];
  const seen = new Set<string>();
  const isMarkdown = /\.(md|mdx)$/i.test(filePath);

  const linePatterns = isMarkdown ? MARKDOWN_LINE_PATTERNS : LINE_PATTERNS;
  const inlinePatterns = isMarkdown
    ? INLINE_PATTERNS.filter((p) => p.regex.source.includes('<!--'))
    : INLINE_PATTERNS;

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const pattern of linePatterns) {
      const match = pattern.regex.exec(lineText);
      pattern.regex.lastIndex = 0;
      if (!match) continue;

      const message = cleanMessage(
        pattern.hasPrefix ? (match[2] ?? '') : (match[1] ?? ''),
      );
      const raw = match[0].trim();
      const line = i + 1;
      const column = (match.index ?? 0) + 1;
      const key = `${pattern.kind}:${line}:${column}:${raw.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      matches.push({
        kind: pattern.kind,
        message: message || defaultMessage(pattern.kind),
        raw,
        line,
        column,
        context: buildContext(lines, line),
      });
    }
  }

  for (const pattern of inlinePatterns) {
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      const index = match.index;
      const line = offsetToLine(content, index);
      const column = index - lineStartOffset(content, index) + 1;
      const message = cleanMessage(match[1] ?? '');
      const raw = match[0].trim();
      const key = `${pattern.kind}:${line}:${column}:${raw.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      matches.push({
        kind: pattern.kind,
        message: message || defaultMessage(pattern.kind),
        raw,
        line,
        column,
        context: buildContext(lines, line),
      });
    }
  }

  matches.sort((a, b) => a.line - b.line || a.column - b.column);
  return matches;
}

function cleanMessage(text: string): string {
  return text
    .replace(/\*+\/?\s*$/, '')
    .replace(/-->$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultMessage(kind: DebtKind): string {
  if (kind === 'deprecated') return 'Deprecated';
  if (kind === 'hack') return 'Hack';
  if (kind === 'xxx') return 'XXX';
  if (kind === 'bug') return 'Bug';
  return '(no message)';
}

function offsetToLine(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

function lineStartOffset(content: string, offset: number): number {
  const before = content.lastIndexOf('\n', offset - 1);
  return before === -1 ? 0 : before + 1;
}

function buildContext(lines: string[], line: number): string {
  const idx = line - 1;
  const start = Math.max(0, idx - 1);
  const end = Math.min(lines.length, idx + 2);
  return lines.slice(start, end).join('\n');
}
