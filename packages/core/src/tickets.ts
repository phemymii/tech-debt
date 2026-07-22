import { execFileSync } from 'node:child_process'
import type { TicketRef } from './types.js'

/** Jira / Linear style keys */
const ISSUE_KEY = /\b([A-Z][A-Z0-9]+-\d+)\b/g
/** Bare GitHub-style issue numbers in comments */
const HASH_ISSUE = /(?:^|[\s(,;:])#(\d+)\b/g
/** Absolute http(s) URLs */
const URL_RE = /\bhttps?:\/\/[^\s)\]}'"]+/gi

/**
 * Extract ticket references from debt text.
 * Prefer full URLs when present; otherwise keys may be resolved later.
 */
export function extractTickets(
  text: string,
  options?: {
    ticketBaseUrl?: string
    githubIssuesBase?: string | null
  },
): TicketRef[] {
  const byKey = new Map<string, TicketRef>()

  for (const match of text.matchAll(URL_RE)) {
    const url = trimUrl(match[0])
    const key = keyFromUrl(url) ?? url
    byKey.set(key.toUpperCase(), { key, url })
  }

  for (const match of text.matchAll(ISSUE_KEY)) {
    const key = match[1]
    const mapKey = key.toUpperCase()
    if (byKey.has(mapKey)) continue
    const url = resolveKeyUrl(key, options)
    byKey.set(mapKey, url ? { key, url } : { key })
  }

  for (const match of text.matchAll(HASH_ISSUE)) {
    const key = `#${match[1]}`
    if (byKey.has(key)) continue
    const url = options?.githubIssuesBase
      ? `${options.githubIssuesBase.replace(/\/$/, '')}/${match[1]}`
      : undefined
    byKey.set(key, url ? { key, url } : { key })
  }

  return [...byKey.values()]
}

export function resolveGithubIssuesBase(root: string): string | null {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return githubIssuesBaseFromRemote(remote)
  } catch {
    return null
  }
}

export function githubIssuesBaseFromRemote(remote: string): string | null {
  const ssh = remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i)
  if (ssh) return `https://github.com/${ssh[1]}/${ssh[2]}/issues`

  const https = remote.match(
    /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i,
  )
  if (https) return `https://github.com/${https[1]}/${https[2]}/issues`

  return null
}

function resolveKeyUrl(
  key: string,
  options?: { ticketBaseUrl?: string },
): string | undefined {
  const base =
    options?.ticketBaseUrl?.trim() || process.env.TECH_DEBT_TICKET_BASE?.trim()
  if (!base) return undefined
  return base.includes('{key}')
    ? base.replaceAll('{key}', key)
    : `${base.replace(/\/$/, '')}/${key}`
}

function keyFromUrl(url: string): string | null {
  const browse = url.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i)
  if (browse) return browse[1].toUpperCase()
  const linear = url.match(/\/issue\/([A-Z][A-Z0-9]+-\d+)/i)
  if (linear) return linear[1].toUpperCase()
  const gh = url.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/i)
  if (gh) return `#${gh[1]}`
  return null
}

function trimUrl(url: string): string {
  return url.replace(/[.,;:]+$/, '')
}
