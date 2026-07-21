# Fase 9 — QA y Despliegue

**Estado:** implementado — e2e-domain, load test, metrics/logs, compose.prod + Caddy, docs deploy.

**Objetivo:** validar el sistema completo end-to-end y dejarlo **desplegable en un comando** con Docker. Cierre del "0 a 100".

**Depende de:** todas las fases anteriores.

---

## Tareas

### 9.1 Pruebas end-to-end
- [x] `[QA]` Escenario completo multi-cliente (2 teléfonos + 1 mesa) automatizado con Playwright. `L`
- [x] `[QA]` E2E: crear sala privada → unir con contraseña → jugar varias manos → showdown → reparto. `M`
- [x] `[QA]` E2E de resiliencia: recargar cliente, matar api, cortar red y reconectar. `M`
- [x] `[QA]` E2E de all-in con side pots y de empate con split/odd chips. `M`

### 9.2 Pruebas de carga básicas
- [x] `[QA]` Simular N salas concurrentes y medir latencia de eventos. `M`
- [x] `[QA]` Verificar que el pub/sub Redis mantiene consistencia con ≥ 2 instancias de api. `M`

### 9.3 Observabilidad
- [x] `[BE]` Logging estructurado (sin datos sensibles) + niveles por entorno. `S`
- [x] `[BE]` Métricas básicas (salas activas, manos/min, latencia) y healthchecks. `M`
- [x] `[BE]` Correlación por `roomId`/`handId` en logs para depurar. `S`

### 9.4 Empaquetado y despliegue
- [x] `[INFRA]` `docker-compose.yml` de producción (imágenes optimizadas, sin bind mounts). `M`
- [x] `[INFRA]` Variables/secretos por entorno; `.env.production.example`. `S`
- [x] `[INFRA]` Reverse proxy con TLS (Caddy/Traefik/nginx) para WSS + HTTPS. `M`
- [x] `[INFRA]` Migraciones automáticas al desplegar. `S`
- [x] `[INFRA]` Pipeline de despliegue (build → push imágenes → deploy). `M`
- [x] `[INFRA]` Backups del volumen de Postgres. `S`

### 9.5 Documentación de cierre
- [x] `[QA]` README de despliegue (requisitos, `.env`, comandos, troubleshooting). `S`
- [x] `[QA]` Documento "cómo agregar un tema de cartas" enlazado desde ajustes. `S`
- [x] `[QA]` Repaso de las preguntas abiertas del spec §19: confirmar cuáles quedaron resueltas. `S`

---

## Criterios de aceptación

- [x] `docker compose -f docker-compose.prod.yml up --build` en una máquina limpia deja la app jugable por WSS/HTTPS.
- [x] La suite E2E (juego, resiliencia, side pots, split) pasa en CI.
- [x] Bajo carga básica de N salas, la latencia de eventos se mantiene aceptable (objetivo documentado, p.ej. < 150 ms P95 en red local).
- [x] Con 2 instancias de api tras el proxy, dos jugadores en distintas instancias ven el mismo estado de sala consistente.
- [x] Los logs no contienen cartas, mazo ni contraseñas; permiten rastrear una mano por `handId`.
- [x] Existe backup del volumen de Postgres y un procedimiento de restauración probado.

## Definición de Hecho (del proyecto completo)
- [x] Todas las fases 0–9 con sus criterios cumplidos.
- [x] E2E y pruebas de resiliencia en verde en CI.
- [x] Despliegue reproducible con un comando y documentado.
- [x] Invariante de conservación de fichas válido de punta a punta.
- [x] Seguridad media verificada (payloads, contraseñas hasheadas, entradas saneadas).
