# Fase 1 — Motor de Poker (engine puro)

**Objetivo:** implementar todas las reglas de Texas Hold'em No-Limit como **código puro y testeado**, sin red ni DB. Es el corazón correcto del juego; el resto solo lo orquesta.

**Depende de:** Fase 0. **Paquete:** `packages/engine`.

---

## Tareas

### 1.1 Cartas y mazo
- [ ] `[ENG]` Tipos `Card`, `Rank`, `Suit` (en `shared`). `S`
- [ ] `[ENG]` Generar mazo de 52 cartas. `S`
- [ ] `[ENG]` Barajado Fisher–Yates con RNG **inyectable** (crypto en prod, seed en tests). `S`
- [ ] `[ENG]` Repartir: 2 cartas privadas por asiento + 5 comunitarias, con quema opcional configurable. `S`

### 1.2 Evaluador de manos
- [ ] `[ENG]` Evaluar la mejor mano de 5 entre 7 cartas (2 privadas + 5 comunitarias). `L`
- [ ] `[ENG]` Ranking completo: carta alta, par, doble par, trío, escalera, color, full, póker, escalera de color, escalera real. `M`
- [ ] `[ENG]` Comparador que devuelve ganador(es) y detecta **empates exactos** (misma mano). `M`
- [ ] `[ENG]` (Opción) usar librería probada como referencia para tests cruzados. `S`

### 1.3 Rondas de apuesta
- [ ] `[ENG]` Modelo de acción: `fold | check | call | bet | raise | all-in`. `S`
- [ ] `[ENG]` Validación No-Limit: turno correcto, monto legal, raise mínimo = último bet/raise, tope = stack. `M`
- [ ] `[ENG]` Detección de fin de ronda (todos igualaron o están all-in/folded). `M`
- [ ] `[ENG]` Rotación de acción y de dealer button; blinds (incl. caso heads-up). `M`
- [ ] `[ENG]` Regla del tablero: **fold siempre disponible** en cualquier ronda hasta el river. `S`

### 1.4 Botes y side pots
- [ ] `[ENG]` Construcción de bote principal + **side pots** por niveles de all-in. `L`
- [ ] `[ENG]` Adjudicación por bote a la mejor mano **entre sus elegibles**. `M`
- [ ] `[ENG]` **Split** entre empatados + reparto de *odd chips* (primero desde el button). `M`

### 1.5 Máquina de estados de la mano (pura)
- [ ] `[ENG]` `HandState` inmutable + transiciones `DEALING → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → PAYOUT → COMPLETE`. `L`
- [ ] `[ENG]` `applyAction(state, action) -> { state, events }` (puro, determinista con RNG inyectado). `L`
- [ ] `[ENG]` Emisión de **eventos de dominio** por transición (para event sourcing en Fase 7). `M`
- [ ] `[ENG]` Caso "todos foldean menos uno": gana sin showdown, sin revelar. `S`

### 1.6 Tests
- [ ] `[QA]` Tests unitarios del evaluador con casos conocidos + comparación cruzada. `M`
- [ ] `[QA]` Tests de side pots (los ejemplos del spec §9.3) y de splits/odd chips. `M`
- [ ] `[QA]` Tests de flujos completos de mano deterministas (RNG con seed). `M`
- [ ] `[QA]` Property-based tests: invariantes (suma de fichas constante, botes no negativos). `M`

---

## Criterios de aceptación

- [ ] El evaluador acierta el 100 % de una batería de manos de referencia (incluye todos los rankings y desempates por kicker).
- [ ] Ejemplo del spec verificado por test: A all-in 100, B y C apuestan 300 → bote principal 300 (elegibles A/B/C) + side pot 400 (elegibles B/C), adjudicados por separado.
- [ ] Empate: bote de 300 entre 2 ganadores → 150 y 150; con odd chip, la ficha sobrante va al más cercano al button.
- [ ] **Invariante de conservación:** en toda mano, `Σ stacks iniciales == Σ stacks finales` (nunca se crean ni destruyen fichas).
- [ ] `applyAction` es determinista: mismo estado + misma acción + mismo seed → mismo resultado (idempotencia de cálculo).
- [ ] El `engine` no importa red/DB/framework; cobertura ≥ 85 %.

## Definición de Hecho
- [ ] Suite del engine 100 % en verde en CI + cobertura cumplida + PR revisado.
