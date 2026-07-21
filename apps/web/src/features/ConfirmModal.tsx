import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Visual weight of the confirm button */
  tone?: 'danger' | 'warn' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app confirmation dialog (never window.confirm).
 * Tap zones: overlay cancel, cancel button, confirm button — no drag gestures.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-modal-root zone-confirm-modal"
      role="presentation"
    >
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <motion.div
        className="confirm-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <h2 id={titleId} className="confirm-modal-title">
          {title}
        </h2>
        <p id={descId} className="confirm-modal-message">
          {message}
        </p>
        <div className="confirm-modal-actions">
          <button type="button" className="confirm-modal-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`confirm-modal-ok tone-${tone}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
