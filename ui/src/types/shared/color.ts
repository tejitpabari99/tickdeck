const TOKENS = new Set(['primary', 'positive', 'negative']);

/** Contract colour (token | "H S L") -> CSS value. The grammar is closed, so this is injection-safe. */
export function colorValue(c: string | undefined): string | undefined {
  if (c === undefined) return undefined;
  if (TOKENS.has(c)) return `var(--color-${c})`;
  const m = /^(\d{1,3}) (\d{1,3}) (\d{1,3})$/.exec(c);
  if (!m) return undefined;
  return `hsl(${Math.min(Number(m[1]), 360)} ${Math.min(Number(m[2]), 100)}% ${Math.min(Number(m[3]), 100)}%)`;
}
