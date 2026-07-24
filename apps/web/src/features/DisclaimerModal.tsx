import { useEffect, useId, useRef } from 'react';
import { motion } from 'motion/react';

/**
 * Hobby / no-money disclaimer shown from the identity gate.
 * Informational only — one dismiss action, no confirm/cancel split.
 */
export function DisclaimerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    <div className="confirm-modal-root zone-disclaimer-modal" role="presentation">
      <button
        type="button"
        className="confirm-modal-backdrop"
        aria-label="Cerrar aviso"
        onClick={onClose}
      />
      <motion.div
        className="confirm-modal-panel disclaimer-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <h2 id={titleId} className="confirm-modal-title">
          Aviso importante
        </h2>

        <div className="disclaimer-modal-body zone-scroll">
          <p>
            Esta es una aplicación <strong>hobby</strong>, hecha por amor al póker y para
            divertirse con amigos. No es un casino, no es un operador de juego y no está
            pensada para apostar dinero real.
          </p>
          <p>
            <strong>No se recauda ni se recaudará dinero</strong> a través de esta
            aplicación. No hay pagos, no hay depósitos, no hay retiros y no hay
            comisiones. Las fichas son virtuales y solo existen para el juego de mesa entre
            personas que se conocen.
          </p>
          <p>
            En Colombia, las apuestas de dinero no reguladas son ilegales. El uso de esta
            app con dinero real o con cualquier fin distinto al entretenimiento lúdico es
            responsabilidad exclusiva de quien la utilice. Los creadores no promueven ni
            facilitan el juego con dinero.
          </p>
          <p>
            No pedimos registro ni login formal: solo un apodo y una ficha para sentarte en
            la mesa. No vendemos datos y la app opera <strong>sin ánimo de lucro</strong>.
          </p>
          <p>
            Al continuar, aceptas que el uso es por tu cuenta y riesgo, con fines
            exclusivamente recreativos, y que cualquier conducta ilegal o indebida es
            responsabilidad de la persona que use la aplicación.
          </p>
          <p className="disclaimer-modal-closing">
            Juega limpio, cuida a tus amigos y que gane la mejor mano. ♠
          </p>
        </div>

        <div className="confirm-modal-actions disclaimer-modal-actions">
          <button
            ref={closeRef}
            type="button"
            className="confirm-modal-ok tone-primary"
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
}
