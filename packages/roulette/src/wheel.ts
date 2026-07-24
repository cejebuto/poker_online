/**
 * American roulette wheel: 38 pockets (0, 00, 1–36) in physical clockwise order,
 * with the colour and grouping metadata bets resolve against.
 *
 * Self-contained — this package never imports the poker engine or anything else.
 */

export type PocketColor = 'red' | 'black' | 'green';

export interface Pocket {
  /** Stable identity: '0', '00', or '1'..'36'. */
  key: string;
  /** What the pocket shows. */
  label: string;
  /** Numeric value 1..36, or null for the two green zeroes. */
  n: number | null;
  color: PocketColor;
}

/** The eighteen red numbers on a standard wheel; the rest of 1..36 are black. */
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function colorForKey(key: string): PocketColor {
  if (key === '0' || key === '00') return 'green';
  return RED_NUMBERS.has(Number(key)) ? 'red' : 'black';
}

function makePocket(key: string): Pocket {
  const n = key === '0' || key === '00' ? null : Number(key);
  return { key, label: key, n, color: colorForKey(key) };
}

/** Clockwise physical order of the American wheel (38 pockets). */
export const AMERICAN_ORDER: readonly string[] = [
  '0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
  '5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
  '27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
  '21', '33', '16', '4', '23', '35', '14', '2',
];

export const POCKETS: readonly Pocket[] = AMERICAN_ORDER.map(makePocket);
export const POCKET_COUNT = POCKETS.length;

/** All pocket keys in numeric board order (0, 00, 1..36) — for building the felt. */
export const BOARD_KEYS: readonly string[] = [
  '0',
  '00',
  ...Array.from({ length: 36 }, (_, i) => String(i + 1)),
];

export function pocketByIndex(index: number): Pocket {
  const wrapped = ((index % POCKET_COUNT) + POCKET_COUNT) % POCKET_COUNT;
  return POCKETS[wrapped]!;
}

export function indexOfKey(key: string): number {
  return AMERICAN_ORDER.indexOf(key);
}

/** Angle (degrees) of a pocket's centre, measured clockwise from the top. */
export function pocketAngle(index: number): number {
  return (index * 360) / POCKET_COUNT;
}

export function dozenOf(n: number): 1 | 2 | 3 | null {
  if (n < 1 || n > 36) return null;
  return n <= 12 ? 1 : n <= 24 ? 2 : 3;
}

export function columnOf(n: number): 1 | 2 | 3 | null {
  if (n < 1 || n > 36) return null;
  const r = n % 3;
  return r === 1 ? 1 : r === 2 ? 2 : 3;
}

export function isLow(n: number): boolean {
  return n >= 1 && n <= 18;
}

export function isHigh(n: number): boolean {
  return n >= 19 && n <= 36;
}
