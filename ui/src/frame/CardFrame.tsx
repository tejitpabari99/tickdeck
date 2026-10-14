import { useEffect, useRef, useState } from 'react';
import type { ViewCard } from '../api/types.ts';
import { formatRelative, useNow } from '../lib/relative-time.ts';
import { isUnseen, markSeen } from '../lib/seen.ts';
import { getCardType, type Mode } from '../registry/registry.ts';
import { UnknownBody } from '../registry/unknown.tsx';
import { BrokenBody } from './BrokenBody.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

export interface CardFrameProps {
  card: ViewCard;
  mode: Mode;
  query: string;
  /** Global search active: this card does not match (dim to 30%, no reflow). */
  dim?: boolean;
  /** Global search active: this card matches (accent outline). */
  match?: boolean;
  checked: ReadonlySet<string>;
  pending: ReadonlySet<string>;
  /** `snapshot.config.nowPriorityThreshold`. */
  nowPriorityThreshold: number;
  onItemAction(itemId: string, checked?: boolean): Promise<void>;
  onDone(id: string): void;
  onHide(id: string): void;
  onFullscreen(id: string): void;
}

/** Per-session, in-memory expand state for collapsed cards (never persisted; reload resets). */
const expanded = new Set<string>();
const expandedListeners = new Set<() => void>();
let expandedVersion = 0;
export function getExpandedVersion(): number {
  return expandedVersion;
}
function emitExpanded(): void {
  expandedVersion++;
  for (const l of [...expandedListeners]) l();
}
/** Expand/collapse a collapsed-by-default card (UI-local, per session). */
export function setExpanded(id: string, on: boolean): void {
  if (on) expanded.add(id);
  else expanded.delete(id);
  emitExpanded();
}
export function resetExpanded(): void {
  expanded.clear();
  emitExpanded();
}
export function isExpanded(id: string): boolean {
  return expanded.has(id);
}
/** Notified whenever any card is expanded/collapsed (parents re-derive chip vs frame). */
export function subscribeExpanded(l: () => void): () => void {
  expandedListeners.add(l);
  return () => {
    expandedListeners.delete(l);
  };
}

const FADE_MS = 600;
const SEEN_DWELL_MS = 1000;

function reducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function CardFrame(p: CardFrameProps) {
  const { card, mode } = p;
  const rootRef = useRef<HTMLElement>(null);
  const now = useNow();
  const [, bump] = useState(0);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [reduced] = useState(reducedMotion);
  const prevUpdated = useRef(card.updatedAt);

  const updatedAt = card.updatedAt;
  const noData = card.status === 'no-data';
  const highlighted = card.notify && updatedAt !== undefined && seenAt !== updatedAt && isUnseen({ id: card.id, updatedAt });

  const see = () => {
    if (!highlighted || updatedAt === undefined) return;
    markSeen({ id: card.id, updatedAt });
    setSeenAt(updatedAt);
  };

  // 600 ms accent fade when updatedAt changes after first render.
  useEffect(() => {
    if (prevUpdated.current === card.updatedAt) return;
    prevUpdated.current = card.updatedAt;
    if (reduced || card.updatedAt === undefined) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), FADE_MS);
    return () => clearTimeout(t);
  }, [card.updatedAt, reduced]);

  // Clear highlight after 1 s of >=50% visibility.
  useEffect(() => {
    const el = rootRef.current;
    if (!highlighted || !el || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (e && e.intersectionRatio >= 0.5) {
          timer ??= setTimeout(() => {
            if (card.updatedAt === undefined) return;
            markSeen({ id: card.id, updatedAt: card.updatedAt });
            setSeenAt(card.updatedAt);
          }, SEEN_DWELL_MS);
        } else if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [0.5] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [highlighted, card.id, card.updatedAt]);

  const broken = card.status === 'broken';
  const isPriority = card.priority >= p.nowPriorityThreshold;

  const toggle = () => {
    setExpanded(card.id, !expanded.has(card.id));
    bump((n) => n + 1);
  };

  // Look comes from the column; Now/fullscreen always render the full (center) look so Done/hide stay reachable.
  const look = mode === 'column' && card.column !== 'center' ? 'side' : 'center';
  const prio = isPriority ? 'high' : card.priority <= 1 ? 'low' : 'normal';

  const cls = [
    'card',
    `card--${look}`,
    `prio-${prio}`,
    broken && 'card--broken',
    `card-frame--h-${card.height}`,
    noData && 'card--empty',
    highlighted && 'card-frame--notify',
    !reduced && 'card-frame--enter',
    flash && 'card-frame--updated',
    p.dim && 'card-frame--dim',
    p.match && 'card-frame--match',
  ]
    .filter(Boolean)
    .join(' ');

  const marker = isPriority ? (
    <span className="card-prio-marker" data-testid="priority-marker" title={`Priority ${card.priority}`} aria-label="High priority" />
  ) : null;
  const dot = highlighted ? <span className="unseen-dot" data-testid="notify-dot" aria-label="New" /> : null;

  const def = broken || noData ? undefined : getCardType(card.type);
  const Body = def?.Component;

  return (
    <section
      ref={rootRef}
      className={cls}
      data-permanent={String(card.column !== 'center')}
      data-card-id={card.id} aria-label={card.title}
      onClick={see}
      onFocus={see}
    >
      <header className="card-header">
        {dot}
        {marker}
        <h3 className="card-title" title={card.title}>
          {card.title}
        </h3>
        {!noData && updatedAt !== undefined ? (
          <span className="card-meta" title={new Date(updatedAt).toLocaleString()}>
            {formatRelative(updatedAt, now)}
          </span>
        ) : null}
        <span className="card-actions">
          {card.collapsed && mode === 'column' ? (
            <button type="button" className="card-btn card-btn--collapse" aria-label="Collapse" aria-expanded="true" onClick={toggle}>
              ▴
            </button>
          ) : null}
          {noData ? null : (
            <button type="button" className="card-btn card-btn--fullscreen" aria-label="Fullscreen" onClick={() => p.onFullscreen(card.id)}>
              ⤢
            </button>
          )}
          {noData ? null : (
            <button type="button" className="card-btn" aria-label="Done" onClick={() => p.onDone(card.id)}>
              ✓
            </button>
          )}
          <button type="button" className="card-btn" aria-label="Hide" onClick={() => p.onHide(card.id)}>
            ✕
          </button>
        </span>
      </header>
      {broken ? (
        <div className="card-body">
          <BrokenBody card={card} />
        </div>
      ) : noData ? (
        <div className="card-body">
          <p className="meta">No data yet</p>
        </div>
      ) : (
        <div className="card-body">
          <ErrorBoundary>
            {Body ? (
              <Body
                card={card}
                data={card.data}
                mode={mode}
                query={p.query}
                checked={p.checked}
                pending={p.pending}
                onItemAction={p.onItemAction}
              />
            ) : (
              <UnknownBody type={card.type} />
            )}
          </ErrorBoundary>
        </div>
      )}
    </section>
  );
}
