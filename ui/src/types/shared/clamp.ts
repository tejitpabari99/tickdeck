
/** Class + native `title` tooltip for clamped text (`.clamp-1` / `.clamp-2` in styles/utils.css). */
export function clampProps(text: string, lines: 1 | 2): { className: string; title: string } {
  return { className: `clamp-${lines}`, title: text };
}
