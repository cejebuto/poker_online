import { useEffect, useId, useRef, useState } from 'react';
import type { Card } from '@poker/shared';
import type { CardTheme } from './CardTheme';

const PREVIEW_FACE: Card = { rank: 'A', suit: 'spades' };

export type CardThemeSelectProps = {
  themes: CardTheme[];
  activeId: string;
  onChange: (id: string) => void;
  /** Optional label above the control. */
  label?: string;
};

/**
 * Custom theme picker: each option shows a face-up and face-down card so you
 * can compare decks before committing. Renders theme artwork directly (not via
 * the active PlayingCard context) so previews stay honest.
 */
export function CardThemeSelect({
  themes,
  activeId,
  onChange,
  label = 'Tema',
}: CardThemeSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const active = themes.find((t) => t.id === activeId) ?? themes[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!active) return null;

  return (
    <div className="card-theme-select" ref={rootRef}>
      {label ? (
        <span className="card-theme-select-label" id={`${listId}-label`}>
          {label}
        </span>
      ) : null}

      <button
        type="button"
        className={`card-theme-select-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${listId}-label` : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeOptionRow theme={active} />
        <span className="card-theme-select-chevron" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <ul
          className="card-theme-select-list"
          role="listbox"
          id={listId}
          aria-labelledby={label ? `${listId}-label` : undefined}
        >
          {themes.map((t) => {
            const selected = t.id === activeId;
            return (
              <li key={t.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`card-theme-select-option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <ThemeOptionRow theme={t} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ThemeOptionRow({ theme }: { theme: CardTheme }) {
  return (
    <span className="card-theme-select-row">
      <span className="card-theme-select-previews" aria-hidden>
        <span className="card-theme-select-card">
          {theme.renderFace(PREVIEW_FACE, 'sm')}
        </span>
        <span className="card-theme-select-card">
          {theme.renderBack('sm')}
        </span>
      </span>
      <span className="card-theme-select-name">{theme.name}</span>
    </span>
  );
}
