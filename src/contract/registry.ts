import { z } from 'zod';
import bookmarksCard from '../../templates/bookmarks/card.json' with { type: 'json' };
import bookmarksData from '../../templates/bookmarks/data.json' with { type: 'json' };
import calendarCard from '../../templates/calendar/card.json' with { type: 'json' };
import calendarData from '../../templates/calendar/data.json' with { type: 'json' };
import kpiCard from '../../templates/kpi/card.json' with { type: 'json' };
import kpiData from '../../templates/kpi/data.json' with { type: 'json' };
import listCard from '../../templates/list/card.json' with { type: 'json' };
import listData from '../../templates/list/data.json' with { type: 'json' };
import markdownCard from '../../templates/markdown/card.json' with { type: 'json' };
import markdownData from '../../templates/markdown/data.json' with { type: 'json' };
import mediaCard from '../../templates/media/card.json' with { type: 'json' };
import mediaData from '../../templates/media/data.json' with { type: 'json' };
import tableCard from '../../templates/table/card.json' with { type: 'json' };
import tableData from '../../templates/table/data.json' with { type: 'json' };
import { bookmarksDataSchema, bookmarksSummary } from './types/bookmarks.js';
import { calendarDataSchema, calendarSummary } from './types/calendar.js';
import { kpiDataSchema, kpiSummary } from './types/kpi.js';
import { listDataSchema, listSummary } from './types/list.js';
import { markdownDataSchema, markdownSummary } from './types/markdown.js';
import { mediaDataSchema, mediaSummary } from './types/media.js';
import { tableDataSchema, tableSummary, tableWarnings } from './types/table.js';

/** Embedded example card folder: card.json + data.json contents. */
export interface Example {
  card: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface TypeEntry {
  /** Payload schema for this type's `data` (the `data` key of data.json). */
  schema: z.ZodType;
  /** Plain-text one-line notification summary of this type's `data` (defensive: data may be unvalidated on error cards). */
  summary: (data: unknown) => string;
  /** Example folder, embedded at build time from templates/<type>/ (bundler-safe, no fs). */
  template: Example;
  /** Where this type may render. 'deny' = center column only (sides are permanent reference). Mandatory so new types must decide. */
  sides: 'allow' | 'deny';
  /** Optional non-fatal payload warnings (paths relative to data.json root). */
  warnings?: (data: unknown) => string[];
  /** Optional per-type validator for card.json view fields (`{ style }`); failures are schema-invalid at path `/style`. */
  view?: z.ZodType;
}

/** The single place card types are registered (D7). */
export const registry = {
  markdown: { schema: markdownDataSchema, summary: markdownSummary, template: { card: markdownCard, data: markdownData }, sides: 'allow' },
  table: { schema: tableDataSchema, summary: tableSummary, template: { card: tableCard, data: tableData }, sides: 'deny', warnings: tableWarnings },
  list: { schema: listDataSchema, summary: listSummary, template: { card: listCard, data: listData }, sides: 'deny', view: z.object({ style: z.enum(['rows', 'detailed']).optional() }) },
  kpi: { schema: kpiDataSchema, summary: kpiSummary, template: { card: kpiCard, data: kpiData }, sides: 'allow' },
  media: { schema: mediaDataSchema, summary: mediaSummary, template: { card: mediaCard, data: mediaData }, sides: 'allow' },
  calendar: { schema: calendarDataSchema, summary: calendarSummary, template: { card: calendarCard, data: calendarData }, sides: 'allow' },
  bookmarks: { schema: bookmarksDataSchema, summary: bookmarksSummary, template: { card: bookmarksCard, data: bookmarksData }, sides: 'allow' },
} as const satisfies Record<string, TypeEntry>;

export type RegisteredType = keyof typeof registry;
/** Alias of `RegisteredType`: the registry is the only list of type names. */
export type KnownType = RegisteredType;

export function isRegisteredType(t: string): t is RegisteredType {
  return Object.prototype.hasOwnProperty.call(registry, t);
}

export function listTypes(): RegisteredType[] {
  return Object.keys(registry) as RegisteredType[];
}

/** Whether a card of this type may render in the left/right columns. */
export function sidesAllowed(type: string): boolean {
  return isRegisteredType(type) && registry[type].sides === 'allow';
}

/** Example folder ({ card, data }) for a type; undefined if unknown type. */
export function getExample(type: string): Example | undefined {
  return isRegisteredType(type) ? structuredClone(registry[type].template) as Example : undefined;
}

/**
 * Whether a card of this type must have a data file. Always true today; seam for a future
 * per-type `dataOptional` registry flag.
 */
export function dataRequired(type: string): boolean {
  void type;
  return true;
}
