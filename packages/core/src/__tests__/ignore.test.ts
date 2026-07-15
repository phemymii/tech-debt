import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createIgnoreMatcher,
  parseIgnoreFile,
} from '../ignore.js';

describe('parseIgnoreFile', () => {
  it('skips blanks and comments', () => {
    const patterns = parseIgnoreFile(`
# comment
src/generated/**

fixtures/**
`);
    assert.deepEqual(patterns, ['src/generated/**', 'fixtures/**']);
  });
});

describe('createIgnoreMatcher', () => {
  it('ignores files and prunes directories', () => {
    const ignore = createIgnoreMatcher(['src/generated/**', 'fixtures/']);

    assert.equal(ignore.ignores('src/generated/foo.ts'), true);
    assert.equal(ignore.ignores('src/app.ts'), false);
    assert.equal(ignore.ignoresDirectory('fixtures'), true);
    assert.equal(ignore.ignoresDirectory('src'), false);
  });

  it('supports negation with last-match-wins', () => {
    const ignore = createIgnoreMatcher([
      'src/generated/**',
      '!src/generated/keep.ts',
    ]);

    assert.equal(ignore.ignores('src/generated/a.ts'), true);
    assert.equal(ignore.ignores('src/generated/keep.ts'), false);
  });

  it('matches minified defaults style patterns', () => {
    const ignore = createIgnoreMatcher(['**/*.min.js']);
    assert.equal(ignore.ignores('vendor/lib.min.js'), true);
    assert.equal(ignore.ignores('src/lib.js'), false);
  });
});
