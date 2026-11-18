import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildAuthors, buildStats } from '../aggregate.js'
import type { DebtItem } from '../types.js'

function item(
  id: string,
  author: string,
  authorEmail: string,
): DebtItem {
  return {
    id,
    kind: 'todo',
    message: 'follow up',
    raw: '// TODO: follow up',
    filePath: `/project/${id}.ts`,
    relativePath: `${id}.ts`,
    line: 1,
    column: 1,
    ageBucket: 'fresh',
    blame: {
      author,
      authorEmail,
      committedAt: '2025-01-01T00:00:00.000Z',
      ageDays: 1,
      commitHash: id,
    },
  }
}

describe('author aggregation', () => {
  it('groups name variations by normalized email and sorts by email', () => {
    const items = [
      item('1', 'Femi Olayiwola', 'femi@example.com'),
      item('2', 'femi.olayiwola', ' FEMI@example.com '),
      item('3', 'Another Author', 'another@example.com'),
    ]

    const authors = buildAuthors(items)

    assert.deepEqual(
      authors.map(({ authorEmail, total }) => ({ authorEmail, total })),
      [
        { authorEmail: 'another@example.com', total: 1 },
        { authorEmail: 'femi@example.com', total: 2 },
      ],
    )
    assert.equal(
      buildStats(items, 3, 10, true).authors,
      2,
    )
  })
})
