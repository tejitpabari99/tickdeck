import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = join(import.meta.dirname, '../src');
const read = (p: string) => readFileSync(join(src, p), 'utf8');

describe('foundation styles', () => {
  it('main.tsx imports main -> site -> utils in order', () => {
    const tsx = read('main.tsx');
    const idx = ['main', 'site', 'utils'].map((n) => tsx.indexOf(`./styles/${n}.css`));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('main.css defines the colour inputs and dark scheme', () => {
    const css = read('styles/main.css');
    for (const t of ['--bgh: 240', '--bgs: 21', '--bgl: 15', '--cm: 1.2', '--tsm: 1', '--prio-high', '--unseen', '--stale', 'color-scheme: dark']) {
      expect(css).toContain(t);
    }
  });

  for (const f of ['styles/site.css', 'styles/utils.css']) {
    it(`${f} has no colour literals`, () => {
      const css = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css).not.toMatch(/\b(hsla?|rgba?|oklch|lab|lch)\(/);
    });
  }
});
