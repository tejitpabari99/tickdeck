import { z } from 'zod';
import { asRecord, asRecords } from '../../utils/guards.js';
import { plural } from '../../utils/text.js';
import { linkSchema } from '../formats.js';

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const cellSchema = z.union([
  scalarSchema,
  z.looseObject({ text: scalarSchema, link: linkSchema.optional() }),
]);

export const columnSchema = z.union([
  z.string(),
  z.looseObject({
    key: z.string().optional(),
    label: z.string(),
    sort: z.enum(['text', 'number', 'date']).optional(),
    width: z.enum(['xs', 's', 'm', 'l', 'fill']).optional(),
  }),
]);

export const tableRowSchema = z.looseObject({
  cells: z.array(cellSchema),
  link: linkSchema.optional(),
});

export const tableDataSchema = z
  .looseObject({
    columns: z.array(columnSchema).min(1).max(50),
    rows: z.array(tableRowSchema),
    defaultSort: z
      .looseObject({ column: z.number().int().min(0), dir: z.enum(['asc', 'desc']) })
      .optional(),
    searchable: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    data.rows.forEach((row, i) => {
      if (row.cells.length !== data.columns.length) {
        ctx.addIssue({
          code: 'custom',
          message: `row has ${row.cells.length} cells but table has ${data.columns.length} columns`,
          path: ['rows', i, 'cells'],
        });
      }
    });
    if (data.defaultSort && data.defaultSort.column >= data.columns.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'defaultSort.column is out of range',
        path: ['defaultSort', 'column'],
      });
    }
  });

export type Cell = z.infer<typeof cellSchema>;
export type TableData = z.infer<typeof tableDataSchema>;

/** The displayed/searched/sorted value of a cell. */
export function cellText(cell: Cell): string | number | boolean | null {
  return cell !== null && typeof cell === 'object' ? cell.text : cell;
}
export type Column = z.infer<typeof columnSchema>;

/** Notification summary: "N rows". */
export function tableSummary(data: unknown): string {
  return plural(asRecords(asRecord(data)['rows']).length, 'row');
}

/** Same shape the UI accepts as a date (keep in sync with ui/src/types/table/logic.ts). */
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}.*)?$/;
const DATE_WARNING = 'date column needs ISO 8601; cell shown raw and sorted last';

function isIsoDateText(v: string): boolean {
  const s = v.trim();
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
}

/** Warnings (not errors) for validated table data; paths are relative to `data`. */
export function tableWarnings(data: unknown): string[] {
  const d = asRecord(data);
  const cols = Array.isArray(d['columns']) ? d['columns'] : [];
  const dateCols = cols.flatMap((c, j) => (asRecord(c)['sort'] === 'date' ? [j] : []));
  if (dateCols.length === 0) return [];
  const out: string[] = [];
  asRecords(d['rows']).forEach((row, i) => {
    const cells = Array.isArray(row['cells']) ? row['cells'] : [];
    for (const j of dateCols) {
      const cell = cells[j] as Cell | undefined;
      if (cell === undefined) continue;
      const v = cellText(cell);
      if (v === null || v === '') continue;
      if (typeof v !== 'string' || !isIsoDateText(v)) {
        out.push(`/data/rows/${i}/cells/${j}: ${DATE_WARNING}`);
      }
    }
  });
  return out;
}
