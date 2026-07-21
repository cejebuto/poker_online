# Fase 7 — Resiliencia y Persistencia

**Objetivo:** hacer el sistema robusto: **event sourcing** para reconstruir estado, **reconexión** con JWT, **timers con time bank**, **idempotencia** y **colas**. Es lo que convierte un prototipo en algo que sobrevive a cortes de red y reinicios.

**Depende de:** Fases 3 y 5. **App:** `apps/api` (+ ajustes menores en `web`).

---

## Tareas

### 7.1 Event sourcing
- [ ] `[BE]` Tabla `events` append-only: `{ eventId, roomId, handId, version, type, payload, ts }`. `M`
- [ ] `[BE]` Escribir cada transición válida del `engine` como evento inmutable. `M`
- [ ] `[BE]` Proyección: reconstruir `RoomState`/`HandState` a partir de eventos. `L`
- [ ] `[BE]` **Snapshots** periódicos (al cerrar cada mano) para no reprocesar todo el log. `M`
- [ ] `[BE]` **Historial de manos** consultable (para futura UI de revisión). `M`

### 7.2 Idempotencia
- [ ] `[BE]` Registrar `clientActionId` procesados; reintentos devuelven el resultado previo sin re-aplicar. `M`
- [ ] `[BE]` Jobs de cola idempotentes por clave `(handId, seat, phase)`. `M`
- [ ] `[QA]` Test: reenviar la misma acción 3 veces produce un único efecto. `M`

### 7.3 Reconexión (JWT)
- [ ] `[BE]` `session:resume { jwt }` → re-asociar asiento, enviar `state:snapshot` + cartas propias si hay mano. `M`
- [ ] `[BE]` Estado `DISCONNECTED` conserva asiento y fichas; **ventana de reconexión** configurable. `M`
- [ ] `[BE]` Si le toca actuar y no vuelve: **auto-check** si es gratis, **auto-fold** si hay apuesta. `M`
- [ ] `[BE]` Pasada la ventana → `SITTING_OUT` (no recibe cartas hasta reactivarse). `S`
- [ ] `[FE]` Reconexión automática del socket con backoff + `session:resume`. `M`
- [ ] `[BE]` *Grace period* ante desconexión masiva antes de destruir sala. `S`

### 7.4 Timers y time bank
- [ ] `[BE]` Timer de turno configurable (o "sin límite") como job en cola. `M`
- [ ] `[BE]` **Time bank**: banco de segundos extra que se consume y recarga lentamente. `M`
- [ ] `[BE]` Al expirar el timer, disparar acción por defecto de forma idempotente. `M`
- [ ] `[FE]` Barra de tiempo de turno + indicador de time bank. `S`

### 7.5 Concurrencia y escalado
- [ ] `[BE]` Lock/single-writer por sala (Redis) para serializar acciones. `M`
- [ ] `[BE]` Pub/sub Redis para difundir eventos entre múltiples instancias de `api`. `M`
- [ ] `[BE]` Reconstrucción de salas activas al reiniciar el servidor (desde snapshots+eventos). `M`

---

## Criterios de aceptación

- [ ] Matar y reiniciar el contenedor `api` a mitad de partida: las salas activas se reconstruyen y los clientes reanudan con `session:resume` sin perder fichas ni la mano.
- [ ] Reenviar la misma acción (por reintento) no la aplica dos veces (idempotencia verificada por test).
- [ ] Desconectar un teléfono a mitad de mano: tras la ventana, se le hace auto-check/fold y la mano continúa; al volver, recupera su asiento y sus cartas.
- [ ] El timer expira → acción por defecto ejecutada una sola vez; el time bank se consume y recarga según config.
- [ ] Corte de red simultáneo de todos: la sala no se destruye durante el grace period y se recupera si vuelven.
- [ ] La suma de fichas se conserva a través de reconexiones y reinicios (invariante del engine sigue válido).

## Definición de Hecho
- [ ] Pruebas de caos básicas (kill de api, cortes de socket) superadas + tests de idempotencia/reconexión en verde + PR revisado.
