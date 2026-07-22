import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseComments } from '../comment-parser.js'

describe('parseComments', () => {
  it('finds classic markers', () => {
    const matches = parseComments(
      `
// TODO: first
// FIXME: second
// HACK: third
// XXX: fourth
// BUG: fifth
/** @deprecated old */
`,
      'sample.ts',
    )
    const kinds = matches.map((m) => m.kind)
    assert.deepEqual(kinds, [
      'todo',
      'fixme',
      'hack',
      'xxx',
      'bug',
      'deprecated',
    ])
  })

  it('finds markdown list and html markers', () => {
    const matches = parseComments(
      `
- TODO: write docs
<!-- HACK: temporary -->
`,
      'notes.md',
    )
    assert.equal(matches.length, 2)
    assert.equal(matches[0].kind, 'todo')
    assert.equal(matches[1].kind, 'hack')
  })
})
