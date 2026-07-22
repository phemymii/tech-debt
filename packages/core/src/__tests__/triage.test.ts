import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyTriageToReport,
  dismissItem,
  emptyTriageState,
  isTriageActive,
  pruneExpired,
  snoozeItem,
  triageKey,
} from '../triage.js'
import type { DebtItem, DebtReport } from '../types.js'

function item(
  partial: Partial<DebtItem> & Pick<DebtItem, 'id' | 'message'>,
): DebtItem {
  return {
    kind: 'todo',
    raw: '// TODO',
    filePath: '/p/a.ts',
    relativePath: 'a.ts',
    line: 1,
    column: 1,
    ageBucket: 'unknown',
    ...partial,
  }
}

describe('triage', () => {
  it('uses stable keys', () => {
    const a = item({
      id: '1',
      message: 'hello',
      relativePath: 'a.ts',
      line: 3,
    })
    const b = item({
      id: '2',
      message: 'Hello',
      relativePath: 'a.ts',
      line: 3,
    })
    assert.equal(triageKey(a), triageKey(b))
  })

  it('hides dismissed items from the open report', () => {
    const open = item({ id: '1', message: 'keep' })
    const gone = item({ id: '2', message: 'hide', line: 2 })
    const state = dismissItem(emptyTriageState(), gone)
    const report = applyTriageToReport(
      {
        config: { root: '/p', name: 'p', isGitRepo: false },
        items: [open, gone],
        authors: [],
        files: [],
        searchIndex: [],
        stats: {
          totalItems: 2,
          totalFiles: 1,
          scannedFiles: 1,
          byKind: {
            todo: 2,
            fixme: 0,
            hack: 0,
            xxx: 0,
            bug: 0,
            deprecated: 0,
          },
          byAge: {
            fresh: 0,
            recent: 0,
            aging: 0,
            stale: 0,
            ancient: 0,
            unknown: 2,
          },
          authors: 0,
          oldestAgeDays: null,
          averageAgeDays: null,
          scanDurationMs: 1,
          blameEnabled: false,
          blameCoverage: 0,
        },
        scannedAt: new Date().toISOString(),
      } satisfies DebtReport,
      state,
    )
    assert.equal(report.items.length, 1)
    assert.equal(report.items[0].id, '1')
    assert.equal(report.stats.triagedHidden, 1)
  })

  it('expires snoozes', () => {
    const target = item({ id: '1', message: 'later' })
    let state = snoozeItem(emptyTriageState(), target, 7)
    const key = triageKey(target)
    state = {
      version: 1,
      entries: {
        [key]: {
          ...state.entries[key],
          until: new Date(Date.now() - 1000).toISOString(),
        },
      },
    }
    const pruned = pruneExpired(state)
    assert.equal(Object.keys(pruned.entries).length, 0)
    assert.equal(isTriageActive(state.entries[key], new Date()), false)
  })
})
