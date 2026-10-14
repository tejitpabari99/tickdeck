// Pure table logic. UI may only `import type` from src/**, so `cellText` is mirrored here
// (parity with 01's runtime `cellText` is asserted in ui/tests/types/table-logic.test.ts).
import type { Cell, TableData } from '../../../../src/index.js';
import { MAX_FILTER_VALUES } from '../../constants/types.ts';
import { matchTokens } from '../shared/matchTokens.ts';

export type ColumnType = 'text' | 'number' | 'date';
export type SortDir = 'asc' | 'desc';
export interface SortState {
  column: number;
  dir: SortDir;
}
export interface NormalizedColumn {
  key?: string;
  label: string;
  sort?: ColumnType;
  width?: 'xs' | 's' | 'm' | 'l' | 'fill';
}
export interface RowLike {
  cells: readonly Cell[];
}
export interface FilterSpec {
  /** Global search query (shell). */
  query?: string;
  /** The table's own search box. */
  ownQuery?: string;
  /** Column index -> allowed values (as `distinctValues` strings). Empty/missing set = no filter. */
  filters?: Readonly<Record<number, ReadonlySet<string>>>;
}

/** Displayed/searched/sorted value of a cell (mirror of 01 `cellText`). */
export function cellText(cell: Cell): string | number | boolean | null {
  return cell !== null && typeof cell === 'object' ? cell.text : cell;
}

function textOf(cell: Cell | undefined): string {
  if (cell === undefined) return '';
  const v = cellText(cell);
  return v === null || v === undefined ? '' : String(v);
}

export function normalizeColumns(columns: TableData['columns']): NormalizedColumn[] {
  return columns.map((c) => {
    if (typeof c === 'string') return { label: c };
    const out: NormalizedColumn = { label: c.label };
    if (c.key !== undefined) out.key = c.key;
    if (c.sort !== undefined) out.sort = c.sort;
    if (c.width !== undefined) out.width = c.width;
    return out;
  });
}

const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*)?$/;

function isEmpty(cell: Cell | undefined): boolean {
  const v = cell === undefined ? null : cellText(cell);
  return v === null || v === undefined || v === '';
}

function parseNumber(cell: Cell | undefined): number | null {
  if (cell === undefined) return null;
  const v = cellText(cell);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/[,%$€\s]/g, '');
  return NUM_RE.test(s) ? Number(s) : null;
}

function parseDate(cell: Cell | undefined): number | null {
  if (cell === undefined) return null;
  const v = cellText(cell);
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!DATE_RE.test(s)) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

export interface DateCellFormat {
  /** Short display, e.g. `Oct 9, 5:06p` / `Oct 9` / `Oct 9, 2025`. */
  display: string;
  /** Full localized timestamp for the `title` tooltip. */
  title: string;
}

export interface DateFormatOpts {
  /** IANA tz; default = browser tz. */
  timeZone?: string;
  /** Reference "now" for the current-year check; default = real now. */
  now?: Date;
}

/**
 * Short display + full-timestamp title for a parseable ISO date cell; null when unparseable
 * (caller renders the raw text). Date-only values are calendar dates (no tz shift). Pure.
 */
export function formatDateCell(raw: string, opts: DateFormatOpts = {}): DateCellFormat | null {
  const s = raw.trim();
  if (!DATE_RE.test(s)) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const timed = s.length > 10;
  const tz = timed ? opts.timeZone : 'UTC';
  const zone = tz === undefined ? {} : { timeZone: tz };
  const d = new Date(t);
  const now = opts.now ?? new Date();
  const year = (x: Date) => new Intl.DateTimeFormat('en-US', { ...zone, year: 'numeric' }).format(x);
  const nowYear = new Intl.DateTimeFormat('en-US', {
    ...(opts.timeZone === undefined ? {} : { timeZone: opts.timeZone }),
    year: 'numeric',
  }).format(now);
  const day = new Intl.DateTimeFormat('en-US', { ...zone, month: 'short', day: 'numeric' }).format(d);
  let display = day;
  if (year(d) !== nowYear) display += `, ${year(d)}`;
  if (timed) {
    const parts = new Intl.DateTimeFormat('en-US', { ...zone, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d);
    const g = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
    display += `, ${g('hour')}:${g('minute')}${g('dayPeriod').toLowerCase().startsWith('p') ? 'p' : 'a'}`;
  }
  const title = timed
    ? new Intl.DateTimeFormat('en-US', { ...zone, dateStyle: 'long', timeStyle: 'long' }).format(d)
    : new Intl.DateTimeFormat('en-US', { ...zone, dateStyle: 'long' }).format(d);
  return { display, title };
}

/** Explicit `sort` wins; else >=80% of non-empty cells numeric -> number, >=80% ISO-date-like -> date, else text. */
export function inferColumnType(cells: readonly Cell[], explicit: ColumnType | undefined): ColumnType {
  if (explicit) return explicit;
  const present = cells.filter((c) => !isEmpty(c));
  if (present.length === 0) return 'text';
  const share = (f: (c: Cell) => unknown) => present.filter((c) => f(c) !== null).length / present.length;
  if (share(parseNumber) >= 0.8) return 'number';
  if (share(parseDate) >= 0.8) return 'date';
  return 'text';
}

/** Stable sort by one column. Empty/unparseable values last in both directions. Returns a new array. */
export function sortRows<R extends RowLike>(rows: readonly R[], column: number, dir: SortDir, type: ColumnType): R[] {
  const sign = dir === 'asc' ? 1 : -1;
  const keyed = rows.map((row, i) => {
    const cell = row.cells[column];
    let key: number | string | null;
    if (isEmpty(cell)) key = null;
    else if (type === 'number') key = parseNumber(cell);
    else if (type === 'date') key = parseDate(cell);
    else key = textOf(cell);
    return { row, i, key };
  });
  keyed.sort((a, b) => {
    if (a.key === null || b.key === null) {
      if (a.key === b.key) return a.i - b.i;
      return a.key === null ? 1 : -1;
    }
    const c =
      typeof a.key === 'number' && typeof b.key === 'number' ? a.key - b.key : String(a.key).localeCompare(String(b.key));
    return c !== 0 ? sign * c : a.i - b.i;
  });
  return keyed.map((k) => k.row);
}

/** Header-click cycle: asc -> desc -> default (`defaultSort` or null = source order). */
export function nextSort(current: SortState | null, column: number, defaultSort?: SortState | null): SortState | null {
  if (!current || current.column !== column) return { column, dir: 'asc' };
  if (current.dir === 'asc') return { column, dir: 'desc' };
  return defaultSort ?? null;
}

/** Own search AND global query (token AND over the row's cell text) AND per-column value filters. */
export function filterRows<R extends RowLike>(rows: readonly R[], spec: FilterSpec): R[] {
  const { query = '', ownQuery = '', filters = {} } = spec;
  const active = Object.entries(filters).filter(([, set]) => set.size > 0);
  const hasQuery = query.trim() !== '' || ownQuery.trim() !== '';
  if (!hasQuery && active.length === 0) return [...rows];
  return rows.filter((row) => {
    if (hasQuery) {
      const text = row.cells.map(textOf).join(' ');
      if (!matchTokens(text, query) || !matchTokens(text, ownQuery)) return false;
    }
    return active.every(([col, set]) => set.has(textOf(row.cells[Number(col)])));
  });
}

/** Sorted distinct cell texts for a column's filter, or null unless there are 2-20 distinct values. */
export function distinctValues(rows: readonly RowLike[], column: number): string[] | null {
  const set = new Set(rows.map((row) => textOf(row.cells[column])));
  if (set.size < 2 || set.size > MAX_FILTER_VALUES) return null;
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Column labels + all cells. Total: never throws. */
export function tableSearchText(data: TableData): string {
  const cols = Array.isArray(data?.columns) ? normalizeColumns(data.columns).map((c) => c.label) : [];
  const cells = Array.isArray(data?.rows)
    ? data.rows.flatMap((row) => (Array.isArray(row?.cells) ? row.cells.map(textOf) : []))
    : [];
  return [...cols, ...cells].filter((s) => s !== '').join(' ');
}

/**
 * Width key per column: explicit `width`, else (when no column declares `fill`) the unsized text
 * column with the longest average cell length becomes implicit `fill`.
 */
export function columnWidths(
  columns: readonly NormalizedColumn[],
  rows: readonly RowLike[],
  types: readonly ColumnType[],
): (NormalizedColumn['width'] | undefined)[] {
  const out = columns.map((c) => c.width);
  if (out.includes('fill') || rows.length === 0) return out;
  let best = -1;
  let bestAvg = 0;
  columns.forEach((c, i) => {
    if (c.width !== undefined || types[i] !== 'text') return;
    const total = rows.reduce((n, r) => {
      const cell = r.cells[i];
      return n + (cell === undefined ? 0 : String(cellText(cell) ?? '').length);
    }, 0);
    const avg = total / rows.length;
    if (avg > bestAvg) {
      best = i;
      bestAvg = avg;
    }
  });
  if (best >= 0) out[best] = 'fill';
  return out;
}
