import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getCardType } from '../src/registry/registry.ts';
import '../src/types/table/index.ts';
import type { CardTypeProps } from '../src/registry/registry.ts';
import type { TableData } from '../../src/index.js';

const def = getCardType('table')!;
type P = CardTypeProps<TableData>;

function el(data: TableData) {
  const C = def.Component as React.ComponentType<P>;
  return (
    <C
      card={{ id: 'c1' } as never}
      data={data}
      mode="column"
      query=""
      checked={new Set()}
      pending={new Set()}
      onItemAction={async () => {}}
    />
  );
}

const mk = (names: string[], defaultSort?: { column: number; dir: 'asc' | 'desc' }): TableData =>
  ({
    columns: ['Name', 'N'],
    rows: names.map((n, i) => ({ cells: [n, i] })),
    ...(defaultSort ? { defaultSort } : {}),
  }) as TableData;

const order = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelectorAll('td')[0]?.textContent);

afterEach(cleanup);

describe('table re-sort on refresh', () => {
  it('rerender with new rows re-applies the default sort', () => {
    const ds = { column: 0, dir: 'asc' as const };
    const { rerender } = render(el(mk(['b', 'a'], ds)));
    expect(order()).toEqual(['a', 'b']);
    rerender(el(mk(['d', 'c', 'a'], ds)));
    expect(order()).toEqual(['a', 'c', 'd']);
  });

  it('a changed defaultSort re-orders', () => {
    const { rerender } = render(el(mk(['b', 'a', 'c'], { column: 0, dir: 'asc' })));
    expect(order()).toEqual(['a', 'b', 'c']);
    rerender(el(mk(['b', 'a', 'c'], { column: 0, dir: 'desc' })));
    expect(order()).toEqual(['c', 'b', 'a']);
  });

  it('user click persists across refresh until defaultSort changes', () => {
    const ds = { column: 0, dir: 'asc' as const };
    const { rerender } = render(el(mk(['b', 'a', 'c'], ds)));
    fireEvent.click(screen.getByRole('button', { name: /^N$/ })); // N asc: b,a,c (index order)
    fireEvent.click(screen.getByRole('button', { name: /^N$/ })); // N desc: c,a,b
    expect(order()).toEqual(['c', 'a', 'b']);
    rerender(el(mk(['x', 'y', 'z'], ds))); // same defaultSort: user sort kept (N desc)
    expect(order()).toEqual(['z', 'y', 'x']);
    rerender(el(mk(['x', 'y', 'z'], { column: 0, dir: 'desc' }))); // defaultSort changed: wins
    expect(order()).toEqual(['z', 'y', 'x']);
    rerender(el(mk(['x', 'y', 'z'], { column: 0, dir: 'asc' })));
    expect(order()).toEqual(['x', 'y', 'z']);
  });

  it('third header click returns to the default sort', () => {
    const { rerender } = render(el(mk(['b', 'a', 'c'], { column: 0, dir: 'asc' })));
    const n = () => screen.getByRole('button', { name: /^N$/ });
    fireEvent.click(n());
    fireEvent.click(n());
    fireEvent.click(n());
    expect(order()).toEqual(['a', 'b', 'c']);
    rerender(el(mk(['q', 'p'], { column: 0, dir: 'asc' })));
    expect(order()).toEqual(['p', 'q']);
  });
});
