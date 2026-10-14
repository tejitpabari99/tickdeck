import { describe, expect, it } from 'vitest';
import { calendarDataSchema, calendarSummary } from '../../src/contract/types/calendar.js';
import { getExample, registry, sidesAllowed } from '../../src/contract/index.js';

const ev = (o: Record<string, unknown>) => ({ title: 'T', start: '2026-10-05T09:00:00Z', ...o });
const parse = (events: unknown[]) => calendarDataSchema.safeParse({ events });
const paths = (events: unknown[]) => {
  const r = parse(events);
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
};

describe('calendar schema', () => {
  it('accepts full event, empty list, extras', () => {
    const e = ev({ end: '2026-10-05T12:00:00+02:00', location: 'Room', link: 'https://x.test', color: '220 80 50', x: 1 });
    expect(parse([e]).success).toBe(true);
    expect(parse([]).success).toBe(true);
  });
  it('rejects non-RFC3339 start/end with paths', () => {
    expect(paths([ev({ start: 'Oct 5' })])).toEqual(['events.0.start']);
    expect(paths([ev({ end: 'tomorrow' })])).toEqual(['events.0.end']);
    expect(parse([ev({ start: '2026-10-05T09:00:00' })]).success).toBe(false);
  });
  it('date-only only with allDay', () => {
    expect(parse([ev({ start: '2026-10-05' })]).success).toBe(false);
    expect(paths([ev({ start: '2026-10-05' })])).toEqual(['events.0.start']);
    expect(paths([ev({ end: '2026-10-06' })])).toEqual(['events.0.end']);
    expect(parse([ev({ start: '2026-10-05', end: '2026-10-07', allDay: true })]).success).toBe(true);
    expect(parse([ev({ start: '2026-02-30', allDay: true })]).success).toBe(false);
  });
  it('end must be >= start', () => {
    expect(paths([ev({ end: '2026-10-05T08:00:00Z' })])).toEqual(['events.0.end']);
    expect(parse([ev({ end: '2026-10-05T09:00:00Z' })]).success).toBe(true);
    expect(paths([ev({ start: '2026-10-05', end: '2026-10-04', allDay: true })])).toEqual(['events.0.end']);
  });
  it('field limits', () => {
    expect(parse([ev({ title: '' })]).success).toBe(false);
    expect(parse([ev({ title: 'a'.repeat(201) })]).success).toBe(false);
    expect(parse([ev({ location: 'a'.repeat(201) })]).success).toBe(false);
    expect(parse([ev({ link: 'javascript:alert(1)' })]).success).toBe(false);
    expect(parse([ev({ color: 'red' })]).success).toBe(false);
    expect(parse(Array.from({ length: 500 }, () => ev({}))).success).toBe(true);
    expect(parse(Array.from({ length: 501 }, () => ev({}))).success).toBe(false);
  });
  it('has no days field (extras tolerated, not required)', () => {
    expect(calendarDataSchema.safeParse({ events: [], days: 3 }).success).toBe(true);
    expect(calendarDataSchema.safeParse({}).success).toBe(false);
  });
});

describe('calendarSummary', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  const evs = [
    ev({ title: 'Later', start: '2026-10-07T09:00:00Z' }),
    ev({ title: 'Past', start: '2026-10-01T09:00:00Z' }),
    ev({ title: 'Soon', start: '2026-10-05T15:00:00Z' }),
  ];
  it('first upcoming (by start) with +N more', () => {
    expect(calendarSummary({ events: evs }, now)).toBe('Soon (+1 more)');
  });
  it('single upcoming has no suffix', () => {
    expect(calendarSummary({ events: [evs[0]] }, now)).toBe('Later');
  });
  it('in-progress event counts as upcoming; ended does not', () => {
    expect(calendarSummary({ events: [ev({ title: 'Now', start: '2026-10-05T11:00:00Z', end: '2026-10-05T13:00:00Z' })] }, now)).toBe('Now');
    expect(calendarSummary({ events: [ev({ title: 'Done', start: '2026-10-05T10:00:00Z', end: '2026-10-05T11:00:00Z' })] }, now)).toBe('');
  });
  it('all-day today counts; yesterday does not', () => {
    expect(calendarSummary({ events: [ev({ title: 'Hol', start: '2026-10-05', allDay: true })] }, now)).toBe('Hol');
    expect(calendarSummary({ events: [ev({ title: 'Old', start: '2026-10-04', allDay: true })] }, now)).toBe('');
  });
  it('empty / defensive', () => {
    expect(calendarSummary({ events: [] }, now)).toBe('');
    expect(calendarSummary(null, now)).toBe('');
    expect(calendarSummary({ events: [{ title: 1 }, 'x'] }, now)).toBe('');
  });
});

describe('calendar registry', () => {
  it('registered, sides allowed, template validates', () => {
    expect(sidesAllowed('calendar')).toBe(true);
    const ex = getExample('calendar')!;
    expect(ex.card['type']).toBe('calendar');
    expect(registry.calendar.schema.safeParse(ex.data['data']).success).toBe(true);
  });
});
