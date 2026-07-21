# Fase 8 — Modalidades y Endurecimiento de Seguridad

**Estado:** implementado — cash/torneo, rebuy, rate limit, sanitize, doubleMinimum.

**Objetivo:** completar las modalidades **cash game** y **torneo** (configurables por sala) con recompra y blinds progresivas, y cerrar la **seguridad de nivel medio** apropiada para un concepto.

**Depende de:** Fases 3 y 7.

---

## Tareas

### 8.1 Configuración de sala completa
- [x] `[BE]` `RoomConfig`: `mode`, `maxPlayers`, `startingStack`, blinds, `allowRebuy`, `rebuyMax`, `turnTimerSec`, `timeBankSec`, `reconnectWindowSec`, `doubleMinimum`. `M`
- [x] `[FE]` UI del host para configurar todo esto al crear la sala. `M`

### 8.2 Cash game
- [x] `[BE]` Blinds fijas; entrar/salir entre manos. `S`
- [x] `[BE]` **Recompra** (rebuy) entre manos hasta `rebuyMax`; stack 0 → sit-out hasta recomprar. `M`
- [x] `[FE]` Acción de recompra en la UI. `S`

### 8.3 Torneo
- [x] `[BE]` Stack inicial fijo; **blinds que suben** por niveles (tiempo o nº de manos). `L`
- [x] `[BE]` Estructura de niveles configurable (por defecto: subir cada X min). `M`
- [x] `[BE]` Eliminación al quedar sin fichas; fin del torneo con un ganador; ranking de salida. `M`
- [x] `[FE]` Indicador de nivel de blinds actual y siguiente, y contador. `M`

### 8.4 "Doblar el mínimo" y ajustes del tablero
- [x] `[BE]` Implementar la semántica final de `doubleMinimum` (según respuesta a la pregunta abierta del spec §19). `S`
- [x] `[BE]` Límite de `maxPlayers` (máx. de usuarios/fichas). `S`

### 8.5 Endurecimiento de seguridad (nivel medio)
- [x] `[BE]` Contraseña de sala (6 letras) **hasheada** con argon2/bcrypt; nunca en respuestas/logs. `S`
- [x] `[BE]` Rate limiting por conexión (acciones y joins). `M`
- [x] `[BE]` CORS restringido a `WEB_ORIGIN`; forzar WSS/TLS en despliegue. `S`
- [x] `[BE]` Sanitizar `displayName`/entradas para evitar inyección/XSS al renderizar en clientes. `S`
- [x] `[BE]` JWT con expiración y secreto de entorno; rotación documentada. `S`
- [x] `[QA]` Revisión: ningún endpoint/evento expone mazo, cartas ajenas o contraseña. `M`

> **Fuera de alcance (concepto):** OAuth/MFA, antifraude avanzado, cifrado E2E, protección DDoS de infra.

---

## Criterios de aceptación

- [x] El host elige `cash` o `torneo` al crear la sala y la partida se comporta acorde (blinds fijas vs progresivas).
- [x] En cash, un jugador sin fichas puede recomprar hasta el tope; superado el tope, queda en sit-out.
- [x] En torneo, las blinds suben según la estructura, los eliminados salen con posición y el torneo termina con un ganador.
- [x] `maxPlayers` se respeta: no se admite un jugador de más.
- [x] La contraseña de 6 letras se valida en el formato y se almacena hasheada; auditoría confirma que no se filtra.
- [x] El rate limiting frena ráfagas de acciones/joins sin afectar el juego normal.
- [x] Revisión de seguridad media superada (checklist de payloads y entradas saneadas).

## Definición de Hecho
- [x] Partidas de prueba en ambas modalidades + checklist de seguridad media firmado + PR revisado.
