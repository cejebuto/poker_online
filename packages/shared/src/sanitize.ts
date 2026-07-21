/** Max length for display names shown in the UI. */
export const DISPLAY_NAME_MAX = 24;

/**
 * Sanitize free-text user input for display (XSS / injection hygiene).
 * Strips control chars and HTML-ish brackets; trims; enforces max length.
 */
export function sanitizeDisplayName(raw: string): string {
  let cleaned = '';
  for (const ch of raw.normalize('NFKC')) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) continue;
    if ('<>&"\'`\\/'.includes(ch)) continue;
    cleaned += ch;
  }
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Player';
  return cleaned.slice(0, DISPLAY_NAME_MAX);
}
