import { useId } from 'react';

/**
 * The all-in marker: a single elegant, metallic-grey triangle. One source of
 * truth so the action button, its confirm modal and the seat on the felt all
 * show the exact same shape, only scaled.
 *
 * Purely decorative — the surrounding control carries the accessible label.
 */
export function AllInMark({
  size = 20,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const fill = `allin-fill-${gid}`;
  const edge = `allin-edge-${gid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`allin-mark ${className}`.trim()}
      role="img"
      aria-label="All-in"
      focusable="false"
    >
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f6" />
          <stop offset="45%" stopColor="#b8c1cc" />
          <stop offset="100%" stopColor="#7c8794" />
        </linearGradient>
        <linearGradient id={edge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4a5560" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Rounded upward triangle. */}
      <path
        d="M12 3.2 L21 19.4 a1.6 1.6 0 0 1 -1.4 2.4 L4.4 21.8 a1.6 1.6 0 0 1 -1.4 -2.4 Z"
        fill={`url(#${fill})`}
        stroke={`url(#${edge})`}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Soft top highlight for the metallic read. */}
      <path
        d="M12 6 L16.5 14 L7.5 14 Z"
        fill="#ffffff"
        opacity="0.18"
      />
    </svg>
  );
}
