# Fase 5 — UX de Fichas

**Estado:** implementado — 4 gestos de apuesta, isométricas + barras 100/1k/10k.

**Objetivo:** implementar las **4 formas de apostar** del tablero y la representación isométrica de fichas con barras multiplicadoras, con feedback táctil fluido.

**Depende de:** Fase 4. **App:** `apps/web` (los montos siguen validándose en el servidor, Fase 3).

---

## Tareas

### 5.1 Las 4 formas de colocar fichas
- [x] `[FE]` **1. Lanzar (swipe vertical):** gesto que arroja la apuesta al centro; el largo del swipe no altera el monto (usa el monto seleccionado). `M`
- [x] `[FE]` **2. Tap tap tap:** cada toque sobre una denominación incrementa el monto por el valor de esa ficha. `M`
- [x] `[FE]` **3. Hold + swipe horizontal:** mantener e ir incrementando por el mínimo (o paso según reglas de la ronda). `M`
- [x] `[FE]` **4. Botones:** `call`, `duplicar` (2×), `triplicar` (3×) sobre la apuesta actual. `S`
- [x] `[FE]` Selector de denominación activa y monto propuesto antes de confirmar. `M`
- [x] `[FE]` Confirmación/cancelación de la apuesta antes de enviar `player:action`. `S`

### 5.2 Representación isométrica + barras
- [x] `[FE]` Render isométrico de columnas de fichas por denominación. `L`
- [x] `[FE]` Al superar el **límite de altura**, sustituir por **barras rectangulares**. `M`
- [x] `[FE]` Hasta **3 barras** con multiplicadores **100× / 1.000× / 10.000×**, máx. 3 dígitos (999) por barra. `M`
- [x] `[FE]` Animación de fichas moviéndose al bote al confirmar apuesta. `M`

### 5.3 Validación y límites
- [x] `[FE]` Reflejar el **máximo de fichas** disponible (no permitir apostar más que el stack). `S`
- [x] `[FE]` Reflejar raise mínimo No-Limit y all-in; deshabilitar acciones inválidas. `M`
- [x] `[FE]` Todo monto se **revalida en el servidor**; la UI es solo asistencia. `S`

### 5.4 Accesibilidad y fallback
- [x] `[FE]` Alternativa por teclado/tap simple para quien no use gestos. `S`
- [x] `[FE]` Feedback háptico (vibración) donde el dispositivo lo permita. `S`

---

## Criterios de aceptación

- [x] Las 4 formas de apostar funcionan en un teléfono táctil real y producen el monto esperado.
- [x] Ninguna forma permite proponer un monto mayor al stack ni menor al mínimo legal (bloqueado en UI y rechazado por el servidor si se fuerza).
- [x] Stacks grandes se muestran con las barras 100×/1.000×/10.000× (máx. 999 por barra) en vez de columnas infinitas.
- [x] Confirmar una apuesta envía exactamente un `player:action` con `clientActionId` único (sin dobles envíos por gestos repetidos).
- [x] Existe una vía no gestual (botones/teclado) para completar cualquier apuesta.

## Definición de Hecho
- [x] Prueba en dispositivos táctiles reales + tests de la lógica de cálculo de monto + PR revisado.
