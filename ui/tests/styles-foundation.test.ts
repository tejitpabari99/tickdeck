import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = join(import.meta.dirname, '../src');
const read = (p: string) => readFileSync(join(src, p), 'utf8');

describe('foundation styles', () => {
  it('main.tsx imports main -> site -> utils -> widgets in order', () => {
    const tsx = read('main.tsx');
    const idx = ['main', 'site', 'utils', 'widgets'].map((n) => tsx.indexOf(`./styles/${n}.css`));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('main.css defines the colour inputs and dark scheme', () => {
    const css = read('styles/main.css');
    for (const t of ['--bgh: 240', '--bgs: 21', '--bgl: 15', '--cm: 1.2', '--tsm: 1', '--prio-high', '--unseen', '--stale', 'color-scheme: dark']) {
      expect(css).toContain(t);
    }
  });

  it('main.tsx imports types kpi -> list -> markdown -> media -> table after widgets', () => {
    const tsx = read('main.tsx');
    const names = ['kpi', 'list', 'markdown', 'media', 'table'];
    const idx = names.map((n) => tsx.indexOf(`./styles/types/${n}.css`));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(idx[0]).toBeGreaterThan(tsx.indexOf('./styles/widgets.css'));
  });

  it('table.css ships width and truncation classes', () => {
    const css = read('styles/types/table.css');
    for (const t of ['.col-w-xs', '.col-w-s', '.col-w-m', '.col-w-l', '.col-w-fill', '.cell-truncate', '.tbl-wrap', '--tbl-auto-max: 24rem']) {
      expect(css).toContain(t);
    }
  });

  it('list and media ship placeholder hooks', () => {
    const l = read('styles/types/list.css');
    for (const t of ['.list--rows', '.list--detailed', '.meta-line']) expect(l).toContain(t);
    const m = read('styles/types/media.css');
    for (const t of ['.media-grid', '.media-row']) expect(m).toContain(t);
  });

  for (const f of ['site', 'utils', 'widgets', 'types/kpi', 'types/list', 'types/markdown', 'types/media', 'types/table'].map((n) => `styles/${n}.css`)) {
    it(`${f} has no colour literals`, () => {
      const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\b(hsla?|rgba?|oklch|lab|lch)\(/);
    });
  }
});
