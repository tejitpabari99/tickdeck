import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CalendarData } from '../../../../src/index.js';
import { CardLink } from '../../frame/CardLink.tsx';
import { useNow } from '../../lib/relative-time.ts';
import type { CardTypeProps } from '../../registry/registry.ts';
import { colorValue } from '../shared/color.ts';
import { buildAgenda, buildIndex, buildMonth, dayKey, localTz, weekStartDay } from './logic.ts';

function evStyle(c: string | undefined): CSSProperties | undefined {
  const v = colorValue(c);
  return v === undefined ? undefined : ({ '--ev': v } as CSSProperties);
}

interface View {
  y: number;
  m: number;
}

/** Month grid (6 weeks, locale week start) plus the selected day's agenda. Selection/month are UI-local state. */
export function CalendarBody({ data, mode, tz: tzProp }: CardTypeProps<CalendarData> & { tz?: string }) {
  const tz = tzProp ?? localTz();
  const now = useNow();
  const todayKey = dayKey(now, tz);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);

  // A data refresh resets the visible month to the current one (selection is kept).
  useEffect(() => {
    setView(null);
  }, [data]);

  const events = Array.isArray(data?.events) ? data.events : [];
  const index = useMemo(() => buildIndex(events, tz), [events, tz]);
  const selectedKey = selected ?? todayKey;
  const cur: View = view ?? { y: Number(todayKey.slice(0, 4)), m: Number(todayKey.slice(5, 7)) - 1 };
  const weekStart = weekStartDay();
  const cells = buildMonth(cur.y, cur.m, index, { weekStart, todayKey, selectedKey });
  const agenda = buildAgenda(index, selectedKey, { todayKey, now, tz });
  const monthLabel = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(Date.UTC(cur.y, cur.m, 1));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'short' }).format(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7))),
  );

  const shift = (n: number) => {
    const d = new Date(Date.UTC(cur.y, cur.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const goToday = () => {
    setSelected(null);
    setView(null);
  };
  const dayLabel = (key: string, count: number) =>
    `${new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(Date.parse(`${key}T00:00:00Z`))}, ${count === 0 ? 'no events' : `${count} event${count === 1 ? '' : 's'}`}`;

  return (
    <div className="cal" data-mode={mode}>
      <div className="cal-top">
        <span className="cal-month">{monthLabel}</span>
        <span className="cal-nav">
          <button className="cal-today-btn" type="button" aria-label="previous month" onClick={() => shift(-1)}>
            ‹
          </button>
          <button className="cal-today-btn" type="button" onClick={goToday}>
            today
          </button>
          <button className="cal-today-btn" type="button" aria-label="next month" onClick={() => shift(1)}>
            ›
          </button>
        </span>
      </div>
      <div className="cal-grid" role="group" aria-label={monthLabel}>
        {weekdays.map((w, i) => (
          <span key={i} className="cal-wd">
            {w}
          </span>
        ))}
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            data-day={c.key}
            aria-label={dayLabel(c.key, c.count)}
            aria-pressed={c.isSelected}
            className={`cal-day${c.inMonth ? '' : ' out'}${c.isToday ? ' today' : ''}${c.isSelected ? ' selected' : ''}`}
            onClick={() => (c.key === todayKey ? goToday() : setSelected(c.key))}
          >
            <span className="cal-num">{c.day}</span>
            <span className="cal-dots">
              {c.dots.map((d, i) => (
                <i key={i} className="cal-dot" style={evStyle(d)} />
              ))}
            </span>
          </button>
        ))}
      </div>
      <div className="agenda-wrap" aria-live="polite">
        <div className="agenda-head">{agenda.heading}</div>
        {agenda.entries.length === 0 ? (
          <p className="agenda-none">No events</p>
        ) : (
          <ul className="agenda">
            {agenda.entries.map((e, i) => (
              <li key={`${e.event.start}-${i}`} className={`agenda-item${e.done ? ' done' : ''}`} style={evStyle(e.event.color)}>
                <span className="agenda-time">{e.label}</span>
                <span className="agenda-title">
                  {e.event.link ? (
                    <CardLink href={e.event.link} title={e.event.title}>
                      {e.event.title}
                    </CardLink>
                  ) : (
                    e.event.title
                  )}
                </span>
                {e.event.location ? <span className="agenda-loc">{e.event.location}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
