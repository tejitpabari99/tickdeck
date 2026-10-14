import type { ViewCard } from '../api/types.ts';
import { FILTERS, type Filter } from '../lib/filter.ts';
import { HiddenPopover } from './HiddenPopover.tsx';
import { SearchBox, type SearchBoxProps } from './SearchBox.tsx';

export interface HeaderProps {
  alertCount: number;
  hidden: readonly ViewCard[];
  connectionOk: boolean;
  /** Server down: only the connection dot. */
  minimal?: boolean;
  filter: Filter;
  onFilter(f: Filter): void;
  search: SearchBoxProps;
  onUnhide(id: string): void;
}

export function Header(p: HeaderProps) {
  const date = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const scrollToNow = (): void => {
    document
      .querySelector('[aria-label="Alerts"], [data-testid="now-zone"]')
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  return (
    <header className="header">
      <h1 className="header__brand">Tickdeck</h1>
      <span className="header__date">{date}</span>
      {p.minimal ? null : (
        <>
          <SearchBox {...p.search} />
          <div role="radiogroup" aria-label="Show" className="filter">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={p.filter === f}
                tabIndex={p.filter === f ? 0 : -1}
                className={`filter__btn${p.filter === f ? ' filter__btn--on' : ''}`}
                onClick={() => p.onFilter(f)}
                onKeyDown={(e) => {
                  const d =
                    e.key === 'ArrowRight' || e.key === 'ArrowDown'
                      ? 1
                      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                        ? -1
                        : 0;
                  if (!d) return;
                  e.preventDefault();
                  const next = FILTERS[(FILTERS.indexOf(f) + d + FILTERS.length) % FILTERS.length]!;
                  p.onFilter(next);
                  (
                    e.currentTarget.parentElement?.querySelector(`[data-filter="${next}"]`) as HTMLElement | null
                  )?.focus();
                }}
                data-filter={f}
              >
                {f === 'all' ? 'All' : f === 'alerts' ? 'Alerts' : 'Cards'}
              </button>
            ))}
          </div>
          <HiddenPopover cards={p.hidden} onUnhide={p.onUnhide} />
        </>
      )}
      <div className="header__status">
        {!p.minimal && p.alertCount > 0 ? (
          <button
            type="button"
            className="header__badge"
            aria-label={`${p.alertCount} ${p.alertCount === 1 ? 'alert' : 'alerts'}`}
            onClick={scrollToNow}
          >
            <span className="header__dot header__dot--bad" aria-hidden="true" />
            <span aria-hidden="true">{`${p.alertCount} ${p.alertCount === 1 ? 'alert' : 'alerts'}`}</span>
          </button>
        ) : null}
        <span className="header__status-item">
          <span
            role="img"
            aria-label={p.connectionOk ? 'Connected' : 'Connection problem'}
            className={`header__dot header__dot--${p.connectionOk ? 'ok' : 'bad'}`}
          />
          <span aria-hidden="true">{p.connectionOk ? 'connected' : 'offline'}</span>
        </span>
      </div>
    </header>
  );
}
