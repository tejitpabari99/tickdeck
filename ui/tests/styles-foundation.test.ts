import { readFileSync, readdirSync } from 'node:fs';
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

  it('main.tsx imports mobile.css last', () => {
    const tsx = read('main.tsx');
    const imports = [...tsx.matchAll(/^import '([^']+\.css)';/gm)].map((m) => m[1]);
    expect(imports.at(-1)).toBe('./styles/mobile.css');
  });

  it('mobile.css stacks center, left, right and disables animation under reduced motion', () => {
    const css = read('styles/mobile.css');
    expect(css).toContain("grid-template-areas: 'center' 'left' 'right'");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation: none !important/);
  });

  for (const f of ['site', 'utils', 'widgets', 'types/kpi', 'types/list', 'types/markdown', 'types/media', 'types/table', 'mobile'].map((n) => `styles/${n}.css`)) {
    it(`${f} has no colour literals`, () => {
      const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\b(hsla?|rgba?|oklch|lab|lch)\(/);
    });
  }

  it('no colour literals anywhere in ui/src/styles except the main.css input block', () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.css') ? [join(d, e.name)] : []
      );
    const strip = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '');
    const files = walk(join(src, 'styles'));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      let css = strip(readFileSync(f, 'utf8'));
      if (f.endsWith('/main.css')) {
        // allowed: exactly the three `--color-{primary,positive,negative}: hsl(h, s%, l%)` inputs
        css = css.replace(/--color-(primary|positive|negative):\s*hsl\(\d+,\s*\d+%,\s*\d+%\);/g, '');
      }
      expect(css, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css, f).not.toMatch(/\b(rgba?|oklch|lab|lch)\(/);
      // hsl() may only wrap var()/calc()/min() derivations, never bare numbers
      expect(css, f).not.toMatch(/\bhsla?\(\s*[\d.]/);
      expect(css, f).not.toMatch(/\b(red|blue|green|white|black|gray|grey)\b\s*[;}]/);
    }
  });
});
