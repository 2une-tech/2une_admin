/** JSON preview for interview transcript (stored as JSON in API). */
export function transcriptPreview(value: unknown, maxLen = 600): string {
  if (value == null) return '—';
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (s.length <= maxLen) return s;
    return `${s.slice(0, maxLen)}…`;
  } catch {
    return String(value);
  }
}

export function formatConversionRate(r: number): string {
  return `${Math.round(r * 1000) / 10}%`;
}
