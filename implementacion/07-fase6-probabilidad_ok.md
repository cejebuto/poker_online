# Fase 6 — Motor de Probabilidad (cliente)

**Estado:** implementado — Monte Carlo en Web Worker, toggle UI, tests vs exact river.

**Objetivo:** que cada teléfono estime su **probabilidad de victoria** con Monte Carlo, usando **solo sus 2 cartas** + comunitarias visibles, sin cargar el servidor ni filtrar información ajena.

**Depende de:** Fases 1 (reutiliza el evaluador del `engine`) y 4. **App:** `apps/web` + `packages/engine`.

---

## Tareas

### 6.1 Reutilizar el evaluador en el cliente
- [x] `[ENG]` Asegurar que el evaluador del `engine` es importable y ejecutable en el navegador (sin deps de Node). `S`
- [x] `[FE]` Empaquetar el evaluador dentro de un **Web Worker**. `M`

### 6.2 Simulación Monte Carlo
- [x] `[FE]` Dado `{ misCartas, comunitariasVisibles, nRivales }`, simular N repartos aleatorios de lo desconocido. `L`
- [x] `[FE]` Contar victorias/empates/derrotas y devolver `%victoria` y `%empate`. `M`
- [x] `[FE]` **N adaptativo por fase:** más iteraciones pre-flop, menos en turn/river (casi determinista). `M`
- [x] `[FE]` Cancelar/relanzar la simulación cuando cambia el estado (nueva calle, cambia nº de activos). `M`

### 6.3 Integración en la UI
- [x] `[FE]` Mostrar el porcentaje en PlayerView, actualizado por calle, sin bloquear la interfaz. `M`
- [x] `[FE]` Toggle para activar/desactivar el cálculo (algunos preferirán jugar "a ciegas"). `S`
- [x] `[FE]` Indicador de "calculando…" mientras corre el worker. `S`

### 6.4 Rendimiento y correctitud
- [x] `[QA]` Comparar Monte Carlo vs enumeración exacta en escenarios post-flop pequeños (tolerancia estadística). `M`
- [x] `[QA]` Medir tiempo de cálculo en un teléfono de gama media; ajustar N para < ~300 ms percibidos. `M`

---

## Criterios de aceptación

- [x] El cálculo usa **solo** las cartas del propio jugador; nunca recibe ni infiere cartas de rivales.
- [x] El porcentaje se actualiza al revelarse flop, turn y river y refleja el nº de jugadores aún activos.
- [x] En escenarios post-flop verificables, el resultado Monte Carlo cae dentro de la tolerancia respecto al cálculo exacto (p.ej. ±1–2 %).
- [x] La simulación corre en un Web Worker: la UI no se congela durante el cálculo.
- [x] El toggle oculta/muestra el cálculo y su estado persiste entre manos.
- [x] El servidor no participa en el cálculo (verificado: no hay evento de red asociado a la probabilidad).

## Definición de Hecho
- [x] Benchmark de rendimiento documentado + tests de precisión estadística + PR revisado.
