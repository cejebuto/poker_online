import { motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import { ThemePicker } from './ThemePicker';

export type ThemeModalProps = {
  open: boolean;
  feltThemeId: string;
  onFeltTheme: (id: string) => void;
  onOpenThemes?: () => void;
  onClose: () => void;
};

/** Deck and felt picker for the shared screen — same chrome as the player's menu. */
export function ThemeModal({
  open,
  feltThemeId,
  onFeltTheme,
  onOpenThemes,
  onClose,
}: ThemeModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="confirm-modal-root zone-felt-menu" role="presentation">
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <motion.div
        className="confirm-modal-panel felt-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="felt-menu-head">
          <h2 id={titleId} className="confirm-modal-title">
            Temas
          </h2>
          <button ref={closeRef} type="button" className="ghost small" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="felt-menu-body">
          <ThemePicker
            feltThemeId={feltThemeId}
            onFeltTheme={onFeltTheme}
            {...(onOpenThemes ? { onOpenThemes } : {})}
          />
        </div>
      </motion.div>
    </div>
  );
}
