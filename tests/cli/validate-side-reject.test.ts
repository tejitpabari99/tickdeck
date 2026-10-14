import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { run, type CliIo } from '../../src/cli/main.js';

const root = join(import.meta.dirname, '..', '..');
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cd-side-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

it('validate on a table card in the left column exits 1 with the side message', async () => {
  const f = join(dir, 'tbl');
  mkdirSync(f);
  const card = JSON.parse(readFileSync(join(root, 'templates/table/card.json'), 'utf8')) as Record<string, unknown>;
  writeFileSync(join(f, 'card.json'), JSON.stringify({ ...card, layout: { column: 'left' } }));
  writeFileSync(join(f, 'data.json'), readFileSync(join(root, 'templates/table/data.json'), 'utf8'));
  let out = '';
  const io: CliIo = { stdout: (s) => void (out += s), stderr: (s) => void (out += s), readStdin: async () => '', env: {}, isTTY: false };
  expect(await run(['validate', f], io)).toBe(1);
  expect(out).toMatch(/^BROKEN side-not-allowed: /m);
  expect(out).toContain(
    'type "table" is not allowed in the left column: sides are permanent reference; use column "center" (or a kpi/markdown/media card)',
  );
});
