import { useCardTheme } from '../cards/ThemeRegistry';
import { FELT_THEMES, type FeltTheme } from './feltTheme';

export type ThemePickerProps = {
  feltThemeId: string;
  onFeltTheme: (id: string) => void;
  /** Opens the full asset-loader screen; omit to hide the link. */
  onOpenThemes?: () => void;
  onPicked?: () => void;
};

/**
 * Card deck + table felt, in one block.
 *
 * Shared by the player's table menu and the mesa's themes modal so the two
 * screens cannot drift into offering different options.
 */
export function ThemePicker({
  feltThemeId,
  onFeltTheme,
  onOpenThemes,
  onPicked,
}: ThemePickerProps) {
  const { themes, activeId, setActiveId } = useCardTheme();

  return (
    <>
      <section className="felt-menu-section">
        <p className="felt-label">Cartas</p>
        <label className="field">
          Tema
          <select
            value={activeId}
            onChange={(e) => {
              setActiveId(e.target.value);
              onPicked?.();
            }}
          >
            {themes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {onOpenThemes ? (
          <button type="button" className="ghost small" onClick={onOpenThemes}>
            Ajustes avanzados (cargar set propio)
          </button>
        ) : null}
      </section>

      <section className="felt-menu-section">
        <p className="felt-label">Paño</p>
        <div className="felt-menu-swatches">
          {FELT_THEMES.map((t: FeltTheme) => (
            <button
              key={t.id}
              type="button"
              className={`felt-menu-swatch${t.id === feltThemeId ? ' is-active' : ''}`}
              aria-pressed={t.id === feltThemeId}
              title={t.name}
              style={{
                background: `radial-gradient(ellipse at 50% 30%, ${t.green}, ${t.dark} 75%)`,
              }}
              onClick={() => {
                onFeltTheme(t.id);
                onPicked?.();
              }}
            >
              <span className="visually-hidden">{t.name}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
