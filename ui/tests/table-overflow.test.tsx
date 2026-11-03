import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getCardType } from '../src/registry/registry.ts';
import '../src/types/table/index.ts';
import type { CardTypeProps } from '../src/registry/registry.ts';
import type { TableData } from '../../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const def = getCardType('table')!;
type P = CardTypeProps<TableData>;

function renderTable(data: unknown, mode: P['mode'] = 'column') {
  const C = def.Component as React.ComponentType<P>;
  return render(
    <C card={{ id: 'c1' } as never} data={data as TableData} mode={mode} query="" checked={new Set()} pending={new Set()} onItemAction={async () => {}} />,
  );
}

afterEach(cleanup);

const data = {
  columns: [{ label: 'From', width: 's' }, { label: 'Subject', width: 'fill' }, { label: 'Note' }],
  rows: [{ cells: ['bob', 'A very long subject line that goes on and on', { text: 'link', link: 'https://example.com/x' }] }],
};

describe('table overflow', () => {
  it('compact: cell-truncate with title, link anchor inside', () => {
    const { container } = renderTable(data);
    const spans = container.querySelectorAll('td .cell-truncate');
    expect(spans).toHaveLength(3);
    expect(spans[1]!.getAttribute('title')).toBe('A very long subject line that goes on and on');
    expect(spans[2]!.querySelector('a')).not.toBeNull();
  });
  it('fullscreen wraps (no truncate)', () => {
    const { container } = renderTable(data, 'fullscreen');
    expect(container.querySelector('.cell-truncate')).toBeNull();
  });
  it('width classes on th and td; table inside .tbl-wrap', () => {
    const { container } = renderTable(data);
    expect(container.querySelector('.tbl-wrap table')).not.toBeNull();
    for (const sel of ['th', 'td']) {
      const els = container.querySelectorAll(sel);
      expect(els[0]!.classList.contains('col-w-s')).toBe(true);
      expect(els[1]!.classList.contains('col-w-fill')).toBe(true);
    }
  });
  it('implicit fill = text column with longest average length', () => {
    const { container } = renderTable({
      columns: ['A', 'B', 'N'],
      rows: [{ cells: ['x', 'much longer text here', 1] }, { cells: ['yy', 'another long one', 2] }],
    });
    const ths = container.querySelectorAll('th');
    expect(ths[1]!.classList.contains('col-w-fill')).toBe(true);
    expect(ths[0]!.className).not.toMatch(/col-w/);
    expect(ths[2]!.className).not.toMatch(/col-w/);
  });
  it('no implicit fill when explicit fill declared', () => {
    const { container } = renderTable({ columns: [{ label: 'A', width: 'fill' }, 'B'], rows: [{ cells: ['x', 'long long long'] }] });
    expect(container.querySelectorAll('th')[1]!.className).not.toMatch(/col-w/);
  });
  it('not fixed layout; clipping CSS kept', () => {
    const css = readFileSync(resolve(__dirname, '../src/styles/types/table.css'), 'utf8');
    expect(css).not.toMatch(/table-layout:\s*fixed/);
    expect(css).toMatch(/\.cell-truncate\s*\{[^}]*text-overflow:\s*ellipsis/);
  });
  it('date cell title is the full timestamp', () => {
    const { container } = renderTable({
      columns: [{ label: 'When', sort: 'date' }],
      rows: [{ cells: ['2026-10-14T09:02:00'] }],
    });
    const t = container.querySelector('td .cell-truncate')!;
    expect(t.getAttribute('title')).not.toBe(t.textContent);
    expect(t.getAttribute('title')!.length).toBeGreaterThan(t.textContent!.length);
  });
});
