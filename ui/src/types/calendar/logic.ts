// Pure calendar logic: no DOM, no date library. Day keys are `YYYY-MM-DD` strings; the display
// tz is injectable (default: browser tz). Timed events use local days; all-day events are
// read literally from the string (a floating date), with an inclusive end.
import type { CalendarEvent } from '../../../../src/index.js';

export type CalEvent = CalendarEvent;
export type EntryKind = 'allday' | 'timed' | 'starts' | 'middle' | 'until';

export interface DayEntry {
  event: CalEvent;
  kind: EntryKind;
  /** "All day", "9:00", "starts 9:00", "all day", "until 5:00". */
  label: string;
  /** Sort instant (ms); all-day = UTC midnight of its first date. */
  startMs: number;
  /** End instant for dimming finished events (end ?? start); NaN for all-day. */
  endMs: number;
}
export type DayIndex = Map<string, DayEntry[]>;

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
  /** Up to 3 dot colours (event `color`, undefined = default primary). */
  dots: (string | undefined)[];
}

export interface Agenda {
  key: string;
  isToday: boolean;
  heading: string;
  entries: (DayEntry & { done: boolean })[];
}

const MAX_SPAN_DAYS = 400;
const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function localTz(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function parts(ms: number, tz: string): Record<string, string> {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(ms)) out[p.type] = p.value;
  return out;
}

/** `YYYY-MM-DD` of an instant in `tz`. */
export function dayKey(ms: number, tz: string = localTz()): string {
  const p = parts(ms, tz);
  return `${p['year']}-${p['month']}-${p['day']}`;
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

function keyOf(d: Date): string {
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Parse a key to a UTC-midnight Date (calendar arithmetic only; DST-free); null if not a real date. */
function parseKey(key: string): Date | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime()) || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** Integer y/m/d arithmetic on a key; never adds 86_400_000 ms to a local instant. */
export function addDays(key: string, n: number): string {
  const dt = parseKey(key);
  if (!dt) return key;
  dt.setUTCDate(dt.getUTCDate() + n);
  return keyOf(dt);
}

function isMidnight(ms: number, tz: string): boolean {
  const p = parts(ms, tz);
  return p['hour'] === '00' && p['minute'] === '00' && p['second'] === '00' && ms % 1000 === 0;
}

function allDayRange(e: CalEvent): [string, string] | null {
  const first = parseKey(e.start);
  if (!first) return null;
  const last = e.end === undefined ? null : parseKey(e.end);
  const f = keyOf(first);
  const l = last ? keyOf(last) : f;
  return [f, l < f ? f : l];
}

function timedRange(e: CalEvent, tz: string): [string, string] | null {
  const s = Date.parse(e.start);
  if (Number.isNaN(s)) return null;
  const first = dayKey(s, tz);
  const en = e.end === undefined ? NaN : Date.parse(e.end);
  if (Number.isNaN(en) || en <= s) return [first, first];
  let last = dayKey(en, tz);
  if (isMidnight(en, tz)) last = addDays(last, -1);
  return [first, last < first ? first : last];
}

/** Day keys an event spans (empty if its dates are unreadable). */
export function eventSpan(e: CalEvent, tz: string = localTz()): string[] {
  const range = e.allDay === true ? allDayRange(e) : timedRange(e, tz);
  if (!range) return [];
  const out: string[] = [];
  let k = range[0];
  while (k <= range[1] && out.length < MAX_SPAN_DAYS) {
    out.push(k);
    k = addDays(k, 1);
  }
  return out;
}

function timeLabel(ms: number, tz: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(ms);
}

/** Map of day key -> entries, sorted all-day first, then start instant, then title. */
export function buildIndex(events: readonly CalEvent[], tz: string = localTz(), locale?: string): DayIndex {
  const index: DayIndex = new Map();
  for (const e of events) {
    const span = eventSpan(e, tz);
    if (span.length === 0) continue;
    const allDay = e.allDay === true;
    const startMs = allDay ? (parseKey(e.start)?.getTime() ?? NaN) : Date.parse(e.start);
    if (Number.isNaN(startMs)) continue;
    const rawEnd = e.end === undefined ? startMs : Date.parse(e.end);
    const endMs = allDay ? NaN : Number.isNaN(rawEnd) ? startMs : rawEnd;
    span.forEach((k, i) => {
      let kind: EntryKind;
      let label: string;
      if (allDay) {
        kind = 'allday';
        label = 'All day';
      } else if (span.length === 1) {
        kind = 'timed';
        label = timeLabel(startMs, tz, locale);
      } else if (i === 0) {
        kind = 'starts';
        label = `starts ${timeLabel(startMs, tz, locale)}`;
      } else if (i === span.length - 1) {
        kind = 'until';
        label = `until ${timeLabel(endMs, tz, locale)}`;
      } else {
        kind = 'middle';
        label = 'all day';
      }
      const list = index.get(k) ?? [];
      list.push({ event: e, kind, label, startMs, endMs });
      index.set(k, list);
    });
  }
  for (const list of index.values()) {
    list.sort(
      (a, b) =>
        Number(b.kind === 'allday') - Number(a.kind === 'allday') ||
        a.startMs - b.startMs ||
        a.event.title.localeCompare(b.event.title),
    );
  }
  return index;
}

interface LocaleLike {
  getWeekInfo?: () => { firstDay?: number };
  weekInfo?: { firstDay?: number };
}

/** First weekday as 0=Sun..6=Sat from `Intl.Locale` week info; Monday when unsupported. */
export function weekStartDay(
  locale: string | undefined = typeof navigator !== 'undefined' ? navigator.language : undefined,
  LocaleCtor: new (tag: string) => LocaleLike = Intl.Locale as unknown as new (tag: string) => LocaleLike,
): number {
  try {
    const loc = new LocaleCtor(locale ?? 'en-US');
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    const first = info?.firstDay;
    if (typeof first === 'number' && first >= 1 && first <= 7) return first % 7;
  } catch {
    /* unsupported: fall through */
  }
  return 1;
}

export interface MonthOpts {
  weekStart: number;
  todayKey: string;
  selectedKey: string;
}

/** 42 cells (6 weeks) for `month0` (0-based) of `year`, starting on `weekStart`. */
export function buildMonth(year: number, month0: number, index: DayIndex, opts: MonthOpts): MonthCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month0, 1));
  const lead = (firstOfMonth.getUTCDay() - opts.weekStart + 7) % 7;
  const start = keyOf(firstOfMonth);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const key = addDays(start, i - lead);
    const dt = parseKey(key)!;
    const entries = index.get(key) ?? [];
    cells.push({
      key,
      day: dt.getUTCDate(),
      inMonth: dt.getUTCMonth() === month0 && dt.getUTCFullYear() === year,
      isToday: key === opts.todayKey,
      isSelected: key === opts.selectedKey,
      count: entries.length,
      dots: entries.slice(0, 3).map((x) => x.event.color),
    });
  }
  return cells;
}

export interface AgendaOpts {
  todayKey: string;
  now: number;
  tz?: string;
  locale?: string;
}

/** Selected day's entries; finished timed events on today are flagged `done` (dimmed). */
export function buildAgenda(index: DayIndex, selectedKey: string, opts: AgendaOpts): Agenda {
  const isToday = selectedKey === opts.todayKey;
  const dt = parseKey(selectedKey);
  const heading = isToday
    ? 'Today'
    : dt
      ? new Intl.DateTimeFormat(opts.locale, { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(dt)
      : selectedKey;
  const entries = (index.get(selectedKey) ?? []).map((e) => ({
    ...e,
    done: isToday && e.kind !== 'allday' && e.kind !== 'middle' && e.endMs < opts.now,
  }));
  return { key: selectedKey, isToday, heading, entries };
}
