import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createFeedIngest } from '../../src/feed/ingest.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'feed-side-'));
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

it('ingest yields a Broken entry with reason side-not-allowed for a table in the right column', () => {
  const ing = createFeedIngest({ feedDir: dir, onChange: () => {} });
  mkdirSync(join(dir, 'x'), { recursive: true });
  writeFileSync(join(dir, 'x/card.json'), JSON.stringify({ type: 'table', title: 'T', layout: { column: 'right' } }));
  writeFileSync(join(dir, 'x/data.json'), JSON.stringify({ data: { columns: ['a'], rows: [['1']] } }));
  ing.processFolder('x');
  expect(ing.store.get('x')).toMatchObject({
    status: 'broken',
    reason: 'side-not-allowed',
    message: 'type "table" is not allowed in the right column: sides are permanent reference; use column "center" (or a kpi/markdown/media card)',
  });
});
