# Plan de Implementación — Poker con Amigos

Guía de **0 a 100** para construir la app. Cada documento es una **fase** con objetivo, tareas detalladas (checklist) y **criterios de aceptación**. Las fases se implementan en orden; cada una depende de la anterior.

> Documento base del producto: [`../spec.md`](../spec.md). Este plan **implementa** ese spec, incorporando además los ajustes nuevos: dockerización, salas privadas con contraseña de 6 letras, cartas comunitarias visibles también en el teléfono (más pequeñas), seguridad media (es un concepto), y sistema de cartas SVG reusable con temas intercambiables.

---

## Índice de fases

| Doc | Fase | Entregable |
|-----|------|-----------|
| [`00-fundamentos-y-arquitectura_ok.md`](./00-fundamentos-y-arquitectura_ok.md) ✅ | Fundamentos | Estructura del monorepo, convenciones de código limpio, sistema de temas de cartas, criterios transversales. |
| [`01-fase0-setup-docker_ok.md`](./01-fase0-setup-docker_ok.md) ✅ | Fase 0 | Scaffolding + Docker + docker-compose (Postgres, Redis) + CI. |
| [`02-fase1-core-engine.md`](./02-fase1-core-engine.md) | Fase 1 | Motor de poker puro (mazo, evaluador, apuestas, side pots) con tests. |
| [`03-fase2-backend-salas-privadas.md`](./03-fase2-backend-salas-privadas.md) | Fase 2 | Backend WebSocket, salas privadas (password 6 letras), JWT, lobby. |
| [`04-fase3-flujo-mano-protocolo.md`](./04-fase3-flujo-mano-protocolo.md) | Fase 3 | Máquina de estados de la mano en el servidor + protocolo WS completo. |
| [`05-fase4-frontend-cartas-svg.md`](./05-fase4-frontend-cartas-svg.md) | Fase 4 | Frontend jugador + mesa, sistema de cartas SVG reusable con temas. |
| [`06-fase5-fichas-ux.md`](./06-fase5-fichas-ux.md) | Fase 5 | Las 4 formas de apostar, fichas isométricas + barras, orientación. |
| [`07-fase6-probabilidad.md`](./07-fase6-probabilidad.md) | Fase 6 | Motor Monte Carlo de probabilidad en el cliente (Web Worker). |
| [`08-fase7-resiliencia-persistencia.md`](./08-fase7-resiliencia-persistencia.md) | Fase 7 | Event sourcing, reconexión con JWT, timers/time bank, colas. |
| [`09-fase8-modalidades-seguridad.md`](./09-fase8-modalidades-seguridad.md) | Fase 8 | Cash game / torneo configurable + endurecimiento de seguridad media. |
| [`10-fase9-qa-despliegue.md`](./10-fase9-qa-despliegue.md) | Fase 9 | Pruebas e2e, criterios de aceptación finales, despliegue dockerizado. |

---

## Cómo usar este plan

1. Lee siempre primero [`00-fundamentos-y-arquitectura_ok.md`](./00-fundamentos-y-arquitectura_ok.md): define estructura de carpetas y convenciones que aplican a **todas** las fases.
2. Trabaja una fase a la vez. No pases a la siguiente hasta cumplir **todos** sus criterios de aceptación.
3. Cada tarea usa checkboxes `- [ ]`. Márcalas al completar.
4. Cada fase termina con una **Definición de Hecho (DoD)** común: código formateado + lint sin errores + tests de la fase en verde + `docker compose up` levanta todo + PR revisado.
5. Al completar una fase, renombrar el doc a `*_ok.md` (ej. `02-fase1-core-engine_ok.md`) para marcar el avance.

---

## Convenciones de las tareas

- **`[BE]`** backend · **`[FE]`** frontend · **`[ENG]`** motor de poker (paquete compartido) · **`[INFRA]`** Docker/CI/DB · **`[QA]`** pruebas.
- **Estimación relativa:** `S` (horas), `M` (1-2 días), `L` (3+ días). Orientativa.
- Cada criterio de aceptación es **verificable** (test automatizado, comando, o comprobación manual concreta).

---

## Resumen de decisiones que guían la implementación

- **Juego:** Texas Hold'em No-Limit. Cash game y torneo configurables.
- **Arquitectura:** backend autoritativo (Node + TypeScript), WebSocket, Redis (estado caliente), Postgres (event store), colas (BullMQ).
- **Salas privadas:** unirse requiere código de sala + **contraseña de 6 letras**.
- **Cartas:** 100% digitales. El teléfono muestra las 2 cartas propias grandes **y las 5 comunitarias en pequeño**; la Mesa las muestra grandes.
- **Cartas SVG:** tema por defecto en SVG simple y reusable, con **sistema de temas intercambiables** (el usuario puede cargar sus propios modelos).
- **Probabilidad:** Monte Carlo en el cliente, solo con las cartas propias.
- **Seguridad:** nivel **medio** (es un concepto); prioriza no filtrar cartas y validación de acciones, sin sobre-ingeniería.
- **Todo dockerizado** desde la Fase 0.
- **Código limpio y escalable:** capas separadas, dominio puro sin dependencias de framework, tipos compartidos.
