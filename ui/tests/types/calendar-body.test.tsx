import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCardType } from '../../src/registry/registry.ts';
import '../../src/types/calendar/index.ts';
import type { CardTypeProps } from '../../src/registry/registry.ts';
import type { CalendarData } from '../../../src/index.js';

const def = getCardType('calendar')!;
type P = CardTypeProps<CalendarData>;

function renderCal(data: unknown, over: Partial<P> & { tz?: string } = {}) {
  const C = def.Component as React.ComponentType<P & { tz?: string }>;
  return render(
    <C
      card={{ id: 'c1' } as never}
      data={data as CalendarData}
      mode="column"
      query=""
      checked={new Set()}
      pending={new Set()}
      onItemAction={async () => {}}
      tz="UTC"
      {...over}
    />,
  );
}

const data = {
  events: [
    { title: 'Release freeze', start: '2026-10-14', allDay: true, color: 'negative' },
    { title: 'Standup', start: '2026-10-14T10:00:00Z', end: '2026-10-14T10:15:00Z', color: 'positive' },
    { title: 'Design review', start: '2026-10-14T14:30:00Z', location: 'Room 4B', link: 'https://example.com/r', color: '200 50 40' },
    { title: 'Offsite', start: '2026-10-16T09:00:00Z', end: '2026-10-18T17:00:00Z' },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const dayBtn = (n: number) => document.querySelector<HTMLElement>(`.cal-day[data-day="2026-10-${String(n).padStart(2, '0')}"]`)!;
const agenda = () => document.querySelector<HTMLElement>('.agenda-wrap')!;

describe('calendar body', () => {
  it('renders month grid, today highlight, dots and today agenda', () => {
    renderCal(data);
    expect(screen.getByText('October 2026')).toBeTruthy();
    expect(document.querySelectorAll('.cal-day')).toHaveLength(42);
    expect(document.querySelectorAll('.cal-wd')).toHaveLength(7);
    expect(dayBtn(14).className).toMatch(/today/);
    expect(dayBtn(14).className).toMatch(/selected/);
    expect(dayBtn(14).querySelectorAll('.cal-dot')).toHaveLength(3);
    expect(dayBtn(14).getAttribute('aria-pressed')).toBe('true');
    const a = within(agenda());
    expect(a.getByText('Today')).toBeTruthy();
    expect(a.getByText('All day')).toBeTruthy();
    expect(a.getByText('Standup')).toBeTruthy();
    expect(a.getByText('Room 4B')).toBeTruthy();
    expect(a.getByRole('link', { name: 'Design review' })).toBeTruthy();
    expect(a.queryByText('Offsite')).toBeNull();
    expect(document.querySelectorAll('.cal-day.out').length).toBeGreaterThan(0);
  });

  it('multi-day event dots on every spanned day', () => {
    renderCal(data);
    for (const n of [16, 17, 18]) expect(dayBtn(n).querySelectorAll('.cal-dot')).toHaveLength(1);
    expect(dayBtn(19).querySelectorAll('.cal-dot')).toHaveLength(0);
  });

  it('colour maps to custom property: token to var, H S L to hsl()', () => {
    renderCal(data);
    const items = [...agenda().querySelectorAll<HTMLElement>('.agenda-item')];
    const styles = items.map((i) => i.style.getPropertyValue('--ev'));
    expect(styles).toContain('var(--color-negative)');
    expect(styles).toContain('var(--color-positive)');
    expect(styles).toContain('hsl(200 50% 40%)');
  });

  it('clicking another day selects it; today stays highlighted; agenda follows', () => {
    renderCal(data);
    fireEvent.click(dayBtn(17));
    expect(dayBtn(17).className).toMatch(/selected/);
    expect(dayBtn(14).className).toMatch(/today/);
    expect(dayBtn(14).className).not.toMatch(/selected/);
    const a = within(agenda());
    expect(a.getByText('Offsite')).toBeTruthy();
    expect(a.getByText('all day')).toBeTruthy();
    expect(a.queryByText('Standup')).toBeNull();
    fireEvent.click(dayBtn(20));
    expect(a.getByText('No events')).toBeTruthy();
  });

  it('today button and clicking today return to today', () => {
    renderCal(data);
    fireEvent.click(dayBtn(20));
    fireEvent.click(screen.getByRole('button', { name: 'today' }));
    expect(within(agenda()).getByText('Standup')).toBeTruthy();
    fireEvent.click(dayBtn(20));
    fireEvent.click(dayBtn(14));
    expect(within(agenda()).getByText('Standup')).toBeTruthy();
  });

  it('prev/next change month and keep selection', () => {
    renderCal(data);
    fireEvent.click(dayBtn(17));
    fireEvent.click(screen.getByRole('button', { name: 'next month' }));
    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(within(agenda()).getByText('Offsite')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'previous month' }));
    expect(screen.getByText('September 2026')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'today' }));
    expect(screen.getByText('October 2026')).toBeTruthy();
  });

  it('month resets to current on data refresh', () => {
    const { rerender } = renderCal(data);
    fireEvent.click(screen.getByRole('button', { name: 'next month' }));
    expect(screen.getByText('November 2026')).toBeTruthy();
    const C = def.Component as React.ComponentType<P & { tz?: string }>;
    rerender(
      <C card={{ id: 'c1' } as never} data={{ events: [...data.events] }} mode="column" query="" checked={new Set()} pending={new Set()} onItemAction={async () => {}} tz="UTC" />,
    );
    expect(screen.getByText('October 2026')).toBeTruthy();
  });

  it('empty events shows No events', () => {
    renderCal({ events: [] });
    expect(within(agenda()).getByText('No events')).toBeTruthy();
    expect(within(agenda()).getByText('Today')).toBeTruthy();
  });

  it('dims finished events today', () => {
    renderCal(data);
    const standup = screen.getByText('Standup').closest('.agenda-item')!;
    expect(standup.className).toMatch(/done/);
    expect(screen.getByText('Design review').closest('.agenda-item')!.className).not.toMatch(/done/);
  });

  it('all-day keeps its date across tz', () => {
    for (const tz of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
      cleanup();
      renderCal({ events: [{ title: 'Holiday', start: '2026-10-14', allDay: true }] }, { tz });
      fireEvent.click(dayBtn(14));
      expect(within(agenda()).getByText('Holiday')).toBeTruthy();
      expect(within(agenda()).getByText('All day')).toBeTruthy();
    }
  });

  it('fullscreen renders the same body', () => {
    renderCal(data, { mode: 'fullscreen' });
    expect(document.querySelector('.cal')!.getAttribute('data-mode')).toBe('fullscreen');
    expect(document.querySelectorAll('.cal-day')).toHaveLength(42);
  });

  it('midnight rollover moves today', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'setTimeout'] });
    vi.setSystemTime(new Date('2026-10-14T23:59:00Z'));
    renderCal(data);
    expect(dayBtn(14).className).toMatch(/today/);
    act2(() => vi.advanceTimersByTime(2 * 60_000));
    expect(dayBtn(15).className).toMatch(/today/);
  });
});

import { act } from '@testing-library/react';
function act2(fn: () => void) {
  act(() => {
    fn();
  });
}
