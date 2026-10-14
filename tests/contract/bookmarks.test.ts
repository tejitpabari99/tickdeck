import { describe, expect, it } from 'vitest';
import { bookmarksDataSchema, bookmarksSummary } from '../../src/contract/types/bookmarks.js';
import { getExample, registry, sidesAllowed } from '../../src/contract/index.js';

const link = (o: Record<string, unknown> = {}) => ({ title: 'T', url: 'https://x.test', ...o });
const parse = (groups: unknown[]) => bookmarksDataSchema.safeParse({ groups });
const group = (o: Record<string, unknown> = {}) => ({ links: [link()], ...o });

describe('bookmarks schema', () => {
  it('accepts full group/link and extras', () => {
    expect(parse([group({ title: 'G', color: '220 80 50', links: [link({ description: 'd', icon: '📚', x: 1 })] })]).success).toBe(true);
    expect(parse([group({ color: 'primary' })]).success).toBe(true);
  });
  it('icon: <=8 chars, no scheme, no slash', () => {
    const icon = (i: string) => parse([group({ links: [link({ icon: i })] })]).success;
    expect(icon('https://x/y.png')).toBe(false);
    expect(icon('a/b')).toBe(false);
    expect(icon('data:x')).toBe(false);
    expect(icon('123456789')).toBe(false);
    expect(icon('12345678')).toBe(true);
    expect(icon('GH')).toBe(true);
  });
  it('limits', () => {
    expect(parse([]).success).toBe(false);
    expect(parse(Array.from({ length: 50 }, () => group())).success).toBe(true);
    expect(parse(Array.from({ length: 51 }, () => group())).success).toBe(false);
    expect(parse([group({ links: [] })]).success).toBe(false);
    expect(parse([group({ links: Array.from({ length: 100 }, () => link()) })]).success).toBe(true);
    expect(parse([group({ links: Array.from({ length: 101 }, () => link()) })]).success).toBe(false);
    expect(parse([group({ title: 'a'.repeat(101) })]).success).toBe(false);
    expect(parse([group({ color: 'red' })]).success).toBe(false);
    expect(parse([group({ links: [link({ title: '' })] })]).success).toBe(false);
    expect(parse([group({ links: [link({ title: 'a'.repeat(201) })] })]).success).toBe(false);
    expect(parse([group({ links: [link({ description: 'a'.repeat(201) })] })]).success).toBe(false);
    expect(parse([group({ links: [link({ url: 'javascript:alert(1)' })] })]).success).toBe(false);
  });
});

describe('bookmarksSummary', () => {
  it('counts links', () => {
    expect(bookmarksSummary({ groups: [group({ links: [link(), link()] }), group()] })).toBe('3 links');
    expect(bookmarksSummary({ groups: [group()] })).toBe('1 link');
  });
  it('defensive', () => {
    expect(bookmarksSummary(null)).toBe('');
    expect(bookmarksSummary({ groups: [{ links: 'x' }, 5] })).toBe('');
  });
});

describe('bookmarks registry', () => {
  it('registered, sides allowed, template validates', () => {
    expect(sidesAllowed('bookmarks')).toBe(true);
    const ex = getExample('bookmarks')!;
    expect(ex.card['type']).toBe('bookmarks');
    expect(registry.bookmarks.schema.safeParse(ex.data['data']).success).toBe(true);
  });
});
