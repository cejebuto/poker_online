# Spec Técnico — Poker con Amigos (Web, Presencial)

> Documento de especificación funcional y técnica. Versión 0.1 (borrador para revisión).
> Última actualización: 2026-07-21.

---

## 1. Visión

App web para jugar **Texas Hold'em No-Limit** presencialmente con amigos usando **fichas ficticias**. Cada persona usa su teléfono como su "asiento" (ve sus 2 cartas privadas), y un dispositivo aparte (tablet/TV/laptop) se pone al centro de la mesa mostrando el bote, las fichas y las 5 cartas comunitarias con protagonismo. Todo en tiempo real vía WebSocket, con un backend autoritativo que reparte cartas, valida apuestas y garantiza que nadie pueda hacer trampa.

No hay chat: la conversación es en persona. El foco es que la app reemplace la baraja física y la gestión de fichas, no la interacción social.

---

## 2. Decisiones tomadas

| # | Tema | Decisión |
|---|------|----------|
| 1 | Cartas | 100% digitales. La app reparte; cada teléfono ve sus 2 cartas, la mesa muestra las 5 comunitarias. |
| 2 | Fuente de verdad | Backend central autoritativo en la nube (WebSocket + DB + colas). |
| 3 | Variante | Texas Hold'em No-Limit (primera versión). |
| 4 | Vista mesa | Dispositivo dedicado que entra a la sala en "modo mesa" (solo info pública). |
| 5 | Probabilidad | Se calcula en el cliente, por Monte Carlo, solo con las cartas propias. |
| 6 | Bote | Side pots + reparto (split) completos, incluyendo all-in. |
| 7 | Modalidad | Configurable por sala: cash game (blinds fijas) o torneo (blinds que suben). |
| 8 | Stack backend | Node.js + TypeScript. |
| 9 | Desconexión | Ventana de reconexión con JWT; auto-check/fold si no vuelve a tiempo. |
| 10 | Timer | Configurable por el host, con time bank; opción "sin límite". |
| 11 | Persistencia | Event sourcing (log de eventos + snapshots) para idempotencia, reconstrucción de estado e historial de manos. |

---

## 3. Alcance

**Dentro del alcance (MVP → v1):**

- Crear sala, unirse por QR o link, reconectar.
- Reparto de cartas, rondas de apuesta, showdown y reparto de bote (con side pots).
- Las 4 formas de apostar fichas (ver §12).
- Vista de mesa dedicada.
- Cálculo de probabilidad propio en cada cliente.
- Cash game y torneo configurables.
- Reconexión resiliente y persistencia por event sourcing.

**Fuera del alcance (por ahora):**

- Chat de texto/voz.
- Dinero real, pasarelas de pago, KYC.
- Otras variantes (Omaha, Short Deck) — se contemplan como extensión.
- Ranking global / cuentas persistentes entre salas (se evalúa en v2).
- Matchmaking con desconocidos (esto es para jugar entre amigos que ya están juntos).

---

## 4. Roles y dispositivos

| Rol | Descripción | Info que ve |
|-----|-------------|-------------|
| **Host** | Crea la sala, define la configuración, puede expulsar/organizar jugadores. También juega. | Todo lo público + sus cartas privadas + panel de control de sala. |
| **Jugador (Cliente)** | Se une a la sala, recibe 2 cartas, apuesta. | Info pública + solo SUS 2 cartas privadas. |
| **Mesa (Espectador)** | Dispositivo dedicado al centro. Solo muestra info pública. | Bote, apuestas, fichas por jugador, 5 comunitarias, ganador. **Nunca** cartas privadas de nadie. |

> El "modo mesa" es un rol de solo-lectura. No tiene cartas ni puede apostar. Un mismo humano puede ser Host y Jugador; la Mesa siempre es un dispositivo separado.

---

## 5. Arquitectura de alto nivel

```
   Teléfonos (Jugadores)            Dispositivo Mesa
   ┌───────────────┐                ┌───────────────┐
   │  PWA / Web     │                │  PWA / Web     │
   │  - sus cartas  │                │  - solo público│
   │  - apuestas    │                │  - 5 cartas    │
   │  - probabilidad│                │  - bote/fichas │
   └───────┬────────┘                └───────┬────────┘
           │  WebSocket (WSS)                │
           └───────────────┬────────────────┘
                           │
                 ┌─────────▼──────────┐
                 │   API Gateway / LB  │
                 └─────────┬──────────┘
                           │
             ┌─────────────▼───────────────┐
             │   Game Server (Node + TS)   │
             │   - Autoritativo            │
             │   - Máquina de estados mano │
             │   - Valida acciones         │
             │   - Baraja/reparte          │
             │   - Emite eventos           │
             └───┬───────────┬──────────┬──┘
                 │           │          │
         ┌───────▼──┐  ┌─────▼─────┐ ┌──▼────────┐
         │  Redis    │  │ Postgres  │ │  Cola      │
         │ - estado  │  │ - eventos │ │ (Rabbit/   │
         │   sala    │  │ - snapshot│ │  BullMQ)   │
         │ - pub/sub │  │ - historial│ │ - jobs/    │
         │ - presencia│ │           │ │   timers   │
         └───────────┘  └───────────┘ └───────────┘
```

**Principios:**

- El servidor es la **única** fuente de verdad. Los clientes envían *intenciones* ("quiero apostar 200"), el servidor valida y confirma. Nunca se confía en el cliente para el estado.
- Las **cartas privadas se envían solo al dueño** por su canal WebSocket autenticado. La Mesa y los demás jugadores nunca las reciben hasta el showdown.
- **Estado caliente** de cada sala en Redis (baja latencia, presencia, pub/sub para escalar horizontalmente). **Estado durable** (log de eventos y snapshots) en Postgres.

---

## 6. Stack tecnológico (propuesto)

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | React + TypeScript (PWA) | Instalable en el teléfono, misma lógica de tipos que el back. |
| Tiempo real | WebSocket (`ws` o Socket.IO) | Bidireccional, baja latencia. Socket.IO da reconexión y rooms out-of-the-box. |
| Backend | Node.js + TypeScript | Comparte lógica/tipos de poker con el front, ecosistema maduro. |
| Estado caliente | Redis | Presencia, estado de sala, pub/sub entre instancias, locks. |
| Persistencia | PostgreSQL | Event store (append-only) + snapshots + historial de manos. |
| Colas / jobs | BullMQ (Redis) o RabbitMQ | Timers de turno, expiración de reconexión, tareas diferidas idempotentes. |
| Motor de manos | Librería propia + evaluador (p.ej. `pokersolver` o eval propio) | Evaluación de manos y comparación en showdown. |
| Auth | JWT (HS256/RS256) | Reconexión sin re-login, ligado a `roomId + playerId`. |

> **Nota sobre RabbitMQ vs BullMQ:** para el MVP, BullMQ (sobre Redis) cubre timers y jobs con menos infra. RabbitMQ se justifica si más adelante separamos servicios (p.ej. un worker de historial/analytics desacoplado) o necesitamos routing/fanout más sofisticado. La arquitectura de event sourcing permite migrar sin reescribir la lógica de juego.

---

## 7. Flujos principales

### 7.1 Crear sala (Host)

1. Host abre la app → "Get User Info" (nombre/avatar, sin cuenta obligatoria).
2. Configura la sala (§11) → `POST /rooms` (o evento WS `room:create`).
3. Servidor crea `roomId`, genera **código corto** + **QR** + **link** (`/join/:roomId`).
4. Servidor emite JWT del host (rol `host+player`) → se guarda en `localStorage`.
5. Host queda en el lobby esperando jugadores (esto ocurre **en paralelo** a que se van uniendo — ver tablero: "Configurar el Room del Juego ‖ Unir más usuarios").

### 7.2 Unirse (Jugador)

1. Escanea QR o abre link → "Get User Info" (nombre/avatar).
2. `POST /rooms/:id/join` → servidor valida cupo (máximo de jugadores) y estado (lobby / permitir entrar a mitad).
3. Servidor emite JWT (rol `player`, con `playerId`, `roomId`) → `localStorage`.
4. Jugador entra al lobby; se difunde `player:joined` a la sala.

### 7.3 Autenticación y reconexión (JWT)

- El JWT contiene `{ playerId, roomId, role, seat }` y se guarda en `localStorage`.
- **El token solo cambia al cambiar de sala** (como en el tablero). Mientras siga en la misma sala, se mantiene.
- Al recargar / reconectar: el cliente reabre el WebSocket y envía `session:resume` con su JWT. El servidor lo re-asocia a su asiento y le reenvía el snapshot del estado + sus cartas privadas si hay mano en curso.
- Si el JWT expiró o la sala ya no existe → se limpia `localStorage` y vuelve al inicio.

### 7.4 Ciclo de una mano

```
Lobby → (host inicia) → Blinds → Reparto (2 cartas c/u)
   → Pre-flop (ronda apuestas)
   → Flop (3 comunitarias) → ronda apuestas
   → Turn (4ª comunitaria) → ronda apuestas
   → River (5ª comunitaria) → ronda apuestas
   → Showdown → Evaluación → Reparto de bote (side pots)
   → Rotar dealer button → siguiente mano
```

> Nota del tablero: "solo el botón de fold, siempre hasta la ronda 4 (river)". Interpretación: **fold siempre disponible** en toda ronda de apuesta hasta el river inclusive. Las demás acciones (check/call/bet/raise/all-in) dependen de si hay apuesta pendiente. Confirmar interpretación (ver §16).

### 7.5 Destruir sala

- Si **todos** los jugadores salen, la sala se destruye (como en el tablero: "if everybody leave the room → destroy room"). Antes de destruir, se persiste el historial. Se aplica un pequeño *grace period* por si es una desconexión masiva temporal (evita destruir por corte de wifi general).

---

## 8. Modelo de dominio / máquina de estados

**Estados de la sala:** `LOBBY → IN_HAND → PAUSED → CLOSED`

**Estados de una mano (`HandPhase`):** `DEALING → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → PAYOUT → COMPLETE`

**Estado por jugador en la mano:** `ACTIVE → FOLDED / ALL_IN / SITTING_OUT / DISCONNECTED`

**Estado de sala (esquemático):**

```ts
type RoomState = {
  roomId: string;
  phase: 'LOBBY' | 'IN_HAND' | 'PAUSED' | 'CLOSED';
  config: RoomConfig;
  players: PlayerState[];       // asiento, stack, estado, conectado
  button: number;               // posición del dealer
  hand?: HandState;             // mano en curso (si aplica)
  version: number;              // se incrementa por cada evento (idempotencia)
};

type HandState = {
  handId: string;
  phase: HandPhase;
  deck: Card[];                 // SOLO en el servidor, nunca se serializa al cliente
  community: Card[];            // se revela por fases
  pots: Pot[];                  // bote principal + side pots
  currentToAct: number;         // asiento que debe actuar
  minRaise: number;
  lastAggressor?: number;
  betsThisRound: Record<seat, number>;
};

type Pot = { amount: number; eligibleSeats: number[] };
```

---

## 9. Lógica de poker

### 9.1 Blinds y dealer button

- Rotan por asiento cada mano (small blind, big blind).
- **Cash game:** blinds fijas definidas en config.
- **Torneo:** blinds suben por niveles (tiempo o número de manos). Estructura de niveles configurable.
- Heads-up (2 jugadores): el button es small blind (regla estándar).

### 9.2 Rondas de apuesta

- Acciones: `fold`, `check`, `call`, `bet`, `raise`, `all-in`.
- No-Limit: el raise mínimo = tamaño del último bet/raise; máximo = todo el stack (all-in).
- Una ronda termina cuando todos los activos igualaron la apuesta más alta o están all-in.

### 9.3 All-in y side pots

Cuando un jugador va all-in con menos fichas que la apuesta, se crean **botes laterales**:

- El **bote principal** solo lo pueden ganar los que cubrieron esa cantidad.
- Cada nivel adicional de apuesta genera un side pot con los jugadores elegibles.
- En el showdown, cada bote se adjudica por separado a la mejor mano **entre sus elegibles**.

> Ejemplo: A all-in 100, B apuesta 300, C iguala 300.
> Bote principal = 300 (100×3), elegibles A/B/C.
> Side pot = 400 ((300-100)×2), elegibles solo B/C.

### 9.4 Showdown, empates y múltiples ganadores

**Resuelve las dos dudas del tablero:**

- **"¿Qué pasa cuando existen varios ganadores?"** → El bote se divide en partes iguales entre las manos empatadas. Si no divide exacto, las fichas sobrantes (*odd chips*) van al jugador más cercano al button en orden (regla estándar).
- **All-in / "cuando ya se acaben"** → Cada side pot se evalúa con sus elegibles; un jugador puede ganar un pot y perder otro. Si un jugador se queda sin fichas (stack 0) y no recompra, queda eliminado (torneo) o en sit-out hasta recomprar (cash).

### 9.5 Recompra (rebuy)

- Del tablero: "Permitir Recompra". Configurable por sala.
- **Cash:** un jugador con stack bajo/0 puede recomprar entre manos hasta un tope.
- **Torneo:** recompra deshabilitada o limitada a una ventana inicial.

---

## 10. Protocolo WebSocket (borrador de eventos)

**Cliente → Servidor (intenciones):**

```
session:resume        { jwt }
room:create           { config }
room:join             { roomId, user }
room:config:update    { patch }              // solo host
hand:start            { }                     // solo host
player:action         { handId, action, amount?, clientActionId }
player:sitout         { }
player:rebuy          { amount }
mesa:attach           { roomId }              // entrar en modo mesa
```

**Servidor → Cliente (estado y eventos):**

```
state:snapshot        { roomState }           // estado completo (al reconectar)
state:patch           { version, changes }    // deltas incrementales
hand:dealt            { yourCards }            // SOLO al dueño
hand:community        { cards, phase }         // público
turn:begin            { seat, timeoutMs, timeBankMs }
player:acted          { seat, action, amount }
pot:update            { pots }
showdown:reveal       { hands }                // revela cartas de quienes van a showdown
hand:result           { winners, payouts }
error                 { code, message }
```

> `clientActionId` en cada acción del cliente es clave de **idempotencia** (ver §11).

---

## 11. Idempotencia, event sourcing y resiliencia

### 11.1 Event sourcing

- Cada cambio de estado válido se registra como **evento inmutable** en el event store (Postgres, append-only): `{ eventId, roomId, handId, version, type, payload, ts }`.
- El estado de la sala es una **proyección** (fold/reduce) de sus eventos.
- Snapshots periódicos (p.ej. al cerrar cada mano) para no re-procesar todo el log al reconstruir.
- Beneficios: reconstrucción de estado tras caída del servidor, **historial de manos** gratis, auditoría anti-trampa.

### 11.2 Idempotencia

- Cada acción del cliente lleva un `clientActionId` único.
- El servidor guarda los IDs procesados; si llega uno repetido (por reintento tras reconexión), **no** se aplica dos veces y se responde con el resultado ya calculado.
- Los jobs de la cola (timers, expiraciones) también son idempotentes: se identifican por `(handId, seat, phase)` para que un reintento no dispare dos auto-folds.

### 11.3 Concurrencia

- Por sala se usa un **lock** (Redis) o un actor/single-writer que serializa las acciones de esa sala. Así dos acciones simultáneas no corrompen el estado.
- El campo `version` monotónico permite a los clientes detectar y pedir resync si se saltan un patch.

---

## 12. UX — Interacción de fichas

Del tablero, **4 formas de colocar fichas**:

1. **Lanzar** — swipe vertical: arroja la ficha/apuesta hacia el centro.
2. **Tap tap tap** — cada toque incrementa el valor de la ficha tocada.
3. **Hold + swipe horizontal** — mantener el dedo e incrementar por el mínimo (o según reglas de la ronda).
4. **Botones** — `call`, `duplicar` (2×), `triplicar` (3×) la apuesta.

**Representación visual de fichas (isométrica):**

- Columnas de fichas en vista isométrica. Al llegar a un **límite** de altura, se sustituyen por **barras rectangulares**.
- Hasta 3 barras con multiplicadores: **100×, 1.000×, 10.000×**, mostrando hasta 3 dígitos (máx. 999) por barra.
- Objetivo: representar stacks grandes sin apilar cientos de fichas.

**Orientación de pantalla:**

- **Vertical (portrait):** pantalla dividida **horizontalmente**.
- **Horizontal (landscape):** pantalla dividida **verticalmente**.

> (En el tablero hay placeholders "This is a textbox" — se completarán con copy definitivo de la UI en el diseño visual.)

---

## 13. Motor de probabilidad (cliente)

- **Dónde:** en cada teléfono, solo con las **2 cartas propias** + comunitarias visibles. El servidor no interviene (no filtra info ajena, no se carga).
- **Método:** **Monte Carlo** — se simulan N manos (p.ej. 5.000–20.000) repartiendo aleatoriamente las cartas desconocidas de los rivales y las comunitarias faltantes, y se cuenta cuántas gana/empata el jugador.
- **Rendimiento:** correr en un Web Worker para no bloquear la UI; ajustar N según fase (pre-flop menos iteraciones, river casi determinista).
- **Entrega:** muestra `% victoria` / `% empate` aproximado, actualizado al revelarse cada calle.
- Se asume número de rivales = jugadores aún activos en la mano.

> Alternativa futura: enumeración exacta post-flop (barato cuando quedan pocas cartas). Monte Carlo es suficiente y uniforme para el MVP.

---

## 14. Resiliencia y reconexión

### 14.1 Desconexión de un jugador

- Al perder el socket, el jugador pasa a `DISCONNECTED` pero **conserva su asiento y fichas**.
- Se abre una **ventana de reconexión** (configurable, p.ej. 30–60 s). Vuelve con su JWT (`session:resume`) → recupera asiento y estado.
- Si le toca actuar y no ha vuelto: **auto-check** si es gratis, **auto-fold** si hay apuesta pendiente. La mano continúa para los demás.
- Si no vuelve en toda la ventana → `SITTING_OUT`; no recibe cartas hasta reactivarse.

### 14.2 Timer de turno

- Configurable por el host: segundos por acción, o **"sin límite"** (útil en presencial relajado).
- **Time bank:** banco de segundos extra que se consume en decisiones difíciles y se recarga lentamente.
- Los timers viven como jobs idempotentes en la cola; al expirar disparan la acción por defecto.

### 14.3 Caída del servidor

- Gracias al event sourcing + snapshots, al reiniciar el servidor reconstruye las salas activas desde Postgres/Redis y los clientes hacen `session:resume` → `state:snapshot`.

---

## 15. Seguridad y anti-trampa

- **Cartas privadas nunca salen** hacia otros clientes ni hacia la Mesa. Solo por el canal autenticado del dueño.
- El **mazo se baraja en el servidor** con RNG criptográfico (`crypto.randomBytes`). El cliente jamás ve el orden.
- El cliente solo envía intenciones; el servidor **valida toda acción** (turno correcto, monto legal, fichas suficientes).
- El **modo mesa es solo-lectura** y filtra el payload a solo campos públicos.
- El JWT liga sesión a `roomId + playerId + seat`; no permite suplantar otro asiento.
- Rate limiting por conexión para evitar spam de acciones.

---

## 16. Configuración de sala (`RoomConfig`)

| Parámetro | Descripción |
|-----------|-------------|
| `mode` | `cash` \| `tournament` |
| `maxPlayers` | Máximo de jugadores (del tablero: "Máximo de fichas/usuarios"). |
| `startingStack` | Fichas iniciales por jugador. |
| `smallBlind` / `bigBlind` | Blinds iniciales. |
| `blindStructure` | Solo torneo: niveles y cadencia de subida. |
| `allowRebuy` | Permitir recompra (del tablero). |
| `rebuyMax` | Tope de recompras. |
| `turnTimerSec` | Tiempo por turno o `null` (sin límite). |
| `timeBankSec` | Banco de tiempo inicial. |
| `reconnectWindowSec` | Ventana de reconexión. |
| `doubleMinimum` | Del tablero: "Doblar el mínimo" (blinds/apuesta mínima). |

> Del tablero también: "Organizar Usuarios" → el host puede reordenar asientos en el lobby.

---

## 17. Casos borde / decisiones resueltas

- **Varios ganadores:** split del bote en partes iguales; odd chips al primero desde el button. (§9.4)
- **All-in de distinto tamaño:** side pots por nivel; cada bote a su mejor mano elegible. (§9.3)
- **Jugador sin fichas:** eliminado (torneo) o sit-out/recompra (cash). (§9.5)
- **Empate exacto en un side pot:** se divide ese pot entre sus elegibles empatados.
- **Todos foldean menos uno:** gana sin showdown, no revela cartas.
- **Desconexión masiva (corte de wifi):** grace period antes de destruir la sala. (§7.5)

---

## 18. Roadmap por fases

**Fase 0 — Núcleo de poker (offline/local):** motor de manos, evaluador, side pots, tests unitarios de reglas. Sin red.

**Fase 1 — MVP jugable:** backend autoritativo + WebSocket, crear/unir sala (QR/link), reparto, rondas, showdown, reparto de bote, vista de jugador y vista de mesa básicas. Cash game.

**Fase 2 — Resiliencia:** JWT + reconexión, event sourcing + snapshots, timers con time bank, idempotencia, colas.

**Fase 3 — UX de fichas:** las 4 formas de apostar, fichas isométricas + barras, orientación adaptativa.

**Fase 4 — Probabilidad + torneo:** motor Monte Carlo en cliente, modo torneo con blinds progresivas, recompra.

**Fase 5 — Pulido:** organización de asientos, historial de manos visible, animaciones, sonido.

---

## 19. Preguntas abiertas pendientes

1. **Interpretación de "solo el botón de fold hasta el river":** ¿fold siempre visible pero con check/call/raise según corresponda (interpretación asumida), o hay alguna regla especial que limite las acciones antes del river?
2. **Máximo de jugadores por mesa:** ¿9 (mesa completa estándar) o algún otro tope?
3. **Persistencia de identidad:** ¿los jugadores son anónimos por sala (nombre + avatar temporal) o quieres cuentas ligeras que persistan entre partidas?
4. **Estructura de blinds de torneo:** ¿tienes una en mente o definimos una por defecto (subida cada X min)?
5. **"Doblar el mínimo":** ¿se refiere a una acción rápida de apuesta (botón), a subir el blind mínimo de la sala, o a ambas?
6. **Idioma / branding:** ¿nombre del producto? ¿solo español o multi-idioma?
7. **Hosting objetivo:** ¿alguna nube o restricción concreta (AWS/GCP/Fly/Railway) para dimensionar infra?

---

*Fin del borrador v0.1. Ajustamos según tus respuestas a §19 y pasamos a diseño detallado de cada fase.*
