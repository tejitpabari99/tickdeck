import { describe, expect, it } from 'vitest';
import { registry, validateCardFolder } from '../../src/contract/index.js';
import { colorSchema } from '../../src/contract/formats.js';

const NOW = new Date('2026-10-05T10:00:00Z');
const MT = Date.parse('2026-10-05T09:00:00Z');

function run(type: 'list' | 'markdown', extra: Record<string, unknown>) {
  const t = registry[type];
  return validateCardFolder({
    folderId: 'my-card',
    cardText: JSON.stringify({ ...t.template.card, type, ...extra }),
    data: { text: JSON.stringify(t.template.data), mtimeMs: MT },
    now: NOW,
  });
}

describe('colorSchema', () => {
  it.each(['primary', 'positive', 'negative', '220 80 50', '0 0 0', '360 100 100'])('accepts %s', (v) => {
    expect(colorSchema.safeParse(v).success).toBe(true);
  });
  it.each(['red', '#fff', 'hsl(1 2 3)', '1 2', '1 2 3 4', '1000 1 1', '1,2,3', ' primary', 'Primary', '', '1 2 3%'])('rejects %j', (v) => {
    expect(colorSchema.safeParse(v).success).toBe(false);
  });
});

describe('registry view + ViewCard style plumbing', () => {
  it('invalid style on a type with view -> schema-invalid at /style', () => {
    const r = run('list', { style: 'cards' });
    expect(r).toMatchObject({ status: 'broken', reason: 'schema-invalid', issues: [{ path: '/style' }] });
  });

  it('valid or absent style passes; valid style is carried on the card', () => {
    expect(run('list', {})).toMatchObject({ status: 'ok' });
    const r = run('list', { style: 'detailed' });
    expect(r).toMatchObject({ status: 'ok', card: { style: 'detailed' } });
  });

  it('types without view are unaffected by style', () => {
    const r = run('markdown', { style: 'whatever' });
    expect(r.status).toBe('ok');
  });
});
