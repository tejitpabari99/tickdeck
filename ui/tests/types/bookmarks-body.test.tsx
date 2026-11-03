import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getCardType } from '../../src/registry/registry.ts';
import '../../src/types/bookmarks/index.ts';
import type { CardTypeProps } from '../../src/registry/registry.ts';
import type { BookmarksData } from '../../../src/index.js';
import { matchCards } from '../../src/lib/search.ts';

const def = getCardType('bookmarks')!;
type P = CardTypeProps<BookmarksData>;

function renderBm(data: unknown, over: Partial<P> = {}) {
  const C = def.Component as React.ComponentType<P>;
  return render(
    <C card={{ id: 'b1' } as never} data={data as BookmarksData} mode="column" query="" checked={new Set()} pending={new Set()} onItemAction={async () => {}} {...over} />,
  );
}

const data = {
  groups: [
    {
      title: 'Work',
      color: 'primary',
      links: [
        { title: 'Build dashboard', url: 'https://ci.example.com/builds', description: 'Pipelines and runs', icon: '🔧' },
        { title: 'Sprint board', url: 'https://jira.example.com/board' },
      ],
    },
    { title: 'Custom', color: '200 50 40', links: [{ title: 'Blog', url: 'https://blog.example.com' }] },
    { links: [{ title: 'Handbook', url: 'https://hb.example.com' }] },
  ],
};

afterEach(cleanup);

describe('bookmarks body', () => {
  it('renders tinted titles, CardLinks, icon, description; untitled group has no heading', () => {
    const { container } = renderBm(data);
    const titles = container.querySelectorAll('.bm-title');
    expect(titles).toHaveLength(2);
    expect((titles[0] as HTMLElement).style.getPropertyValue('--tint')).toBe('var(--color-primary)');
    expect((titles[1] as HTMLElement).style.getPropertyValue('--tint')).toBe('hsl(200 50% 40%)');
    expect(container.querySelectorAll('a.card-link')).toHaveLength(4);
    expect(screen.getByText('🔧').className).toBe('bm-icon');
    expect(screen.getByText('Pipelines and runs').className).toBe('bm-desc');
    expect(container.querySelectorAll('.bm-group')).toHaveLength(3);
  });

  it('does not tint on an invalid colour', () => {
    const { container } = renderBm({ groups: [{ title: 'X', color: 'red; x', links: [{ title: 'a', url: 'https://a.b' }] }] });
    expect((container.querySelector('.bm-title') as HTMLElement).getAttribute('style')).toBeNull();
  });

  it('filters links by title, description and url', () => {
    for (const [q, kept] of [['sprint', 'Sprint board'], ['pipelines', 'Build dashboard'], ['blog.example', 'Blog']] as const) {
      const { container, unmount } = renderBm(data, { query: q });
      expect(container.querySelectorAll('a.card-link')).toHaveLength(1);
      expect(container.querySelector('a.card-link')!.getAttribute('title')).toBe(kept);
      unmount();
    }
  });

  it('searchText feeds header search by title/description/url', () => {
    const st = def.searchText(data as BookmarksData);
    const card = { id: 'b1', title: 'Links', status: 'ok' as const, searchText: st };
    for (const q of ['sprint', 'pipelines', 'blog.example.com']) expect(matchCards([card], q)).toHaveLength(1);
    expect(matchCards([card], 'nonexistent')).toHaveLength(0);
  });

  it('fullscreen sets data-mode for multi-column wrap', () => {
    const { container } = renderBm(data, { mode: 'fullscreen' });
    expect(container.querySelector('.bm')!.getAttribute('data-mode')).toBe('fullscreen');
  });
});
