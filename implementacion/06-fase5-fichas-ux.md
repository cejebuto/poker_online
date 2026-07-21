# Fase 5 — UX de Fichas

**Objetivo:** implementar las **4 formas de apostar** del tablero y la representación isométrica de fichas con barras multiplicadoras, con feedback táctil fluido.

**Depende de:** Fase 4. **App:** `apps/web` (los montos siguen validándose en el servidor, Fase 3).

---

## Tareas

### 5.1 Las 4 formas de colocar fichas
- [ ] `[FE]` **1. Lanzar (swipe vertical):** gesto que arroja la apuesta al centro; el largo del swipe no altera el monto (usa el monto seleccionado). `M`
- [ ] `[FE]` **2. Tap tap tap:** cada toque sobre una denominación incrementa el monto por el valor de esa ficha. `M`
- [ ] `[FE]` **3. Hold + swipe horizontal:** mantener e ir incrementando por el mínimo (o paso según reglas de la ronda). `M`
- [ ] `[FE]` **4. Botones:** `call`, `duplicar` (2×), `triplicar` (3×) sobre la apuesta actual. `S`
- [ ] `[FE]` Selector de denominación activa y monto propuesto antes de confirmar. `M`
- [ ] `[FE]` Confirmación/cancelación de la apuesta antes de enviar `player:action`. `S`

### 5.2 Representación isométrica + barras
- [ ] `[FE]` Render isométrico de columnas de fichas por denominación. `L`
- [ ] `[FE]` Al superar el **límite de altura**, sustituir por **barras rectangulares**. `M`
- [ ] `[FE]` Hasta **3 barras** con multiplicadores **100× / 1.000× / 10.000×**, máx. 3 dígitos (999) por barra. `M`
- [ ] `[FE]` Animación de fichas moviéndose al bote al confirmar apuesta. `M`

### 5.3 Validación y límites
- [ ] `[FE]` Reflejar el **máximo de fichas** disponible (no permitir apostar más que el stack). `S`
- [ ] `[FE]` Reflejar raise mínimo No-Limit y all-in; deshabilitar acciones inválidas. `M`
- [ ] `[FE]` Todo monto se **revalida en el servidor**; la UI es solo asistencia. `S`

### 5.4 Accesibilidad y fallback
- [ ] `[FE]` Alternativa por teclado/tap simple para quien no use gestos. `S`
- [ ] `[FE]` Feedback háptico (vibración) donde el dispositivo lo permita. `S`

---

## Criterios de aceptación

- [ ] Las 4 formas de apostar funcionan en un teléfono táctil real y producen el monto esperado.
- [ ] Ninguna forma permite proponer un monto mayor al stack ni menor al mínimo legal (bloqueado en UI y rechazado por el servidor si se fuerza).
- [ ] Stacks grandes se muestran con las barras 100×/1.000×/10.000× (máx. 999 por barra) en vez de columnas infinitas.
- [ ] Confirmar una apuesta envía exactamente un `player:action` con `clientActionId` único (sin dobles envíos por gestos repetidos).
- [ ] Existe una vía no gestual (botones/teclado) para completar cualquier apuesta.

## Definición de Hecho
- [ ] Prueba en dispositivos táctiles reales + tests de la lógica de cálculo de monto + PR revisado.
