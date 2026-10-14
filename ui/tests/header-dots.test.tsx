// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Header, type HeaderProps } from '../src/zones/Header.tsx';

const styles = join(import.meta.dirname, '../src/styles');
const mainCss = readFileSync(join(styles, 'main.css'), 'utf8');
const siteCss = readFileSync(join(styles, 'site.css'), 'utf8');

/** Resolve `var(--x)` from main.css custom properties (jsdom does not cascade custom properties). */
function resolveVars(value: string): string {
  return value.replace(/var\((--[\w-]+)\)/g, (_m, name: string) => {
    const m = new RegExp(`${name}:\\s*([^;]+);`).exec(mainCss);
    return m ? resolveVars(m[1]!.trim()) : '';
  });
}

function dotBackground(modifier: string): string {
  const rule = new RegExp(`\\.header__dot--${modifier}\\s*\\{([^}]*)\\}`).exec(siteCss);
  const decl = /background:\s*([^;]+);/.exec(rule?.[1] ?? '');
  return resolveVars(decl?.[1]?.trim() ?? '');
}

const baseProps: Omit<HeaderProps, 'connectionOk'> = {
  alertCount: 0,
  hidden: [],
  filter: 'all',
  onFilter: () => {},
  onUnhide: () => {},
  search: {
    query: '',
    onQuery: () => {},
    visible: [],
    total: 0,
    others: [],
    onUnhide: () => {},
    onOpenCompleted: () => {},
  },
};

afterEach(cleanup);

describe('header status dots', () => {
  for (const [ok, mod, label] of [
    [true, 'ok', 'Connected'],
    [false, 'bad', 'Connection problem'],
  ] as const) {
    it(`${mod} dot has a valid, non-transparent computed colour`, () => {
      render(<Header {...baseProps} connectionOk={ok} />);
      const dot = screen.getByRole('img', { name: label });
      expect(dot.className).toContain(`header__dot--${mod}`);
      dot.style.background = dotBackground(mod); // invalid values (e.g. hsl(hsl(...))) are dropped
      const bg = getComputedStyle(dot).backgroundColor;
      expect(bg).not.toBe('');
      expect(bg).not.toBe('transparent');
      expect(bg).not.toMatch(/rgba\(0, 0, 0, 0\)/);
    });
  }

  it('no stylesheet wraps a colour variable in hsl()', () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.css') ? [join(d, e.name)] : []
      );
    for (const f of walk(join(styles, '..'))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/hsl\(var\(--(positive|negative)\)\)/);
    }
  });

  it('no theme toggle in the header', () => {
    render(<Header {...baseProps} connectionOk />);
    expect(screen.queryByRole('button', { name: /theme/i })).toBeNull();
  });
});
