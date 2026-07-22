import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createIgnoreMatcher,
  isSensitivePath,
  parseIgnoreFile,
  DEFAULT_IGNORE_PATTERNS,
} from '../ignore.js'

describe('parseIgnoreFile', () => {
  it('skips blanks and comments', () => {
    const patterns = parseIgnoreFile(`
# comment
src/generated/**

fixtures/**
`)
    assert.deepEqual(patterns, ['src/generated/**', 'fixtures/**'])
  })
})

describe('createIgnoreMatcher', () => {
  it('ignores files and prunes directories', () => {
    const ignore = createIgnoreMatcher(['src/generated/**', 'fixtures/'])

    assert.equal(ignore.ignores('src/generated/foo.ts'), true)
    assert.equal(ignore.ignores('src/app.ts'), false)
    assert.equal(ignore.ignoresDirectory('fixtures'), true)
    assert.equal(ignore.ignoresDirectory('src'), false)
  })

  it('supports negation with last-match-wins', () => {
    const ignore = createIgnoreMatcher([
      'src/generated/**',
      '!src/generated/keep.ts',
    ])

    assert.equal(ignore.ignores('src/generated/a.ts'), true)
    assert.equal(ignore.ignores('src/generated/keep.ts'), false)
  })

  it('matches minified defaults style patterns', () => {
    const ignore = createIgnoreMatcher(['**/*.min.js'])
    assert.equal(ignore.ignores('vendor/lib.min.js'), true)
    assert.equal(ignore.ignores('src/lib.js'), false)
  })

  it('default patterns skip env and secret files', () => {
    const ignore = createIgnoreMatcher(DEFAULT_IGNORE_PATTERNS)
    assert.equal(ignore.ignores('.env'), true)
    assert.equal(ignore.ignores('.env.local'), true)
    assert.equal(ignore.ignores('config/secrets.yml'), true)
    assert.equal(ignore.ignores('apps/api/credentials.json'), true)
    assert.equal(ignore.ignores('certs/prod.pem'), true)
    assert.equal(ignore.ignores('src/app.ts'), false)
  })
})

describe('isSensitivePath', () => {
  it('flags env and credential basenames', () => {
    assert.equal(isSensitivePath('.env'), true)
    assert.equal(isSensitivePath('app/.env.production'), true)
    assert.equal(isSensitivePath('local.env'), true)
    assert.equal(isSensitivePath('secrets.yaml'), true)
    assert.equal(isSensitivePath('service-account-key.json'), true)
    assert.equal(isSensitivePath('id_rsa'), true)
    assert.equal(isSensitivePath('src/config.ts'), false)
  })
})
