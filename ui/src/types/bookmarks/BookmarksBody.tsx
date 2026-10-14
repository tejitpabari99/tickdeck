import type { BookmarksData } from '../../../../src/index.js';
import type { CardTypeProps } from '../../registry/registry.ts';

/** Placeholder renderer (05 Task 3 contract only): plain link list. Replaced by the grouped renderer in a later 05 task. */
export function BookmarksBody({ data }: CardTypeProps<BookmarksData>) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  return (
    <div>
      {groups.map((g, i) => (
        <ul key={i}>
          {(Array.isArray(g?.links) ? g.links : []).map((l, j) => (
            <li key={j}>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
