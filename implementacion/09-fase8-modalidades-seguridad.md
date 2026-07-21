# Fase 8 — Modalidades y Endurecimiento de Seguridad

**Objetivo:** completar las modalidades **cash game** y **torneo** (configurables por sala) con recompra y blinds progresivas, y cerrar la **seguridad de nivel medio** apropiada para un concepto.

**Depende de:** Fases 3 y 7.

---

## Tareas

### 8.1 Configuración de sala completa
- [ ] `[BE]` `RoomConfig`: `mode`, `maxPlayers`, `startingStack`, blinds, `allowRebuy`, `rebuyMax`, `turnTimerSec`, `timeBankSec`, `reconnectWindowSec`, `doubleMinimum`. `M`
- [ ] `[FE]` UI del host para configurar todo esto al crear la sala. `M`

### 8.2 Cash game
- [ ] `[BE]` Blinds fijas; entrar/salir entre manos. `S`
- [ ] `[BE]` **Recompra** (rebuy) entre manos hasta `rebuyMax`; stack 0 → sit-out hasta recomprar. `M`
- [ ] `[FE]` Acción de recompra en la UI. `S`

### 8.3 Torneo
- [ ] `[BE]` Stack inicial fijo; **blinds que suben** por niveles (tiempo o nº de manos). `L`
- [ ] `[BE]` Estructura de niveles configurable (por defecto: subir cada X min). `M`
- [ ] `[BE]` Eliminación al quedar sin fichas; fin del torneo con un ganador; ranking de salida. `M`
- [ ] `[FE]` Indicador de nivel de blinds actual y siguiente, y contador. `M`

### 8.4 "Doblar el mínimo" y ajustes del tablero
- [ ] `[BE]` Implementar la semántica final de `doubleMinimum` (según respuesta a la pregunta abierta del spec §19). `S`
- [ ] `[BE]` Límite de `maxPlayers` (máx. de usuarios/fichas). `S`

### 8.5 Endurecimiento de seguridad (nivel medio)
- [ ] `[BE]` Contraseña de sala (6 letras) **hasheada** con argon2/bcrypt; nunca en respuestas/logs. `S`
- [ ] `[BE]` Rate limiting por conexión (acciones y joins). `M`
- [ ] `[BE]` CORS restringido a `WEB_ORIGIN`; forzar WSS/TLS en despliegue. `S`
- [ ] `[BE]` Sanitizar `displayName`/entradas para evitar inyección/XSS al renderizar en clientes. `S`
- [ ] `[BE]` JWT con expiración y secreto de entorno; rotación documentada. `S`
- [ ] `[QA]` Revisión: ningún endpoint/evento expone mazo, cartas ajenas o contraseña. `M`

> **Fuera de alcance (concepto):** OAuth/MFA, antifraude avanzado, cifrado E2E, protección DDoS de infra.

---

## Criterios de aceptación

- [ ] El host elige `cash` o `torneo` al crear la sala y la partida se comporta acorde (blinds fijas vs progresivas).
- [ ] En cash, un jugador sin fichas puede recomprar hasta el tope; superado el tope, queda en sit-out.
- [ ] En torneo, las blinds suben según la estructura, los eliminados salen con posición y el torneo termina con un ganador.
- [ ] `maxPlayers` se respeta: no se admite un jugador de más.
- [ ] La contraseña de 6 letras se valida en el formato y se almacena hasheada; auditoría confirma que no se filtra.
- [ ] El rate limiting frena ráfagas de acciones/joins sin afectar el juego normal.
- [ ] Revisión de seguridad media superada (checklist de payloads y entradas saneadas).

## Definición de Hecho
- [ ] Partidas de prueba en ambas modalidades + checklist de seguridad media firmado + PR revisado.
