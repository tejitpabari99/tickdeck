import { z } from 'zod';
import { asRecord, asRecords, asText } from '../../utils/guards.js';
import { colorSchema, dueSchema, linkSchema, timestampSchema } from '../formats.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Instant used for ordering; date-only values are floating dates, read as UTC midnight. */
function instant(v: string): number {
  return Date.parse(v);
}

export const eventSchema = z
  .looseObject({
    title: z.string().min(1).max(200),
    start: z.string(),
    end: z.string().optional(),
    allDay: z.boolean().optional(),
    location: z.string().max(200).optional(),
    link: linkSchema.optional(),
    color: colorSchema.optional(),
  })
  .superRefine((e, ctx) => {
    // allDay: YYYY-MM-DD or RFC 3339 (dueSchema); otherwise RFC 3339 only.
    const dateSchema = e.allDay === true ? dueSchema : timestampSchema;
    let ok = true;
    for (const key of ['start', 'end'] as const) {
      const v = e[key];
      if (v === undefined) continue;
      const r = dateSchema.safeParse(v);
      if (!r.success) {
        ok = false;
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message:
            e.allDay === true
              ? 'must be YYYY-MM-DD or an RFC 3339 datetime with offset or Z'
              : 'must be an RFC 3339 timestamp with offset or Z (date-only requires allDay: true)',
        });
      }
    }
    if (ok && e.end !== undefined && instant(e.end) < instant(e.start)) {
      ctx.addIssue({ code: 'custom', path: ['end'], message: 'end must not be before start' });
    }
  });

export const calendarDataSchema = z.looseObject({ events: z.array(eventSchema).max(500) });

export type CalendarEvent = z.infer<typeof eventSchema>;
export type CalendarData = z.infer<typeof calendarDataSchema>;

/** Upcoming = not yet ended at `now`. Date-only values are floating: compared by UTC date of `now`. */
function isUpcoming(start: string, end: string | undefined, now: Date): boolean {
  const last = end ?? start;
  if (DATE_ONLY.test(last)) return last >= now.toISOString().slice(0, 10);
  return instant(last) >= now.getTime();
}

/**
 * Notification summary: first upcoming event (earliest start among events not yet ended at `now`)
 * as "Title (+N more)" where N counts the other upcoming events; '' when none. `now` is injectable.
 */
export function calendarSummary(data: unknown, now: Date = new Date()): string {
  const upcoming = asRecords(asRecord(data)['events'])
    .map((e) => ({ title: asText(e['title']), start: asText(e['start']), end: typeof e['end'] === 'string' ? e['end'] : undefined }))
    .filter((e) => e.title !== '' && !Number.isNaN(instant(e.start)) && isUpcoming(e.start, e.end, now))
    .sort((a, b) => instant(a.start) - instant(b.start));
  if (upcoming.length === 0) return '';
  const first = upcoming[0]!.title;
  return upcoming.length > 1 ? `${first} (+${upcoming.length - 1} more)` : first;
}
