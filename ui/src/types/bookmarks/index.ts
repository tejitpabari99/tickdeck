import { registerCardType } from '../../registry/registry.ts';
import { BookmarksBody } from './BookmarksBody.tsx';

export function searchText(data: { groups?: unknown } | null | undefined): string {
  if (!Array.isArray(data?.groups)) return '';
  return data.groups
    .flatMap((g: { links?: unknown }) => (Array.isArray(g?.links) ? g.links : []))
    .map((l: { title?: unknown; description?: unknown; url?: unknown }) =>
      [l?.title, l?.description, l?.url].filter((v): v is string => typeof v === 'string').join(' '),
    )
    .join(' ');
}

registerCardType('bookmarks', { Component: BookmarksBody, searchText, allowedModes: ['column', 'now', 'fullscreen'] });
