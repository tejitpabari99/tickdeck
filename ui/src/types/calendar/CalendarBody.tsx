import type { CalendarData } from '../../../../src/index.js';
import type { CardTypeProps } from '../../registry/registry.ts';

/** Placeholder renderer (05 Task 2 contract only): plain event list. Replaced by the month grid + agenda in a later 05 task. */
export function CalendarBody({ data }: CardTypeProps<CalendarData>) {
  const events = Array.isArray(data?.events) ? data.events : [];
  return (
    <ul>
      {events.map((e, i) => (
        <li key={i}>{e.title}</li>
      ))}
    </ul>
  );
}
