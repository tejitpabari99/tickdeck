import { registerCardType } from '../../registry/registry.ts';
import { CalendarBody } from './CalendarBody.tsx';

export function searchText(data: { events?: unknown } | null | undefined): string {
  if (!Array.isArray(data?.events)) return '';
  return data.events.map((e: { title?: unknown }) => (typeof e?.title === 'string' ? e.title : '')).join(' ');
}

registerCardType('calendar', { Component: CalendarBody, searchText, allowedModes: ['column', 'now', 'fullscreen'] });
