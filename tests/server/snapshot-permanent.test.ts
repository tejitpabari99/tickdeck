import { describe, expect, it } from 'vitest';
import { computeSnapshot } from '../../src/compute/snapshot.js';
import type { BrokenEntry, CardEntry, NoDataEntry, OkEntry } from '../../src/feed/ingest.js';
import type { StateData } from '../../src/state/store.js';
import type { DashboardConfig } from '../../src/config.js';
import type { ValidCard } from '../../src/contract/folder-validate.js';
import { DEFAULT_NOW_PRIORITY_THRESHOLD } from '../../src/constants/config.js';
import { POLL_DEFAULT_MS } from '../../src/constants/poll.js';

const config: DashboardConfig = {
  port: 1, nowPriorityThreshold: DEFAULT_NOW_PRIORITY_THRESHOLD, pollIntervalMs: POLL_DEFAULT_MS,
  timezone: 'UTC', notifications: { os: 'auto' },
};
const state = (p: Partial<StateData> = {}): StateData => ({
  version: 1, acks: {}, doneAt: {}, hidden: {}, checks: {}, notified: {}, lastSeen: {}, ...p,
});
const NOW = new Date('2026-10-05T12:00:00Z');

function ok(id: string, over: Record<string, unknown> = {}): OkEntry {
  const { updatedAt = '2026-10-05T11:00:00Z', error = null, data = { text: id }, column = 'center', order = 0, height = 'M', ...rest } = over;
  const card = {
    id, type: 'markdown', title: id, priority: 2, notify: false,
    layout: { column, order, height },
    updatedAt, updatedAtSource: 'data', error, data, def: {}, content: {}, ...rest,
  } as unknown as ValidCard;
  return {
    status: 'ok', key: id, file: `${id}/data.json`, dataPath: `/feed/${id}/data.json`,
    viewHash: 'v', dataHash: 'h', dataVersion: updatedAt as string, viewMtimeMs: 0, dataMtimeMs: 0, card, warnings: [],
  };
}
function broken(key: string, over: Partial<BrokenEntry> = {}): BrokenEntry {
  return { status: 'broken', key, file: `${key}/data.json`, id: key, viewHash: 'v', mtimeMs: 1, title: key,
    reason: 'malformed-json', message: 'bad json', ...over };
}
const nd = (id: string, over: Record<string, unknown> = {}): NoDataEntry => ({
  status: 'no-data', key: id, file: `${id}/data.json`, dataPath: `/feed/${id}/data.json`, viewHash: 'v',
  viewMtimeMs: Date.parse('2026-10-05T11:00:00Z'), warnings: [],
  card: { id, type: 'markdown', title: id, layout: { column: 'center', order: 0, height: 'auto' }, priority: 2, notify: false, def: {}, ...over } as NoDataEntry['card'],
});
const snap = (cards: CardEntry[], st = state()) => computeSnapshot(cards, [], [], st, config, NOW);
const show = { cron: '0 11 * * *', for: '2h' };

describe('permanent side cards', () => {
  it('stays in column; not Now/completed/hidden; priority 2, collapsed false, permanent true', () => {
    const s = snap(
      [ok('l', { column: 'left', priority: 3, show }), ok('c', { priority: 0 }), ok('lo', { column: 'right', priority: 0 })],
      state({ hidden: { l: '2026-10-05T10:00:00Z' } as never }),
    );
    expect(s.columns).toEqual({ left: ['l'], center: ['c'], right: ['lo'] });
    expect(s.now).toEqual([]);
    expect(s.hidden).toEqual([]);
    expect(s.completed).toEqual([]);
    expect(s.cards.l).toMatchObject({ permanent: true, priority: 2, collapsed: false, done: false });
    expect(s.cards.lo).toMatchObject({ permanent: true, priority: 2, collapsed: false });
    expect(s.cards.c).toMatchObject({ permanent: false, priority: 0, collapsed: true });
  });
  it('ignores a matching ack', () => {
    const u = '2026-10-05T11:00:00Z';
    const s = snap([ok('l', { column: 'left', updatedAt: u })], state({ acks: { l: u }, doneAt: { l: u } }));
    expect(s.columns.left).toEqual(['l']);
    expect(s.completed).toEqual([]);
    expect(s.cards.l!.done).toBe(false);
    expect(s.cards.l).not.toHaveProperty('doneAt');
  });
  it('stale state still works', () => {
    const s = snap([ok('l', { column: 'left', staleAfter: '1h', updatedAt: '2026-10-05T08:00:00Z' })]);
    expect(s.columns.left).toEqual(['l']);
    expect(s.cards.l).toMatchObject({ status: 'broken', reason: 'stale', permanent: true });
  });
  it('no-data and broken side cards are permanent too', () => {
    const s = snap([nd('n', { layout: { column: 'left', order: 0, height: 'auto' }, priority: 3 }), broken('b', { layout: { column: 'right', order: 0, height: 'M' } })],
      state({ hidden: { n: 'x', b: 'x' } as never }));
    expect(s.columns).toEqual({ left: ['n'], center: [], right: ['b'] });
    expect(s.cards.n).toMatchObject({ status: 'no-data', permanent: true, priority: 2, collapsed: false });
    expect(s.cards.b).toMatchObject({ permanent: true });
  });
});
