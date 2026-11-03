import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLUMNS_BREAKPOINT_PX } from './helpers/breakpoint.ts';

const tokensCss = readFileSync(join(import.meta.dirname, '../src/styles/main.css'), 'utf8');
const mobilePath = join(import.meta.dirname, '../src/styles/mobile.css');

const LAYOUT_TOKENS: Record<string, string> = {
  '--col-side': '300px',
  '--h-S': '180px',
  '--h-M': '360px',
  '--h-L': '600px',
  '--chip-h': '32px',
};

describe('layout tokens', () => {
  for (const [name, value] of Object.entries(LAYOUT_TOKENS)) {
    it(`${name} is ${value}`, () => {
      const m = tokensCss.match(new RegExp(`${name}:\\s*([^;]+);`));
      expect(m?.[1]?.trim()).toBe(value);
    });
  }

  it('breakpoint constant is 1200', () => {
    expect(COLUMNS_BREAKPOINT_PX).toBe(1200);
  });

  it('mobile.css uses the same breakpoint literal', () => {
    const css = readFileSync(mobilePath, 'utf8');
    expect(css.match(/\b1200px/g) ?? []).toHaveLength(2); // one in the comment, one in the @media
    expect(css).toContain(`@media (max-width: ${COLUMNS_BREAKPOINT_PX}px)`);
  });
});
