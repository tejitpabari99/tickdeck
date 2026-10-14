// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildAgenda,
  buildIndex,
  buildMonth,
  dayKey,
  eventSpan,
  weekStartDay,
  type CalEvent,
} from '../../src/types/calendar/logic.ts';

const LA = 'America/Los_Angeles';
const KI = 'Pacific/Kiritimati';
const ev = (e: Partial<CalEvent> & { title: string; start: string }): CalEvent => e;

describe('dayKey / addDays', () => {
  it('uses the given tz', () => {
    const ms = Date.parse('2026-10-16T05:00:00Z');
    expect(dayKey(ms, LA)).toBe('2026-10-15');
    expect(dayKey(ms, KI)).toBe('2026-10-16');
  });
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('is DST-safe at day granularity', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });
});

describe('eventSpan', () => {
  it('timed without end is start day only', () => {
    expect(eventSpan(ev({ title: 'a', start: '2026-10-16T09:00:00-07:00' }), LA)).toEqual(['2026-10-16']);
  });
  it('timed spans local days', () => {
    const e = ev({ title: 'a', start: '2026-10-16T22:00:00-07:00', end: '2026-10-18T10:00:00-07:00' });
    expect(eventSpan(e, LA)).toEqual(['2026-10-16', '2026-10-17', '2026-10-18']);
  });
  it('end exactly at local midnight excludes the next day', () => {
    const e = ev({ title: 'a', start: '2026-10-16T20:00:00-07:00', end: '2026-10-17T00:00:00-07:00' });
    expect(eventSpan(e, LA)).toEqual(['2026-10-16']);
  });
  it('zero-length event at midnight stays on its day', () => {
    const e = ev({ title: 'a', start: '2026-10-17T00:00:00-07:00', end: '2026-10-17T00:00:00-07:00' });
    expect(eventSpan(e, LA)).toEqual(['2026-10-17']);
  });
  it('same instant lands on different days per tz', () => {
    const e = ev({ title: 'a', start: '2026-10-16T05:00:00Z' });
    expect(eventSpan(e, LA)).toEqual(['2026-10-15']);
    expect(eventSpan(e, KI)).toEqual(['2026-10-16']);
  });
  it('all-day keeps its date in every tz; end inclusive', () => {
    const e = ev({ title: 'a', start: '2026-10-16', end: '2026-10-18', allDay: true });
    for (const tz of [LA, KI, 'UTC']) expect(eventSpan(e, tz)).toEqual(['2026-10-16', '2026-10-17', '2026-10-18']);
  });
  it('all-day with offset datetime reads the date part literally', () => {
    const e = ev({ title: 'a', start: '2026-10-16T00:00:00-07:00', allDay: true });
    expect(eventSpan(e, KI)).toEqual(['2026-10-16']);
    expect(eventSpan(e, LA)).toEqual(['2026-10-16']);
  });
  it('skips NaN / garbage', () => {
    expect(eventSpan(ev({ title: 'a', start: 'nope' }), LA)).toEqual([]);
    expect(eventSpan(ev({ title: 'a', start: '2026-13-45', allDay: true }), LA)).toEqual([]);
    expect(eventSpan(ev({ title: 'a', start: '2026-10-16T09:00:00Z', end: 'bad' }), LA)).toEqual(['2026-10-16']);
  });
  it('DST spring-forward day: 1 day', () => {
    const e = ev({ title: 'a', start: '2026-03-08T00:00:00-08:00', end: '2026-03-09T00:00:00-07:00' });
    expect(eventSpan(e, LA)).toEqual(['2026-03-08']);
  });
  it('DST fall-back day: 1 day', () => {
    const e = ev({ title: 'a', start: '2026-11-01T00:00:00-07:00', end: '2026-11-02T00:00:00-08:00' });
    expect(eventSpan(e, LA)).toEqual(['2026-11-01']);
  });
});

describe('buildIndex', () => {
  it('sorts all-day first, then start, then title; labels multi-day', () => {
    const events = [
      ev({ title: 'b', start: '2026-10-16T10:00:00-07:00' }),
      ev({ title: 'a', start: '2026-10-16T10:00:00-07:00' }),
      ev({ title: 'early', start: '2026-10-16T08:00:00-07:00' }),
      ev({ title: 'day', start: '2026-10-16', allDay: true }),
      ev({ title: 'multi', start: '2026-10-15T09:00:00-07:00', end: '2026-10-17T17:00:00-07:00' }),
    ];
    const idx = buildIndex(events, LA, 'en-US');
    expect(idx.get('2026-10-16')!.map((x) => x.event.title)).toEqual(['day', 'multi', 'early', 'a', 'b']);
    const m = (k: string) => idx.get(k)!.find((x) => x.event.title === 'multi')!;
    expect(m('2026-10-15').kind).toBe('starts');
    expect(m('2026-10-15').label).toMatch(/^starts 9:00/);
    expect(m('2026-10-16').kind).toBe('middle');
    expect(m('2026-10-16').label).toBe('all day');
    expect(m('2026-10-17').kind).toBe('until');
    expect(m('2026-10-17').label).toMatch(/^until 5:00/);
    expect(idx.get('2026-10-16')![0]!.kind).toBe('allday');
    expect(idx.get('2026-10-16')![0]!.label).toBe('All day');
  });
  it('all-day event keeps its date across tz', () => {
    const events = [ev({ title: 'x', start: '2026-10-16', allDay: true })];
    for (const tz of [LA, KI]) expect([...buildIndex(events, tz).keys()]).toEqual(['2026-10-16']);
  });
  it('timed event lands on different day in LA vs Kiritimati', () => {
    const events = [ev({ title: 'x', start: '2026-10-16T05:00:00Z' })];
    expect([...buildIndex(events, LA).keys()]).toEqual(['2026-10-15']);
    expect([...buildIndex(events, KI).keys()]).toEqual(['2026-10-16']);
  });
  it('skips invalid events', () => {
    expect(buildIndex([ev({ title: 'x', start: 'zzz' })], LA).size).toBe(0);
  });
});

describe('weekStartDay', () => {
  it('uses getWeekInfo when available (en-US Sunday, de Monday)', () => {
    const fake = (firstDay: number) =>
      class {
        getWeekInfo() {
          return { firstDay };
        }
      };
    expect(weekStartDay('en-US', fake(7) as never)).toBe(0);
    expect(weekStartDay('de', fake(1) as never)).toBe(1);
    expect(weekStartDay('ar', fake(6) as never)).toBe(6);
  });
  it('reads weekInfo property form', () => {
    const C = class {
      weekInfo = { firstDay: 7 };
    };
    expect(weekStartDay('en-US', C as never)).toBe(0);
  });
  it('falls back to Monday when unsupported or throwing', () => {
    expect(weekStartDay('en-US', class {} as never)).toBe(1);
    expect(
      weekStartDay('en-US', class {
        constructor() {
          throw new Error('x');
        }
      } as never),
    ).toBe(1);
    expect(weekStartDay('en-US', null as never)).toBe(1);
  });
  it('real Intl returns 0..6', () => {
    const d = weekStartDay('en-US');
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(6);
  });
});

describe('buildMonth', () => {
  const idx = buildIndex(
    [
      ev({ title: 'a', start: '2026-10-16', allDay: true, color: '10 20% 30%' }),
      ev({ title: 'b', start: '2026-10-16T09:00:00-07:00' }),
      ev({ title: 'c', start: '2026-10-16T10:00:00-07:00' }),
      ev({ title: 'd', start: '2026-10-16T11:00:00-07:00' }),
    ],
    LA,
  );
  it('42 cells, Monday start', () => {
    const cells = buildMonth(2026, 9, idx, { weekStart: 1, todayKey: '2026-10-14', selectedKey: '2026-10-20' });
    expect(cells).toHaveLength(42);
    expect(cells[0]!.key).toBe('2026-09-28'); // Oct 1 2026 is Thursday
    expect(cells[0]!.inMonth).toBe(false);
    expect(cells[3]!.key).toBe('2026-10-01');
    expect(cells[3]!.inMonth).toBe(true);
    expect(cells[41]!.key).toBe('2026-11-08');
    expect(cells.filter((c) => c.isToday).map((c) => c.key)).toEqual(['2026-10-14']);
    expect(cells.filter((c) => c.isSelected).map((c) => c.key)).toEqual(['2026-10-20']);
  });
  it('Sunday start', () => {
    const cells = buildMonth(2026, 9, idx, { weekStart: 0, todayKey: '2026-10-14', selectedKey: '2026-10-14' });
    expect(cells[0]!.key).toBe('2026-09-27');
  });
  it('month starting on week start has no leading days', () => {
    const cells = buildMonth(2026, 5, idx, { weekStart: 1, todayKey: 'x', selectedKey: 'x' }); // Jun 1 2026 is Monday
    expect(cells[0]!.key).toBe('2026-06-01');
  });
  it('dots capped at 3, with colour and count', () => {
    const cells = buildMonth(2026, 9, idx, { weekStart: 1, todayKey: 'x', selectedKey: 'x' });
    const c = cells.find((x) => x.key === '2026-10-16')!;
    expect(c.count).toBe(4);
    expect(c.dots).toHaveLength(3);
    expect(c.dots[0]).toBe('10 20% 30%');
    expect(c.dots[1]).toBeUndefined();
    expect(cells.find((x) => x.key === '2026-10-17')!.dots).toEqual([]);
  });
  it('handles year wrap (December / January)', () => {
    const cells = buildMonth(2026, 11, new Map(), { weekStart: 1, todayKey: 'x', selectedKey: 'x' });
    expect(cells.some((c) => c.key === '2027-01-01')).toBe(true);
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });
});

describe('buildAgenda', () => {
  const events = [
    ev({ title: 'done', start: '2026-10-14T08:00:00-07:00', end: '2026-10-14T09:00:00-07:00' }),
    ev({ title: 'later', start: '2026-10-14T18:00:00-07:00' }),
    ev({ title: 'span', start: '2026-10-13', end: '2026-10-15', allDay: true }),
  ];
  const idx = buildIndex(events, LA);
  const now = Date.parse('2026-10-14T12:00:00-07:00');
  it('shows selected day entries; today heading and dims finished', () => {
    const a = buildAgenda(idx, '2026-10-14', { todayKey: '2026-10-14', now, tz: LA, locale: 'en-US' });
    expect(a.isToday).toBe(true);
    expect(a.heading).toBe('Today');
    expect(a.entries.map((e) => [e.event.title, e.done])).toEqual([
      ['span', false],
      ['done', true],
      ['later', false],
    ]);
  });
  it('other day: weekday heading, nothing dimmed, multi-day shows', () => {
    const a = buildAgenda(idx, '2026-10-15', { todayKey: '2026-10-14', now, tz: LA, locale: 'en-US' });
    expect(a.isToday).toBe(false);
    expect(a.heading).toBe('Thu, Oct 15');
    expect(a.entries.map((e) => e.event.title)).toEqual(['span']);
    expect(a.entries.every((e) => !e.done)).toBe(true);
  });
  it('empty day gives no entries', () => {
    expect(buildAgenda(idx, '2026-10-20', { todayKey: '2026-10-14', now, tz: LA }).entries).toEqual([]);
  });
});
