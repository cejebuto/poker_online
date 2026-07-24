# Card themes

All in-game card rendering goes through `CardTheme` + `ThemeRegistry`.  
Game views (`PlayerView`, `TableView`) **must not** reference SVG/PNG files directly.

## Built-in

All built-ins are **parametric SVG** (one component, not 52 files). Franchise themes are fan-made looks — no original assets.

| id | name | Signature look |
|----|------|----------------|
| `default-svg` | Clásico | Clean rank + suit |
| `balatro` | Balatro | CRT cream, scanlines, chunky mono |
| `slay-the-spire` | Slay the Spire | Parchment, iron/gold frame, class energy orbs |
| `inscryption` | Inscryption | Wood frame, dirty paper, ink + watching eye |
| `yugioh` | Yu-Gi-Oh! | Gold chrome, type frames, amber wave-vortex back |
| `pokemon` | Pokémon | Energy border, type strip, ball back |
| `digimon` | Digimon | Digivice orange, cyan grid, attribute colours |
| `uno` | UNO | Solid suit colours, white oval, huge rank |

## `CardTheme` interface

```ts
interface CardTheme {
  id: string;
  name: string;
  renderFace(card: Card, size: CardSize): ReactElement;
  renderBack(size: CardSize): ReactElement;
}
```

`CardSize`: `sm` | `md` | `lg`  
- Phone community: `sm`  
- Hole cards / table community: `lg`

## Asset theme convention

Place **53** files in a folder (or under a URL base):

| File | Meaning |
|------|---------|
| `AS.svg` | Ace of spades |
| `10H.png` | Ten of hearts (`T` also accepted as 10) |
| `KD.webp` | King of diamonds |
| … | All 52 faces |
| `back.svg` | Card back |

Suit letters: `C` clubs, `D` diamonds, `H` hearts, `S` spades.  
Ranks: `2`–`9`, `10` or `T`, `J`, `Q`, `K`, `A`.

### URL base

In **Ajustes de cartas**, set e.g. `https://cdn.example.com/deck/`  
The app requests `https://cdn.example.com/deck/AS.svg`, `…/back.svg`, etc.

Incomplete sets (missing any of the 53 keys) are **rejected** with a clear error.

### Local folder

Use “Cargar carpeta”. File names follow the same convention.  
Blob URLs work for the current session; for persistence across reloads, prefer a public URL base.

## Programmatic theme

```ts
import { createAssetCardTheme } from './AssetCardTheme';
import { useCardTheme } from './ThemeRegistry';

const theme = createAssetCardTheme({
  id: 'neon',
  name: 'Neon deck',
  baseUrl: 'https://cdn.example.com/neon/',
  ext: 'svg',
});

// inside a component under ThemeProvider:
const { registerTheme } = useCardTheme();
registerTheme(theme, { id: 'neon', name: 'Neon deck', baseUrl: '…', ext: 'svg' });
```

Or implement `CardTheme` yourself and call `registerTheme(myTheme)`.

## Usage in UI

```tsx
import { PlayingCard, CommunityRow } from './PlayingCard';

<PlayingCard card={{ rank: 'A', suit: 'spades' }} size="lg" animate="deal" />
<PlayingCard faceDown size="md" />
<CommunityRow cards={community} size="sm" />
```
