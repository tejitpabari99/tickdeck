import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { BookmarkGroup, BookmarkLink, BookmarksData } from '../../../../src/index.js';
import { CardLink } from '../../frame/CardLink.tsx';
import type { CardTypeProps } from '../../registry/registry.ts';
import { colorValue } from '../shared/color.ts';
import { highlight } from '../shared/highlight.tsx';
import { matchTokens } from '../shared/matchTokens.ts';

const linkText = (l: BookmarkLink) => [l.title, l.description, l.url].filter((v): v is string => typeof v === 'string').join(' ');

/** Grouped links. The header query narrows links by title/description/url; fullscreen wraps groups into columns. */
export function BookmarksBody({ data, mode, query }: CardTypeProps<BookmarksData>) {
  const groups = useMemo<BookmarkGroup[]>(() => (Array.isArray(data?.groups) ? data.groups : []), [data]);
  const shown = useMemo(() => {
    const filtered = groups
      .map((g) => ({ g, links: (Array.isArray(g?.links) ? g.links : []).filter((l) => matchTokens(linkText(l), query)) }))
      .filter((x) => x.links.length > 0);
    // Card matched via its title only: show everything rather than an empty body.
    return filtered.length > 0 ? filtered : groups.map((g) => ({ g, links: Array.isArray(g?.links) ? g.links : [] }));
  }, [groups, query]);

  return (
    <div className="bm" data-mode={mode}>
      {shown.map(({ g, links }, i) => {
        const tint = colorValue(g.color);
        return (
          <div key={i} className="bm-group">
            {g.title ? (
              <div className="bm-title" style={tint === undefined ? undefined : ({ '--tint': tint } as CSSProperties)}>
                {g.title}
              </div>
            ) : null}
            <ul className="bm-list">
              {links.map((l, j) => (
                <li key={j} className="bm-item">
                  <CardLink href={l.url} title={l.title}>
                    {l.icon ? <span className="bm-icon">{l.icon}</span> : null}
                    {highlight(l.title, query)}
                  </CardLink>
                  {l.description ? <span className="bm-desc">{highlight(l.description, query)}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
