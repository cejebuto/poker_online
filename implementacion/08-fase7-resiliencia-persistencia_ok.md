# Fase 7 — Resiliencia y Persistencia

**Estado:** implementado — event store, snapshots, idempotencia, timers/time bank, reconnect, hydrate.

**Objetivo:** hacer el sistema robusto: **event sourcing** para reconstruir estado, **reconexión** con JWT, **timers con time bank**, **idempotencia** y **colas**. Es lo que convierte un prototipo en algo que sobrevive a cortes de red y reinicios.

**Depende de:** Fases 3 y 5. **App:** `apps/api` (+ ajustes menores en `web`).

---

## Tareas

### 7.1 Event sourcing
- [x] `[BE]` Tabla `events` append-only: `{ eventId, roomId, handId, version, type, payload, ts }`. `M`
- [x] `[BE]` Escribir cada transición válida del `engine` como evento inmutable. `M`
- [x] `[BE]` Proyección: reconstruir `RoomState`/`HandState` a partir de eventos. `L`
- [x] `[BE]` **Snapshots** periódicos (al cerrar cada mano) para no reprocesar todo el log. `M`
- [x] `[BE]` **Historial de manos** consultable (para futura UI de revisión). `M`

### 7.2 Idempotencia
- [x] `[BE]` Registrar `clientActionId` procesados; reintentos devuelven el resultado previo sin re-aplicar. `M`
- [x] `[BE]` Jobs de cola idempotentes por clave `(handId, seat, phase)`. `M`
- [x] `[QA]` Test: reenviar la misma acción 3 veces produce un único efecto. `M`

### 7.3 Reconexión (JWT)
- [x] `[BE]` `session:resume { jwt }` → re-asociar asiento, enviar `state:snapshot` + cartas propias si hay mano. `M`
- [x] `[BE]` Estado `DISCONNECTED` conserva asiento y fichas; **ventana de reconexión** configurable. `M`
- [x] `[BE]` Si le toca actuar y no vuelve: **auto-check** si es gratis, **auto-fold** si hay apuesta. `M`
- [x] `[BE]` Pasada la ventana → `SITTING_OUT` (no recibe cartas hasta reactivarse). `S`
- [x] `[FE]` Reconexión automática del socket con backoff + `session:resume`. `M`
- [x] `[BE]` *Grace period* ante desconexión masiva antes de destruir sala. `S`

### 7.4 Timers y time bank
- [x] `[BE]` Timer de turno configurable (o "sin límite") como job en cola. `M`
- [x] `[BE]` **Time bank**: banco de segundos extra que se consume y recarga lentamente. `M`
- [x] `[BE]` Al expirar el timer, disparar acción por defecto de forma idempotente. `M`
- [x] `[FE]` Barra de tiempo de turno + indicador de time bank. `S`

### 7.5 Concurrencia y escalado
- [x] `[BE]` Lock/single-writer por sala (Redis) para serializar acciones. `M`
- [x] `[BE]` Pub/sub Redis para difundir eventos entre múltiples instancias de `api`. `M`
- [x] `[BE]` Reconstrucción de salas activas al reiniciar el servidor (desde snapshots+eventos). `M`

---

## Criterios de aceptación

- [x] Matar y reiniciar el contenedor `api` a mitad de partida: las salas activas se reconstruyen y los clientes reanudan con `session:resume` sin perder fichas ni la mano.
- [x] Reenviar la misma acción (por reintento) no la aplica dos veces (idempotencia verificada por test).
- [x] Desconectar un teléfono a mitad de mano: tras la ventana, se le hace auto-check/fold y la mano continúa; al volver, recupera su asiento y sus cartas.
- [x] El timer expira → acción por defecto ejecutada una sola vez; el time bank se consume y recarga según config.
- [x] Corte de red simultáneo de todos: la sala no se destruye durante el grace period y se recupera si vuelven.
- [x] La suma de fichas se conserva a través de reconexiones y reinicios (invariante del engine sigue válido).

## Definición de Hecho
- [x] Pruebas de caos básicas (kill de api, cortes de socket) superadas + tests de idempotencia/reconexión en verde + PR revisado.
