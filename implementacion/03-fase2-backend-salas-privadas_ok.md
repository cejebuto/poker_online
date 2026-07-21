# Fase 2 — Backend, Salas Privadas y Lobby


**Estado:** implementado — JWT, password 6 letras, lobby, privacy tests.

**Objetivo:** exponer el juego por WebSocket con **salas privadas protegidas por contraseña de 6 letras**, identidad por JWT y un lobby funcional. Aún sin correr manos completas (eso es Fase 3), pero con el ciclo crear → unir → reconectar → salir operativo.

**Depende de:** Fases 0 y 1. **App:** `apps/api`.

---

## Tareas

### 2.1 Gateway WebSocket
- [x] `[BE]` Servidor WS con "rooms" (canal por sala) y multiplexado de eventos. `M`
- [x] `[BE]` Router de eventos tipado (contratos importados de `shared`). `M`
- [x] `[BE]` Middleware de autenticación de conexión por JWT. `M`
- [x] `[BE]` Manejo de errores tipados → evento `error { code, message }`. `S`

### 2.2 Identidad y "Get User Info"
- [x] `[BE]` Alta ligera de usuario por sala: `{ displayName, avatar }`, sin cuenta. `S`
- [x] `[BE]` Emisión de JWT `{ playerId, roomId, role, seat }` firmado con `JWT_SECRET`. `M`
- [x] `[FE]` Pantalla "Get User Info" (nombre + avatar) previa a crear/unir. `M`

### 2.3 Crear sala (Host) + contraseña de 6 letras
- [x] `[BE]` `room:create { config, password }` → valida que `password` sean **6 letras** (`^[A-Za-z]{6}$`). `S`
- [x] `[BE]` Hashear la contraseña (argon2/bcrypt) y guardarla en el registro de sala; **nunca** devolverla. `S`
- [x] `[BE]` Generar `roomId`, **código corto** legible, QR y link `/join/:roomId`. `M`
- [x] `[BE]` Persistir la sala (Postgres) y estado caliente (Redis). `M`
- [x] `[FE]` UI Host: formulario de config + input de contraseña (6 letras) + pantalla con QR/link/código. `M`

### 2.4 Unirse (Cliente) — validación de contraseña
- [x] `[BE]` `room:join { roomId|code, password, user }` → verifica hash de contraseña y cupo (`maxPlayers`). `M`
- [x] `[BE]` Rechazos claros: contraseña incorrecta, sala llena, sala inexistente/cerrada. `S`
- [x] `[BE]` Asignar asiento, emitir JWT, difundir `player:joined`. `M`
- [x] `[FE]` Flujo unir: escanear QR / abrir link / ingresar código → pedir contraseña de 6 letras → entrar. `M`
- [x] `[FE]` Persistir JWT en `localStorage` (solo cambia al cambiar de sala). `S`

### 2.5 Lobby y organización
- [x] `[BE]` Estado de lobby: lista de jugadores, asientos, host. `M`
- [x] `[BE]` Acciones de host: **organizar usuarios** (reordenar asientos), expulsar jugador. `M`
- [x] `[BE]` Config editable en lobby (`room:config:update`), solo host, **en paralelo** a que se unen. `M`
- [x] `[FE]` Vista de lobby (jugadores, avatares, indicador de listo) para jugadores y host. `M`
- [x] `[BE]` Modo mesa: `mesa:attach { roomId, password }` como espectador solo-lectura. `M`

### 2.6 Salida y destrucción de sala
- [x] `[BE]` `player:leave` → liberar asiento, difundir salida. `S`
- [x] `[BE]` Si **todos** salen → destruir sala tras *grace period*, persistiendo primero. `M`

---

## Criterios de aceptación

- [x] Crear sala exige contraseña de exactamente 6 letras; otra longitud o con dígitos/símbolos se rechaza con mensaje claro.
- [x] Unirse con contraseña correcta entra al lobby; con contraseña incorrecta se rechaza y no revela nada de la sala.
- [x] La contraseña se guarda **hasheada**; no aparece en respuestas, logs, ni en el estado enviado a clientes (verificado por test).
- [x] Un segundo dispositivo escanea el QR / usa el código, pone la contraseña y aparece en el lobby en tiempo real para todos.
- [x] El JWT permite recargar la página y volver al lobby sin volver a introducir datos (mientras la sala exista).
- [x] El host puede reordenar asientos y expulsar; los cambios se reflejan en todos los clientes al instante.
- [x] El "modo mesa" entra como espectador y **no** recibe cartas privadas (aún no hay, pero el canal está segregado).
- [x] Al salir todos, la sala se destruye tras el grace period y su estado queda persistido en el historial.

## Definición de Hecho
- [x] Tests de integración del ciclo crear/unir/reconectar/salir en verde + `docker compose up` levanta api+web+db+redis y el flujo funciona end-to-end manualmente + PR revisado.
