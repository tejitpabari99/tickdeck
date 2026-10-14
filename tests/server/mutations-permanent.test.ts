import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeClock } from '../../src/clock.js';
import { startServer, type RunningServer } from '../../src/http/server.js';
import { ENV_HOME } from '../../src/constants/env.js';
import { ERROR_CODES } from '../../src/constants/error-codes.js';
import { MUTATION_HEADER, MUTATION_HEADER_VALUE } from '../../src/constants/http.js';
import { loopbackUrl } from '../../src/utils/loopback.js';

let data: string;
let ui: string;
let running: RunningServer | undefined;
const clock = fakeClock('2026-06-01T12:00:00Z');

const putFolder = (id: string, layout: object): void => {
  const dir = join(data, 'feed', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'card.json'), JSON.stringify({ type: 'markdown', title: id, layout }));
  writeFileSync(join(dir, 'data.json'), JSON.stringify({ updatedAt: '2026-06-01T11:00:00Z', data: { text: 'hi' } }));
};

beforeEach(() => {
  data = mkdtempSync(join(tmpdir(), 'perm-data-'));
  ui = mkdtempSync(join(tmpdir(), 'perm-ui-'));
  writeFileSync(join(ui, 'index.html'), '<html></html>');
  mkdirSync(join(data, 'feed'), { recursive: true });
});
afterEach(async () => {
  await running?.stop();
  running = undefined;
  rmSync(data, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  rmSync(ui, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

const call = (s: RunningServer, method: string, path: string) =>
  fetch(`${loopbackUrl(s.port)}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', [MUTATION_HEADER]: MUTATION_HEADER_VALUE },
  });

describe('mutations on permanent (side) cards', () => {
  it('Done and Hide on a side card: 400 PERMANENT_CARD; DELETE variants ok; center card unaffected', async () => {
    putFolder('side', { column: 'left' });
    putFolder('mid', { column: 'center' });
    running = await startServer({ env: { [ENV_HOME]: data }, clock, uiDir: ui, port: 0 });
    const s = running;
    for (const [method, path] of [['POST', '/api/cards/side/done'], ['PUT', '/api/cards/side/hidden']] as const) {
      const r = await call(s, method, path);
      expect(r.status, path).toBe(400);
      expect(((await r.json()) as { code: string }).code).toBe(ERROR_CODES.PERMANENT_CARD);
    }
    expect((await call(s, 'DELETE', '/api/cards/side/done')).status).toBe(200);
    expect((await call(s, 'DELETE', '/api/cards/side/hidden')).status).toBe(200);
    expect((await call(s, 'POST', '/api/cards/mid/done')).status).toBe(200);
    expect((await call(s, 'PUT', '/api/cards/mid/hidden')).status).toBe(200);
  });
});
