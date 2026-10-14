import { useState } from 'react';
import { CardLink } from '../../frame/CardLink.tsx';
import type { CardTypeProps } from '../../registry/registry.ts';
import type { MediaData, MediaItem } from '../../../../src/index.js';
import { safeImageSrc } from '../shared/safeImageSrc.ts';
import { ShowMore } from '../shared/ShowMore.tsx';
import { mediaAlt, mediaItems } from './logic.ts';

const COMPACT_CAP = 6;

function Picture({ item }: { item: MediaItem }) {
  const [failed, setFailed] = useState(false);
  const src = safeImageSrc(item.src);
  const alt = mediaAlt(item);
  const img =
    src && !failed ? (
      <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    ) : (
      <span className="media-placeholder">{alt}</span>
    );
  return item.link ? (
    <CardLink href={item.link} title={alt}>
      <span className="media-box">{img}</span>
    </CardLink>
  ) : (
    <span className="media-box">{img}</span>
  );
}

export function MediaBody({ card, data, mode }: CardTypeProps<MediaData>) {
  const items = mediaItems(data);
  if (items.length === 0) return <p className="media-empty">–</p>;
  const full = mode === 'fullscreen';
  const shown = full ? items : items.slice(0, COMPACT_CAP);
  const rest = items.length - shown.length;
  const rawLayout = (data as { layout?: string }).layout;
  const layout = rawLayout === 'single' || rawLayout === 'row' ? rawLayout : 'grid';
  return (
    <div className={`media-root media-root--${layout}${full ? ' media-root--full' : ''}`}>
      <div
        className={layout === 'row' ? 'media-row' : 'media-grid'}
        {...(layout === 'row' ? { tabIndex: 0, role: 'region', 'aria-label': `${card.title} images` } : {})}
      >
        {shown.map((item, i) => (
          <figure key={`${i}:${item.src}`} className="media-figure">
            <Picture item={item} />
            {item.caption && (
              <figcaption className="media-caption clamp-2" title={item.caption}>
                {item.caption}
              </figcaption>
            )}
            {item.meta && <span className="media-meta">{item.meta}</span>}
          </figure>
        ))}
      </div>
      {rest > 0 && <ShowMore cardId={card.id} count={rest} />}
    </div>
  );
}
