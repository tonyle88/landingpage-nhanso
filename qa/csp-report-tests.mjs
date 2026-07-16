import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/csp-report.mjs';

test('CSP collector accepts a browser report', async () => {
  const response = await handler.fetch(new Request('https://example.test/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body: JSON.stringify({
      'csp-report': {
        'document-uri': 'https://nhanso.clowcat.com.vn/?private=value',
        'violated-directive': "script-src 'self'",
        'blocked-uri': 'https://unexpected.example/tracker.js?token=secret',
      },
    }),
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('CSP collector rejects non-POST methods', async () => {
  const response = await handler.fetch(new Request('https://example.test/api/csp-report'));
  assert.equal(response.status, 405);
});
