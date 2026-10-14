import { z } from 'zod';
import { asRecord, asRecords } from '../../utils/guards.js';
import { colorSchema, linkSchema } from '../formats.js';

/** Short emoji/text icon; URLs and paths are refused (no icon CDN). */
const iconSchema = z
  .string()
  .max(8)
  .refine((v) => !/^[a-z]+:/i.test(v) && !v.includes('/'), { message: 'icon must be an emoji or short text, not a URL or path' });

export const bookmarkLinkSchema = z.looseObject({
  title: z.string().min(1).max(200),
  url: linkSchema,
  description: z.string().max(200).optional(),
  icon: iconSchema.optional(),
});

export const bookmarkGroupSchema = z.looseObject({
  title: z.string().max(100).optional(),
  color: colorSchema.optional(),
  links: z.array(bookmarkLinkSchema).min(1).max(100),
});

export const bookmarksDataSchema = z.looseObject({ groups: z.array(bookmarkGroupSchema).min(1).max(50) });

export type BookmarkLink = z.infer<typeof bookmarkLinkSchema>;
export type BookmarkGroup = z.infer<typeof bookmarkGroupSchema>;
export type BookmarksData = z.infer<typeof bookmarksDataSchema>;

/** Notification summary: "N links" ('' when none). */
export function bookmarksSummary(data: unknown): string {
  const n = asRecords(asRecord(data)['groups']).reduce((sum, g) => sum + asRecords(g['links']).length, 0);
  return n === 0 ? '' : `${n} ${n === 1 ? 'link' : 'links'}`;
}
