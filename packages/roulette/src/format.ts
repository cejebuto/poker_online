/**
 * Chip amounts, K/M compact — the roulette's own copy of the shared convention
 * (0.1K, 1K, 10K, 10M). Kept here so the roulette never depends on poker code.
 */

export function formatChips(amount: number): string {
  const n = Math.trunc(amount);
  if (n === 0) return '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${trimCompact(abs / 1_000_000)}M`;
  return `${sign}${trimCompact(abs / 1000)}K`;
}

/** Drop trailing zeros: 1.20 → "1.2", 1.00 → "1". */
function trimCompact(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Parse an amount where a bare number is **kilos** ("20" → 20_000, "0.1" → 100).
 * Explicit `K`/`M` suffixes also work. Null when empty or not a number.
 */
export function parseChipInput(raw: string): number | null {
  const text = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!text) return null;
  const m = text.match(/^(-?\d+(?:\.\d+)?)([kKmM])?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const suffix = (m[2] ?? 'k').toLowerCase();
  if (suffix === 'm') return Math.round(value * 1_000_000);
  return Math.round(value * 1000);
}
