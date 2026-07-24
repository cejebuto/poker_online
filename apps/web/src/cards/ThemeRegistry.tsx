import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CardTheme } from './CardTheme';
import { defaultSvgTheme } from './DefaultSvgTheme';
import { balatroSvgTheme } from './BalatroSvgTheme';
import {
  createAssetCardTheme,
  type AssetThemeConfig,
} from './AssetCardTheme';

const STORAGE_KEY = 'poker.cardTheme';
const CUSTOM_KEY = 'poker.cardTheme.custom';
const HALF_KEY = 'poker.cardTheme.half';

function loadHalfCards(): boolean {
  try {
    return localStorage.getItem(HALF_KEY) === 'on';
  } catch {
    return false;
  }
}

type StoredSelection =
  | { kind: 'builtin'; id: string }
  | { kind: 'custom'; config: AssetThemeConfig };

type ThemeContextValue = {
  theme: CardTheme;
  themes: CardTheme[];
  activeId: string;
  setActiveId: (id: string) => void;
  registerTheme: (theme: CardTheme, persistConfig?: AssetThemeConfig) => void;
  /**
   * Draw only the top half of every card, magnified. Lives here so PlayingCard
   * can read it directly — no screen has to thread it down as a prop.
   */
  halfCards: boolean;
  setHalfCards: (on: boolean) => void;
  error: string | null;
  setError: (msg: string | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function loadSelection(): StoredSelection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredSelection;
  } catch {
    // ignore
  }
  return { kind: 'builtin', id: defaultSvgTheme.id };
}

function loadCustomThemes(): CardTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const configs = JSON.parse(raw) as AssetThemeConfig[];
    return configs.map((c) => createAssetCardTheme(c));
  } catch {
    return [];
  }
}

function saveCustomConfigs(configs: AssetThemeConfig[]): void {
  // Only persist URL-based configs (not blob: which die on reload)
  const durable = configs.filter(
    (c) => c.baseUrl || (c.urls && Object.values(c.urls).every((u) => !u.startsWith('blob:'))),
  );
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(durable));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [builtin] = useState<CardTheme[]>([defaultSvgTheme, balatroSvgTheme]);
  const [custom, setCustom] = useState<CardTheme[]>(() => loadCustomThemes());
  const [customConfigs, setCustomConfigs] = useState<AssetThemeConfig[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]') as AssetThemeConfig[];
    } catch {
      return [];
    }
  });
  const [selection, setSelection] = useState<StoredSelection>(() => loadSelection());
  const [halfCards, setHalfCardsState] = useState<boolean>(() => loadHalfCards());
  const [error, setError] = useState<string | null>(null);

  const setHalfCards = useCallback((on: boolean) => {
    setHalfCardsState(on);
    try {
      localStorage.setItem(HALF_KEY, on ? 'on' : 'off');
    } catch {
      // Private browsing — the preference simply does not persist.
    }
  }, []);

  const themes = useMemo(() => [...builtin, ...custom], [builtin, custom]);

  const theme = useMemo(() => {
    const id = selection.kind === 'builtin' ? selection.id : selection.config.id;
    return themes.find((t) => t.id === id) ?? defaultSvgTheme;
  }, [selection, themes]);

  const activeId = theme.id;

  const setActiveId = useCallback(
    (id: string) => {
      const found = themes.find((t) => t.id === id);
      if (!found) return;
      const cfg = customConfigs.find((c) => c.id === id);
      const next: StoredSelection = cfg
        ? { kind: 'custom', config: cfg }
        : { kind: 'builtin', id };
      setSelection(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setError(null);
    },
    [themes, customConfigs],
  );

  const registerTheme = useCallback((t: CardTheme, persistConfig?: AssetThemeConfig) => {
    setCustom((prev) => {
      const rest = prev.filter((x) => x.id !== t.id);
      return [...rest, t];
    });
    if (persistConfig) {
      setCustomConfigs((prev) => {
        const rest = prev.filter((x) => x.id !== persistConfig.id);
        const next = [...rest, persistConfig];
        saveCustomConfigs(next);
        return next;
      });
    }
    const next: StoredSelection = persistConfig
      ? { kind: 'custom', config: persistConfig }
      : { kind: 'builtin', id: t.id };
    // For blob themes, still activate but selection may not survive reload
    if (persistConfig && Object.values(persistConfig.urls ?? {}).some((u) => u.startsWith('blob:'))) {
      setSelection({ kind: 'builtin', id: t.id });
      // keep in-memory custom only
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: 'builtin', id: t.id }));
    } else {
      setSelection(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    setError(null);
  }, []);

  const value: ThemeContextValue = {
    theme,
    themes,
    activeId,
    setActiveId,
    registerTheme,
    halfCards,
    setHalfCards,
    error,
    setError,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useCardTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useCardTheme must be used within ThemeProvider');
  return ctx;
}
