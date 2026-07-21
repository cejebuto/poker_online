# Fundamentos y Arquitectura

Base común para todas las fases: estructura del repositorio, convenciones de código limpio y escalable, el sistema de temas de cartas, y los criterios transversales (seguridad media, dockerización).

---

## 1. Estructura del monorepo

Monorepo con workspaces (pnpm) para compartir tipos y el motor de poker entre backend y frontend.

```
poker/
├── docker-compose.yml            # orquesta db, cache, api, web
├── .env.example
├── package.json                  # workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── engine/                   # [ENG] motor de poker PURO (sin red, sin DB)
│   │   ├── src/
│   │   │   ├── cards/            # mazo, barajado, tipos Card/Rank/Suit
│   │   │   ├── evaluator/        # evaluación y comparación de manos
│   │   │   ├── betting/          # rondas, validación de acciones
│   │   │   ├── pots/             # bote principal + side pots + split
│   │   │   ├── state/            # máquina de estados de la mano (pura)
│   │   │   └── index.ts
│   │   └── test/
│   └── shared/                   # tipos e interfaces compartidas (DTOs, eventos WS)
│       └── src/
├── apps/
│   ├── api/                      # [BE] servidor Node + WebSocket
│   │   ├── src/
│   │   │   ├── domain/           # servicios de sala/mano (usan engine)
│   │   │   ├── ws/               # gateway WebSocket, handlers de eventos
│   │   │   ├── auth/             # JWT, contraseña de sala
│   │   │   ├── persistence/      # event store (Postgres), repos
│   │   │   ├── cache/            # Redis (estado caliente, presencia, locks)
│   │   │   ├── queue/            # BullMQ (timers, jobs idempotentes)
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   └── test/
│   └── web/                      # [FE] React + TS (PWA)
│       ├── src/
│       │   ├── features/         # room, hand, chips, probability
│       │   ├── cards/            # sistema de render de cartas + temas SVG
│       │   ├── net/              # cliente WebSocket, reconexión
│       │   ├── views/            # PlayerView, TableView (mesa)
│       │   └── main.tsx
│       ├── Dockerfile
│       └── test/
└── docs/ -> ../implementacion    # (este plan)
```

**Tareas**

- [ ] `[INFRA]` Inicializar monorepo con pnpm workspaces y `tsconfig.base.json` estricto. `S`
- [ ] `[INFRA]` Configurar ESLint + Prettier + `tsc --noEmit` en la raíz. `S`
- [ ] `[ENG]` Crear paquete `engine` vacío con su `package.json` y build. `S`
- [ ] `[BE]` Crear paquete `shared` con tipos base (`Card`, `Suit`, `Rank`, DTOs). `S`

**Criterios de aceptación**

- [ ] `pnpm install` en la raíz instala todos los workspaces sin error.
- [ ] `pnpm -r build` compila `engine`, `shared`, `api`, `web`.
- [ ] `pnpm lint` corre en todo el repo y pasa.
- [ ] `engine` **no** importa nada de `api`, `web`, ni librerías de red/DB (dependencia validada por lint rule o test de imports).

---

## 2. Principios de código limpio y escalable

- **Dominio puro aislado:** el paquete `engine` no conoce WebSocket, Express, Redis ni Postgres. Recibe estado + acción y devuelve estado nuevo + eventos. Esto lo hace 100% testeable y reutilizable (incluso en el cliente para simulaciones).
- **Arquitectura por capas** en `api`: `ws` (transporte) → `domain` (casos de uso) → `engine` (reglas) / `persistence` + `cache` + `queue` (infra). Las dependencias apuntan hacia adentro.
- **Inmutabilidad** del estado del juego: las transiciones devuelven copias, no mutan (facilita event sourcing y debugging).
- **Tipos compartidos** en `shared`: un único contrato de eventos WS y DTOs, importado por `api` y `web`. Cero duplicación de tipos.
- **Funciones puras** para toda regla de poker; efectos secundarios (I/O) solo en los bordes.
- **Nombres explícitos**, funciones cortas, sin números mágicos (constantes nombradas: blinds, límites de fichas).
- **Errores tipados**: `Result<T, GameError>` o excepciones de dominio con códigos, nunca strings sueltos.
- **Configuración por entorno** (`.env`), nunca hardcodeada.

**Criterios de aceptación (transversales, se verifican en cada fase)**

- [ ] Ninguna regla de poker vive en `api` o `web`: toda está en `engine`.
- [ ] `api` y `web` importan los tipos de eventos desde `shared` (no redefinen).
- [ ] Cobertura de tests del `engine` ≥ 85 % de líneas.

---

## 3. Sistema de cartas SVG con temas intercambiables

Requisito: cartas por defecto en **SVG simple y reusable**, con **opción de cargar otros modelos** para cambiar el aspecto (temas/skins).

**Diseño**

- Una carta se identifica por `{ rank, suit }`. El render está detrás de una **interfaz de tema**:

```ts
// packages/shared/src/cards.ts
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K'|'A';
export interface Card { rank: Rank; suit: Suit }

// packages/web/src/cards/CardTheme.ts
export interface CardTheme {
  id: string;
  name: string;
  /** Devuelve el SVG (o URL/data-uri) de la cara de una carta. */
  renderFace(card: Card, size: CardSize): SvgOrElement;
  /** Reverso de la carta (dorso). */
  renderBack(size: CardSize): SvgOrElement;
}
```

- **Tema por defecto (`default-svg`)**: genera la carta con SVG paramétrico (rank + palo + color por palo). Un solo componente reusable, sin 52 archivos.
- **Registro de temas (`ThemeRegistry`)**: mapa `id -> CardTheme`. La UI lee el tema activo desde config/selección del usuario.
- **Carga de temas externos**: el usuario puede registrar un tema propio de dos formas:
  1. **Set de assets** (carpeta con 52 SVG/PNG nombrados `AS.svg`, `10H.svg`, `back.svg`, ...) → un `AssetCardTheme` los resuelve por convención de nombre.
  2. **Tema programático** que implementa `CardTheme` y se registra en `ThemeRegistry`.
- El `size` (`sm | md | lg`) permite que el **teléfono muestre las 5 comunitarias en pequeño (`sm`)** y sus 2 cartas grandes (`lg`), y la **Mesa las muestre `lg`**.

**Tareas**

- [ ] `[FE]` Definir interfaz `CardTheme` y tipos `Card`/`CardSize` en `shared`/`cards`. `S`
- [ ] `[FE]` Implementar `DefaultSvgTheme`: componente SVG paramétrico (rank, palo, color, dorso). `M`
- [ ] `[FE]` Implementar `ThemeRegistry` con tema activo seleccionable. `S`
- [ ] `[FE]` Implementar `AssetCardTheme` que resuelve un set de SVG/PNG por convención de nombre. `M`
- [ ] `[FE]` UI de ajustes: selector de tema + "cargar tema" (carpeta/URL base de assets). `M`
- [ ] `[FE]` Documentar en `apps/web/src/cards/README.md` cómo agregar un tema propio. `S`

**Criterios de aceptación**

- [ ] Con el tema por defecto, las 52 cartas + dorso renderizan correctamente en `sm`, `md`, `lg`.
- [ ] Cambiar el tema activo en ajustes actualiza **todas** las cartas sin recargar.
- [ ] Se puede registrar un tema de assets externos y verlo aplicado, sin tocar el código del juego.
- [ ] Ningún componente de juego referencia archivos de carta concretos: todo pasa por `CardTheme`.

---

## 4. Seguridad — nivel medio (concepto)

Es un concepto, así que **seguridad media**: proteger lo esencial sin sobre-ingeniería.

**Sí se hace:**

- Barajado en el servidor con RNG criptográfico; el mazo nunca se serializa al cliente.
- Cartas privadas solo por el canal autenticado del dueño.
- Validación server-side de toda acción (turno, monto, fichas).
- JWT firmado para sesión/reconexión (secreto por entorno).
- **Salas privadas con contraseña de 6 letras** (ver Fase 2), hasheada (bcrypt/argon2) en el registro de sala.
- Rate limiting básico por conexión.
- CORS restringido y WSS (TLS) en despliegue.

**No se hace (por ahora, es concepto):**

- Cuentas de usuario robustas / OAuth / MFA.
- Auditoría antifraude avanzada, cifrado extremo a extremo, HSM.
- Protección anti-DDoS a nivel infra.

**Criterios de aceptación (transversales)**

- [ ] En ningún payload hacia clientes ajenos aparecen cartas privadas ni el mazo (test automatizado que inspecciona los mensajes emitidos).
- [ ] La contraseña de sala nunca se devuelve al cliente ni se loguea; se guarda hasheada.
- [ ] El JWT usa secreto de entorno y expira; no contiene datos sensibles.

---

## 5. Dockerización (transversal)

- Cada app (`api`, `web`) tiene su **Dockerfile multi-stage** (build → runtime slim).
- `docker-compose.yml` en la raíz levanta: `postgres`, `redis`, `api`, `web` (y opcionalmente `rabbitmq` si se usa en vez de BullMQ).
- Variables por `.env`; `.env.example` versionado.
- Healthchecks en cada servicio; `depends_on` con condición de salud.

**Criterio de aceptación transversal**

- [ ] `docker compose up --build` levanta todo el stack y la app es accesible en el navegador, en una máquina limpia, sin pasos manuales extra más allá de copiar `.env`.

Detalle completo en [`01-fase0-setup-docker.md`](./01-fase0-setup-docker.md).
