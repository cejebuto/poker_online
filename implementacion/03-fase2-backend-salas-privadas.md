# Fase 2 — Backend, Salas Privadas y Lobby

**Objetivo:** exponer el juego por WebSocket con **salas privadas protegidas por contraseña de 6 letras**, identidad por JWT y un lobby funcional. Aún sin correr manos completas (eso es Fase 3), pero con el ciclo crear → unir → reconectar → salir operativo.

**Depende de:** Fases 0 y 1. **App:** `apps/api`.

---

## Tareas

### 2.1 Gateway WebSocket
- [ ] `[BE]` Servidor WS con "rooms" (canal por sala) y multiplexado de eventos. `M`
- [ ] `[BE]` Router de eventos tipado (contratos importados de `shared`). `M`
- [ ] `[BE]` Middleware de autenticación de conexión por JWT. `M`
- [ ] `[BE]` Manejo de errores tipados → evento `error { code, message }`. `S`

### 2.2 Identidad y "Get User Info"
- [ ] `[BE]` Alta ligera de usuario por sala: `{ displayName, avatar }`, sin cuenta. `S`
- [ ] `[BE]` Emisión de JWT `{ playerId, roomId, role, seat }` firmado con `JWT_SECRET`. `M`
- [ ] `[FE]` Pantalla "Get User Info" (nombre + avatar) previa a crear/unir. `M`

### 2.3 Crear sala (Host) + contraseña de 6 letras
- [ ] `[BE]` `room:create { config, password }` → valida que `password` sean **6 letras** (`^[A-Za-z]{6}$`). `S`
- [ ] `[BE]` Hashear la contraseña (argon2/bcrypt) y guardarla en el registro de sala; **nunca** devolverla. `S`
- [ ] `[BE]` Generar `roomId`, **código corto** legible, QR y link `/join/:roomId`. `M`
- [ ] `[BE]` Persistir la sala (Postgres) y estado caliente (Redis). `M`
- [ ] `[FE]` UI Host: formulario de config + input de contraseña (6 letras) + pantalla con QR/link/código. `M`

### 2.4 Unirse (Cliente) — validación de contraseña
- [ ] `[BE]` `room:join { roomId|code, password, user }` → verifica hash de contraseña y cupo (`maxPlayers`). `M`
- [ ] `[BE]` Rechazos claros: contraseña incorrecta, sala llena, sala inexistente/cerrada. `S`
- [ ] `[BE]` Asignar asiento, emitir JWT, difundir `player:joined`. `M`
- [ ] `[FE]` Flujo unir: escanear QR / abrir link / ingresar código → pedir contraseña de 6 letras → entrar. `M`
- [ ] `[FE]` Persistir JWT en `localStorage` (solo cambia al cambiar de sala). `S`

### 2.5 Lobby y organización
- [ ] `[BE]` Estado de lobby: lista de jugadores, asientos, host. `M`
- [ ] `[BE]` Acciones de host: **organizar usuarios** (reordenar asientos), expulsar jugador. `M`
- [ ] `[BE]` Config editable en lobby (`room:config:update`), solo host, **en paralelo** a que se unen. `M`
- [ ] `[FE]` Vista de lobby (jugadores, avatares, indicador de listo) para jugadores y host. `M`
- [ ] `[BE]` Modo mesa: `mesa:attach { roomId, password }` como espectador solo-lectura. `M`

### 2.6 Salida y destrucción de sala
- [ ] `[BE]` `player:leave` → liberar asiento, difundir salida. `S`
- [ ] `[BE]` Si **todos** salen → destruir sala tras *grace period*, persistiendo primero. `M`

---

## Criterios de aceptación

- [ ] Crear sala exige contraseña de exactamente 6 letras; otra longitud o con dígitos/símbolos se rechaza con mensaje claro.
- [ ] Unirse con contraseña correcta entra al lobby; con contraseña incorrecta se rechaza y no revela nada de la sala.
- [ ] La contraseña se guarda **hasheada**; no aparece en respuestas, logs, ni en el estado enviado a clientes (verificado por test).
- [ ] Un segundo dispositivo escanea el QR / usa el código, pone la contraseña y aparece en el lobby en tiempo real para todos.
- [ ] El JWT permite recargar la página y volver al lobby sin volver a introducir datos (mientras la sala exista).
- [ ] El host puede reordenar asientos y expulsar; los cambios se reflejan en todos los clientes al instante.
- [ ] El "modo mesa" entra como espectador y **no** recibe cartas privadas (aún no hay, pero el canal está segregado).
- [ ] Al salir todos, la sala se destruye tras el grace period y su estado queda persistido en el historial.

## Definición de Hecho
- [ ] Tests de integración del ciclo crear/unir/reconectar/salir en verde + `docker compose up` levanta api+web+db+redis y el flujo funciona end-to-end manualmente + PR revisado.
