import { describe, expect, it } from 'vitest';
import { validateCardFolder } from '../../src/contract/index.js';
import { tableDataSchema } from '../../src/contract/types/table.js';

const NOW = new Date('2026-10-05T10:00:00Z');
const MT = Date.parse('2026-10-05T09:00:00Z');

function run(data: object) {
  return validateCardFolder({
    folderId: 'my-table',
    cardText: JSON.stringify({ type: 'table', title: 'T', data: 'data.json', layout: { column: 'center' } }),
    data: { text: JSON.stringify({ data }), mtimeMs: MT },
    now: NOW,
  });
}

describe('table width', () => {
  it.each(['xs', 's', 'm', 'l', 'fill'])('accepts width %s', (width) => {
    expect(tableDataSchema.safeParse({ columns: [{ label: 'A', width }], rows: [] }).success).toBe(true);
  });
  it('rejects unknown width', () => {
    expect(tableDataSchema.safeParse({ columns: [{ label: 'A', width: 'xl' }], rows: [] }).success).toBe(false);
  });
});

describe('explicit date column warning', () => {
  const cols = ['Name', { label: 'When', sort: 'date' }];
  it('warns per non-ISO cell at cell path, card stays ok', () => {
    const r = run({
      columns: cols,
      rows: [
        { cells: ['a', '2026-10-05'] },
        { cells: ['b', '2026-10-05T10:00:00Z'] },
        { cells: ['c', '10/05/2026'] },
        { cells: ['d', { text: 'yesterday' }] },
        { cells: ['e', ''] },
        { cells: ['f', null] },
        { cells: ['g', '2026-13-45'] },
      ],
    });
    expect(r.status).toBe('ok');
    const w = (r as { warnings: string[] }).warnings;
    const msg = 'date column needs ISO 8601; cell shown raw and sorted last';
    expect(w).toContain(`data.json/data/rows/2/cells/1: ${msg}`);
    expect(w).toContain(`data.json/data/rows/3/cells/1: ${msg}`);
    expect(w).toContain(`data.json/data/rows/6/cells/1: ${msg}`);
    expect(w.filter((x) => x.includes(msg))).toHaveLength(3);
  });
  it('no warning for inferred date columns or non-date explicit columns', () => {
    const r = run({
      columns: ['A', { label: 'B', sort: 'text' }],
      rows: [{ cells: ['10/05/2026', 'x'] }],
    });
    expect(r.status).toBe('ok');
    expect((r as { warnings: string[] }).warnings).toEqual([]);
  });
});
