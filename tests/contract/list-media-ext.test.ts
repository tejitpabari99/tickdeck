import { describe, expect, it } from 'vitest';
import { registry, validateCardFolder } from '../../src/contract/index.js';

const NOW = new Date('2026-10-05T10:00:00Z');
const MT = Date.parse('2026-10-05T09:00:00Z');

function run(type: 'list' | 'media', opts: { card?: Record<string, unknown>; data?: Record<string, unknown> } = {}) {
  const t = registry[type];
  return validateCardFolder({
    folderId: 'my-card',
    cardText: JSON.stringify({ ...t.template.card, ...opts.card }),
    data: { text: JSON.stringify({ ...t.template.data, ...(opts.data ? { data: opts.data } : {}) }), mtimeMs: MT },
    now: NOW,
  });
}

describe('list style + meta', () => {
  it('style cards is Broken at /style', () => {
    expect(run('list', { card: { style: 'cards' } })).toMatchObject({ status: 'broken', reason: 'schema-invalid', issues: [{ path: '/style' }] });
  });
  it.each(['rows', 'detailed'])('style %s ok', (style) => {
    expect(run('list', { card: { style } })).toMatchObject({ status: 'ok', card: { style } });
  });
  it.each(['rows', 'detailed'])('meta accepted with style %s', (style) => {
    expect(run('list', { card: { style }, data: { items: [{ text: 'a', meta: 'github · 2h ago' }] } }).status).toBe('ok');
  });
  it('meta over 200 chars rejected', () => {
    expect(run('list', { data: { items: [{ text: 'a', meta: 'x'.repeat(201) }] } }).status).toBe('broken');
  });
  it('list in a side column stays side-not-allowed', () => {
    const r = run('list', { card: { layout: { column: 'left', order: 0, height: 'auto' } } });
    expect(r).toMatchObject({ status: 'broken', reason: 'side-not-allowed' });
  });
  it('template uses detailed + meta and is valid', () => {
    expect(registry.list.template.card['style']).toBe('detailed');
    expect(run('list').status).toBe('ok');
  });
});

describe('media meta + row layout', () => {
  it('layout row ok, meta ok', () => {
    expect(run('media', { data: { layout: 'row', items: [{ src: 'https://e.com/a.jpg', meta: 'm' }] } }).status).toBe('ok');
  });
  it('unknown layout broken; long meta broken', () => {
    expect(run('media', { data: { layout: 'carousel', items: [{ src: 'https://e.com/a.jpg' }] } }).status).toBe('broken');
    expect(run('media', { data: { items: [{ src: 'https://e.com/a.jpg', meta: 'x'.repeat(201) }] } }).status).toBe('broken');
  });
  it('template uses row and meta; existing grid/single still valid', () => {
    const d = registry.media.template.data['data'] as { layout: string; items: { meta?: string }[] };
    expect(d.layout).toBe('row');
    expect(d.items.some((i) => i.meta)).toBe(true);
    expect(run('media', { data: { layout: 'grid', items: [{ src: 'https://e.com/a.jpg' }] } }).status).toBe('ok');
    expect(run('media', { data: { layout: 'single', items: [{ src: 'https://e.com/a.jpg' }] } }).status).toBe('ok');
  });
});
