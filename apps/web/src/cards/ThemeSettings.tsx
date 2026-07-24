import { useRef, useState } from 'react';
import { useCardTheme } from './ThemeRegistry';
import {
  createAssetCardTheme,
  themeFromFiles,
  validateAssetTheme,
} from './AssetCardTheme';
import { CardThemeSelect } from './CardThemeSelect';
import { PlayingCard } from './PlayingCard';
import type { Card } from '@poker/shared';

const PREVIEW: Card = { rank: 'A', suit: 'spades' };
const PREVIEW2: Card = { rank: 'K', suit: 'hearts' };

export function ThemeSettings({ onClose }: { onClose?: () => void }) {
  const { themes, activeId, setActiveId, registerTheme, error, setError } = useCardTheme();
  const [urlBase, setUrlBase] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const dirRef = useRef<HTMLInputElement>(null);

  const loadFromUrl = async () => {
    setBusy(true);
    setError(null);
    setInfo('');
    try {
      const base = urlBase.trim();
      if (!base) {
        setError('URL base required (folder with AS.svg, 10H.svg, back.svg, …)');
        return;
      }
      const config = {
        id: `url-${Date.now()}`,
        name: `URL: ${base.slice(0, 32)}`,
        baseUrl: base.endsWith('/') ? base : `${base}/`,
        ext: 'svg' as const,
      };
      const validation = await validateAssetTheme(config);
      if (!validation.ok) {
        setError(
          `Set incompleto (${validation.found}/53). Faltan: ${validation.missing.slice(0, 8).join(', ')}${validation.missing.length > 8 ? '…' : ''}`,
        );
        return;
      }
      registerTheme(createAssetCardTheme(config), config);
      setInfo('Tema cargado y activado');
    } finally {
      setBusy(false);
    }
  };

  const loadFromFolder = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    setInfo('');
    try {
      const { theme, validation, config } = await themeFromFiles(files, {
        name: 'Carpeta local',
      });
      if (!validation.ok) {
        setError(
          `Set incompleto (${validation.found}/53). Faltan: ${validation.missing.slice(0, 8).join(', ')}${validation.missing.length > 8 ? '…' : ''}`,
        );
        // still allow partial preview? Spec says error — don't register incomplete
        return;
      }
      registerTheme(theme, config);
      setInfo('Tema de carpeta activado (en esta sesión; blobs no sobreviven al recargar)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel theme-settings">
      <div className="row between">
        <h2>Ajustes de cartas</h2>
        {onClose ? (
          <button type="button" className="ghost small" onClick={onClose}>
            Cerrar
          </button>
        ) : null}
      </div>

      <p className="muted">
        Tema activo:{' '}
        <strong>{themes.find((t) => t.id === activeId)?.name ?? activeId}</strong>
      </p>

      <div className="preview-row">
        <PlayingCard card={PREVIEW} size="md" />
        <PlayingCard card={PREVIEW2} size="md" />
        <PlayingCard faceDown size="md" />
      </div>

      <CardThemeSelect themes={themes} activeId={activeId} onChange={setActiveId} />

      <h3>Cargar tema externo</h3>
      <label className="field">
        URL base de assets
        <input
          value={urlBase}
          onChange={(e) => setUrlBase(e.target.value)}
          placeholder="https://cdn.example.com/cards/"
        />
      </label>
      <button type="button" disabled={busy} onClick={() => void loadFromUrl()}>
        Cargar desde URL
      </button>

      <div className="stack" style={{ marginTop: '0.75rem' }}>
        <input
          ref={dirRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => void loadFromFolder(e.target.files)}
          {...{ webkitdirectory: '', directory: '' }}
        />
        <button type="button" disabled={busy} onClick={() => dirRef.current?.click()}>
          Cargar carpeta (52 + back)
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {info ? <p className="meta">{info}</p> : null}
    </section>
  );
}
