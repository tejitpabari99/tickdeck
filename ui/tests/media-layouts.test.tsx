import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getCardType } from '../src/registry/registry.ts';
import '../src/types/media/index.ts';
import type { CardTypeProps } from '../src/registry/registry.ts';
import type { MediaData } from '../../src/index.js';

const C = getCardType('media')!.Component as React.ComponentType<CardTypeProps<MediaData>>;
const items = [
  { src: 'https://e.com/0.png', alt: 'a0', caption: 'A long caption title', meta: 'today' },
  { src: 'https://e.com/1.png', alt: 'a1' },
];
function renderMedia(data: unknown) {
  return render(
    <C card={{ id: 'c1', title: 'Cams' } as never} data={data as MediaData} mode="column" query="" checked={new Set()} pending={new Set()} onItemAction={async () => {}} />,
  );
}
afterEach(cleanup);

describe('media layouts', () => {
  it('grid and single have no scroll region', () => {
    for (const layout of [undefined, 'grid', 'single']) {
      const { container, unmount } = renderMedia({ items, layout });
      expect(container.querySelector(`.media-root--${layout ?? 'grid'}`)).not.toBeNull();
      expect(container.querySelector('[role="region"]')).toBeNull();
      unmount();
    }
  });

  it('row: focusable labelled scroll region', () => {
    const { container } = renderMedia({ items, layout: 'row' });
    expect(container.querySelector('.media-root--row')).not.toBeNull();
    const region = container.querySelector('.media-row')!;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-label')).toBe('Cams images');
    expect(container.querySelectorAll('.media-row figure').length).toBe(2);
  });

  it('caption is clamped title with full-text title attr; meta muted; no video/iframe', () => {
    const { container } = renderMedia({ items, layout: 'row' });
    const cap = container.querySelector('figcaption.media-caption')!;
    expect(cap.classList.contains('clamp-2')).toBe(true);
    expect(cap.getAttribute('title')).toBe('A long caption title');
    expect(container.querySelector('.media-meta')!.textContent).toBe('today');
    expect(container.querySelector('video,iframe')).toBeNull();
  });
});
