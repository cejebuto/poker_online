# Fase 3 — Flujo de Mano y Protocolo WS


**Estado:** implementado — HandService + protocolo WS + PlayerView/TableView.

**Objetivo:** conectar el `engine` (Fase 1) con el backend (Fase 2) para **jugar manos completas** en tiempo real. El servidor orquesta la máquina de estados, envía a cada quien lo que le corresponde y difunde lo público.

**Depende de:** Fases 1 y 2. **Apps:** `apps/api` (orquestación) + primer render jugable en `apps/web`.

---

## Tareas

### 3.1 Servicio de mano (domain)
- [x] `[BE]` `HandService` que envuelve el `engine`: inicia mano, aplica acciones, avanza fases. `L`
- [x] `[BE]` Serializar el mazo/estado privado **solo en el servidor**; nunca al cliente. `M`
- [x] `[BE]` Single-writer/lock por sala (Redis) para serializar acciones concurrentes. `M`
- [x] `[BE]` `version` monotónico por sala para deltas e idempotencia. `S`

### 3.2 Protocolo WebSocket (contratos en `shared`)
Cliente → Servidor:
- [x] `[BE]` `hand:start` (solo host). `S`
- [x] `[BE]` `player:action { handId, action, amount?, clientActionId }`. `M`

Servidor → Cliente:
- [x] `[BE]` `state:snapshot { roomState }` (al conectar/reconectar). `M`
- [x] `[BE]` `state:patch { version, changes }` (deltas). `M`
- [x] `[BE]` `hand:dealt { yourCards }` → **solo al dueño**. `M`
- [x] `[BE]` `hand:community { cards, phase }` → público (flop/turn/river). `S`
- [x] `[BE]` `turn:begin { seat, timeoutMs, timeBankMs }`. `S`
- [x] `[BE]` `player:acted { seat, action, amount }`. `S`
- [x] `[BE]` `pot:update { pots }`. `S`
- [x] `[BE]` `showdown:reveal { hands }` (solo quienes van a showdown). `M`
- [x] `[BE]` `hand:result { winners, payouts }`. `M`

### 3.3 Validación y anti-trampa
- [x] `[BE]` Rechazar acción fuera de turno, monto ilegal o de un asiento ajeno. `M`
- [x] `[BE]` Filtro de payload: la Mesa y otros jugadores nunca reciben cartas privadas. `M`
- [x] `[QA]` Test que inspecciona todos los mensajes emitidos y falla si filtran cartas/mazo. `M`

### 3.4 Render jugable mínimo (para validar el flujo)
- [x] `[FE]` Cliente WS con manejo de snapshot + patches y estado local reactivo. `L`
- [x] `[FE]` PlayerView básica: tus 2 cartas, las 5 comunitarias, bote, turno, botones fold/check/call/raise. `L`
- [x] `[FE]` TableView (mesa) básica: comunitarias grandes, bote, fichas por jugador. `M`
- [x] `[FE]` Mostrar `showdown:reveal` y `hand:result` (ganador/es y reparto). `M`

### 3.5 Ciclo continuo
- [x] `[BE]` Al terminar la mano: rotar button, repartir siguiente cuando el host/condición lo indique. `M`
- [x] `[BE]` Jugadores con stack 0: sit-out o eliminación según modalidad (integra con Fase 8). `S`

---

## Criterios de aceptación

- [x] Con ≥ 2 dispositivos se juega una mano completa: reparto → apuestas en cada calle → showdown → reparto correcto del bote.
- [x] Cada jugador ve **solo** sus 2 cartas; las comunitarias se revelan sincronizadas en teléfonos y mesa.
- [x] Un all-in con stacks desiguales genera side pots correctos y el reparto coincide con el `engine`.
- [x] Una acción fuera de turno o con monto ilegal es rechazada con `error` y no altera el estado.
- [x] Test automatizado confirma que ningún mensaje a terceros contiene cartas privadas ni el mazo.
- [x] Tras recargar a mitad de mano, `state:snapshot` restaura la vista y (si aplica) reenvía las cartas propias.
- [x] Al ganar por fold de todos, no se revelan cartas.

## Definición de Hecho
- [x] Partida de prueba multi-cliente estable + tests de integración de una mano completa (incl. all-in con side pots) en verde + PR revisado.
