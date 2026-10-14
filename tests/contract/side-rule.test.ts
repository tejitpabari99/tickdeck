import { describe, expect, it } from 'vitest';
import { listTypes, registry, sidesAllowed, validateCardFolder } from '../../src/contract/index.js';

const NOW = new Date('2026-10-05T10:00:00Z');
const MT = Date.parse('2026-10-05T09:00:00Z');

function run(type: string, column: string, extra: Record<string, unknown> = {}, data: object | 'absent' = 'absent') {
  const t = registry[type as keyof typeof registry];
  const card = JSON.stringify({ ...t.template.card, type, layout: { column }, ...extra });
  return validateCardFolder({
    folderId: 'my-card',
    cardText: card,
    data: data === 'absent' ? { absent: true } : { text: JSON.stringify(data), mtimeMs: MT },
    now: NOW,
  });
}

describe('side rule', () => {
  it.each(['table', 'list'])('%s in left/right -> side-not-allowed with PRD message', (type) => {
    for (const column of ['left', 'right']) {
      const r = run(type, column);
      expect(r).toMatchObject({
        status: 'broken',
        reason: 'side-not-allowed',
        message: `type "${type}" is not allowed in the ${column} column: sides are permanent reference; use column "center" (or a kpi/markdown/media card)`,
      });
    }
  });

  it('fails even when the data file is absent or invalid', () => {
    expect(run('table', 'left')).toMatchObject({ status: 'broken', reason: 'side-not-allowed' });
    expect(run('table', 'left', {}, { data: 'garbage' })).toMatchObject({ reason: 'side-not-allowed' });
  });

  it('table/list in center are fine', () => {
    for (const type of ['table', 'list']) {
      expect(run(type, 'center').status).toBe('no-data');
    }
  });

  it.each(['kpi', 'markdown', 'media', 'calendar', 'bookmarks'])('%s in right/left is allowed', (type) => {
    expect(run(type, 'right').status).toBe('no-data');
    expect(run(type, 'left').status).toBe('no-data');
  });

  it('priority on a side card warns, does not fail', () => {
    const r = run('kpi', 'right', { priority: 5 });
    expect(r.status).toBe('no-data');
    expect('warnings' in r && r.warnings).toContain('priority is ignored in left/right columns');
    const c = run('kpi', 'center', { priority: 5 });
    expect('warnings' in c && c.warnings).not.toContain('priority is ignored in left/right columns');
  });

  it('priority in data.json on a side card also warns', () => {
    const t = registry.kpi.template.data;
    const r = run('kpi', 'left', {}, { ...t, priority: 4 });
    expect(r.status).toBe('ok');
    expect('warnings' in r && r.warnings).toContain('priority is ignored in left/right columns');
  });

  it('exhaustiveness: every registered type declares sides', () => {
    for (const t of listTypes()) {
      expect(['allow', 'deny']).toContain(registry[t].sides);
      expect(sidesAllowed(t)).toBe(registry[t].sides === 'allow');
    }
    expect(sidesAllowed('nope')).toBe(false);
  });

  it('new types: calendar/bookmarks allow, list/table deny; template data validates in left column', () => {
    expect(listTypes().filter((t) => sidesAllowed(t)).sort()).toEqual(['bookmarks', 'calendar', 'kpi', 'markdown', 'media']);
    for (const type of ['calendar', 'bookmarks']) {
      expect(run(type, 'left', {}, registry[type as 'calendar'].template.data).status).toBe('ok');
    }
    expect(run('list', 'left')).toMatchObject({ reason: 'side-not-allowed' });
  });
});
