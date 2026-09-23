/**
 * Serializes content JSON the way the repo stores it: 2-space indent, but short arrays of primitives
 * (options, tags, sources) on one line so diffs stay readable.
 */
export function formatContentJson(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  const inner = ' '.repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => v === null || typeof v !== 'object')) {
      const inline = `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
      if (inline.length + indent <= 140) return inline;
    }
    return `[\n${value.map((v) => inner + formatContentJson(v, indent + 2)).join(',\n')}\n${pad}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${formatContentJson(v, indent + 2)}`).join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}
