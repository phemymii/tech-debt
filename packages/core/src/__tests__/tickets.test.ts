import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractTickets,
  githubIssuesBaseFromRemote,
} from '../tickets.js';

describe('extractTickets', () => {
  it('parses Jira-style keys and hash issues', () => {
    const tickets = extractTickets('TODO(ABC-123): also see #42');
    assert.deepEqual(
      tickets.map((t) => t.key).sort(),
      ['#42', 'ABC-123'],
    );
  });

  it('keeps inline URLs and resolves key templates', () => {
    const tickets = extractTickets('See ENG-9 and https://example.com/browse/ENG-9', {
      ticketBaseUrl: 'https://jira.example/browse/{key}',
    });
    const eng = tickets.find((t) => t.key === 'ENG-9' || t.key === 'eng-9' || t.key.toUpperCase() === 'ENG-9');
    assert.ok(eng);
    assert.equal(eng!.url, 'https://example.com/browse/ENG-9');
  });

  it('resolves hash issues via GitHub base', () => {
    const tickets = extractTickets('BUG: track #12', {
      githubIssuesBase: 'https://github.com/acme/app/issues',
    });
    assert.equal(tickets[0]?.url, 'https://github.com/acme/app/issues/12');
  });
});

describe('githubIssuesBaseFromRemote', () => {
  it('parses ssh and https remotes', () => {
    assert.equal(
      githubIssuesBaseFromRemote('git@github.com:acme/app.git'),
      'https://github.com/acme/app/issues',
    );
    assert.equal(
      githubIssuesBaseFromRemote('https://github.com/acme/app.git'),
      'https://github.com/acme/app/issues',
    );
  });
});
