import type { Card, CardSize } from '@poker/shared';
import { cardCode } from '@poker/shared';
import type { CardTheme } from './CardTheme';
import { CARD_PX } from './CardTheme';
import { expectedAssetKeys, normalizeAssetCode } from './assetConvention';

export type AssetThemeConfig = {
  id: string;
  name: string;
  /** Base URL ending with / — assets resolved as `${base}${code}.svg|png` */
  baseUrl: string;
  /** File extension without dot */
  ext?: 'svg' | 'png' | 'webp';
  /** Map of cardCode → absolute URL (optional override of baseUrl convention). */
  urls?: Record<string, string>;
};

export type AssetValidation = {
  ok: boolean;
  missing: string[];
  found: number;
};

export { expectedAssetKeys } from './assetConvention';

function resolveUrl(cfg: AssetThemeConfig, key: string): string {
  if (cfg.urls?.[key]) return cfg.urls[key]!;
  const ext = cfg.ext ?? 'svg';
  const base = cfg.baseUrl.endsWith('/') ? cfg.baseUrl : `${cfg.baseUrl}/`;
  return `${base}${key}.${ext}`;
}

/**
 * Validate that all 52 faces + back are reachable (HEAD/GET).
 * For file: URLs or blob maps, checks presence in urls map instead.
 */
export async function validateAssetTheme(cfg: AssetThemeConfig): Promise<AssetValidation> {
  const keys = expectedAssetKeys();
  const missing: string[] = [];

  if (cfg.urls) {
    for (const key of keys) {
      if (!cfg.urls[key]) missing.push(key);
    }
    return { ok: missing.length === 0, missing, found: keys.length - missing.length };
  }

  await Promise.all(
    keys.map(async (key) => {
      const url = resolveUrl(cfg, key);
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (!res.ok) {
          // Some static servers reject HEAD — try GET range
          const get = await fetch(url, { method: 'GET' });
          if (!get.ok) missing.push(key);
        }
      } catch {
        missing.push(key);
      }
    }),
  );

  return { ok: missing.length === 0, missing, found: keys.length - missing.length };
}

function AssetImg({
  src,
  size,
  label,
}: {
  src: string;
  size: CardSize;
  label: string;
}) {
  const { w, h } = CARD_PX[size];
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt={label}
      className="card-asset"
      draggable={false}
      style={{ width: w, height: h, objectFit: 'contain', borderRadius: 6 }}
    />
  );
}

export function createAssetCardTheme(cfg: AssetThemeConfig): CardTheme {
  return {
    id: cfg.id,
    name: cfg.name,
    renderFace(card: Card, size: CardSize) {
      const key = cardCode(card);
      return (
        <AssetImg
          src={resolveUrl(cfg, key)}
          size={size}
          label={`${card.rank} of ${card.suit}`}
        />
      );
    },
    renderBack(size: CardSize) {
      return <AssetImg src={resolveUrl(cfg, 'back')} size={size} label="Card back" />;
    },
  };
}

/**
 * Build theme from a FileList / directory pick (webkitdirectory).
 * Files named AS.svg, 10H.png, back.svg, etc.
 */
export async function themeFromFiles(
  files: FileList | File[],
  meta?: { id?: string; name?: string },
): Promise<{ theme: CardTheme; validation: AssetValidation; config: AssetThemeConfig }> {
  const urls: Record<string, string> = {};
  const list = Array.from(files);

  for (const file of list) {
    const base = file.name.replace(/\.[^.]+$/, '');
    // Accept AS, As, as → normalize to cardCode style (rank upper, suit upper)
    const key = base === 'back' || base === 'BACK' ? 'back' : normalizeAssetCode(base);
    if (key) {
      urls[key] = URL.createObjectURL(file);
    }
  }

  const config: AssetThemeConfig = {
    id: meta?.id ?? `asset-${Date.now()}`,
    name: meta?.name ?? 'Custom assets',
    baseUrl: '',
    urls,
  };
  const validation = await validateAssetTheme(config);
  return { theme: createAssetCardTheme(config), validation, config };
}
