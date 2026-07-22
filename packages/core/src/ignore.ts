import fs from 'node:fs'
import path from 'node:path'

/**
 * Built-in ignores: noise + secrets/env files.
 * Prefer `.gitignore` + `.tech-debtignore` for project control.
 */
export const DEFAULT_IGNORE_PATTERNS = [
  // Noise
  '**/coverage/**',
  '**/cypress/**',
  '**/playwright/**',
  '**/e2e/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.min.mjs',
  // Env / secrets — never scan or watch these
  '**/.env',
  '**/.env.*',
  '**/*.env',
  '**/*.env.*',
  '**/.envrc',
  '**/.netrc',
  '**/.npmrc',
  '**/.pypirc',
  '**/secrets.json',
  '**/secrets.yml',
  '**/secrets.yaml',
  '**/secrets.toml',
  '**/credentials.json',
  '**/credentials.yml',
  '**/credentials.yaml',
  '**/*credentials*.json',
  '**/service-account*.json',
  '**/auth.json',
  '**/token.json',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/*.pfx',
  '**/*.jks',
  '**/*.keystore',
  '**/id_rsa',
  '**/id_rsa.*',
  '**/id_ed25519',
  '**/id_ed25519.*',
  '**/.aws/credentials',
  '**/private.key',
]

/** Basename heuristics for secret-like files (defense in depth beyond globs). */
const SENSITIVE_BASENAME =
  /^(?:\.env(?:\..+)?|.+\.env(?:\..+)?|\.envrc|\.netrc|\.npmrc|\.pypirc|secrets\.(?:json|ya?ml|toml)|credentials\.(?:json|ya?ml)|.*credentials.*\.json|service-account.*\.json|auth\.json|token\.json|id_rsa(?:\..+)?|id_ed25519(?:\..+)?|private\.key|.+\.(?:pem|key|p12|pfx|jks|keystore))$/i

/**
 * True for env/secret paths that must never be scanned, watched, or opened.
 * Accepts absolute or project-relative paths.
 */
export function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  const base = normalized.split('/').pop() ?? normalized
  if (SENSITIVE_BASENAME.test(base)) return true
  // Nested AWS credentials style
  if (/(^|\/)\.aws\/credentials$/i.test(normalized)) return true
  return false
}

export interface IgnoreMatcher {
  /** Relative path from project root, posix-style */
  ignores(relativePath: string): boolean
  /** Relative dir — skip walking when possible */
  ignoresDirectory(relativeDir: string): boolean
  patterns: string[]
}

interface CompiledRule {
  negate: boolean
  dirOnly: boolean
  regex: RegExp
  raw: string
}

/**
 * Load ignore rules for a project root.
 * Order (last match wins): defaults → `.gitignore` → `.git/info/exclude` → `.tech-debtignore`.
 * Gitignore-style: `#` comments, `!` negation, trailing `/` for directories, `*` / `**`.
 */
export function loadIgnoreMatcher(root: string): IgnoreMatcher {
  const patterns = [...DEFAULT_IGNORE_PATTERNS]

  const sources = [
    path.join(root, '.gitignore'),
    path.join(root, '.git', 'info', 'exclude'),
    path.join(root, '.tech-debtignore'),
  ]

  for (const file of sources) {
    if (!fs.existsSync(file)) continue
    try {
      patterns.push(...parseIgnoreFile(fs.readFileSync(file, 'utf-8')))
    } catch {
      // unreadable file
    }
  }

  return createIgnoreMatcher(patterns)
}

export function parseIgnoreFile(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

export function createIgnoreMatcher(patterns: string[]): IgnoreMatcher {
  const rules = patterns
    .map(compilePattern)
    .filter((r): r is CompiledRule => r !== null)

  function match(relativePath: string, asDirectory: boolean): boolean {
    const normalized = normalizeRel(relativePath)
    if (!normalized || normalized === '.') return false

    let ignored = false
    for (const rule of rules) {
      if (rule.dirOnly && !asDirectory) {
        const asDir = normalized.endsWith('/') ? normalized : `${normalized}/`
        if (rule.regex.test(asDir) || rule.regex.test(normalized)) {
          ignored = !rule.negate
        }
        continue
      }

      if (rule.regex.test(normalized)) {
        ignored = !rule.negate
      }
    }
    return ignored
  }

  return {
    patterns,
    ignores(relativePath: string) {
      return match(relativePath, false)
    },
    ignoresDirectory(relativeDir: string) {
      return match(relativeDir, true)
    },
  }
}

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/')
}

function compilePattern(pattern: string): CompiledRule | null {
  let raw = pattern.trim()
  if (!raw || raw.startsWith('#')) return null

  let negate = false
  if (raw.startsWith('!')) {
    negate = true
    raw = raw.slice(1)
  }

  let dirOnly = false
  if (raw.endsWith('/')) {
    dirOnly = true
    raw = raw.slice(0, -1)
  }

  let anchored = false
  if (raw.startsWith('/')) {
    anchored = true
    raw = raw.slice(1)
  }

  const regex = globToRegExp(raw, anchored)
  return { negate, dirOnly, regex, raw: pattern }
}

function globToRegExp(glob: string, anchored: boolean): RegExp {
  let i = 0
  let out = anchored ? '^' : '(^|/)'

  while (i < glob.length) {
    const c = glob[i]

    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        out += '(?:.*/)?'
        i += 3
      } else {
        out += '.*'
        i += 2
      }
      continue
    }

    if (c === '*') {
      out += '[^/]*'
      i += 1
      continue
    }

    if (c === '?') {
      out += '[^/]'
      i += 1
      continue
    }

    if ('+|(){}.^$'.includes(c)) {
      out += `\\${c}`
      i += 1
      continue
    }

    if (c === '\\') {
      out += `\\${glob[i + 1] ?? '\\'}`
      i += 2
      continue
    }

    out += c
    i += 1
  }

  out += '(?:/.*)?$'
  return new RegExp(out)
}
