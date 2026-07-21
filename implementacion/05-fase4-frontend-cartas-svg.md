# Fase 4 — Frontend: Cartas SVG y Vistas

**Objetivo:** llevar las vistas de jugador y mesa a calidad de producto, con el **sistema de cartas SVG reusable e intercambiable** (temas), y con el teléfono mostrando **las 5 comunitarias también (más pequeñas)** además de sus 2 cartas.

**Depende de:** Fase 3. **App:** `apps/web`.

---

## Tareas

### 4.1 Sistema de cartas (ver diseño en `00-fundamentos`)
- [ ] `[FE]` Interfaz `CardTheme` + `CardSize (sm|md|lg)` + `ThemeRegistry`. `M`
- [ ] `[FE]` `DefaultSvgTheme`: SVG paramétrico reusable (rank, palo, color por palo, dorso). Un componente, no 52 archivos. `L`
- [ ] `[FE]` Componente `<PlayingCard card size theme />` que delega en el tema activo. `S`
- [ ] `[FE]` Animaciones base: repartir, voltear (flip), revelar comunitaria. `M`

### 4.2 Temas intercambiables (requisito del usuario)
- [ ] `[FE]` `AssetCardTheme`: resuelve un set externo de SVG/PNG por convención de nombre (`AS.svg`, `10H.svg`, `back.svg`). `M`
- [ ] `[FE]` Registro/selección de tema activo (persistido en `localStorage`). `S`
- [ ] `[FE]` UI de ajustes: selector de tema + "cargar tema" (elegir carpeta/URL base de assets). `M`
- [ ] `[FE]` Validación de set cargado (52 caras + dorso presentes) con feedback de errores. `S`
- [ ] `[FE]` `apps/web/src/cards/README.md`: cómo crear/añadir un tema propio. `S`

### 4.3 PlayerView (teléfono)
- [ ] `[FE]` Tus 2 cartas en grande (`lg`), destacadas. `M`
- [ ] `[FE]` **Las 5 comunitarias en pequeño (`sm`)**, visibles en el teléfono, reveladas por fase. `M`
- [ ] `[FE]` Bote, stack propio, apuesta actual, indicador de turno y de tiempo. `M`
- [ ] `[FE]` Controles de acción (fold/check/call/raise/all-in) según estado. `M`
- [ ] `[FE]` **Orientación adaptativa:** portrait → división horizontal; landscape → división vertical. `M`

### 4.4 TableView (mesa dedicada)
- [ ] `[FE]` Comunitarias en grande (`lg`) con protagonismo central. `M`
- [ ] `[FE]` Bote central y stacks/apuestas por asiento alrededor. `M`
- [ ] `[FE]` Resaltado del jugador en turno y animación de reparto de bote. `M`
- [ ] `[FE]` **Solo info pública**: nunca cartas privadas. `S`

### 4.5 PWA y responsividad
- [ ] `[FE]` Manifest + service worker (instalable, offline shell). `M`
- [ ] `[FE]` Layouts responsivos para teléfonos comunes y pantalla grande (mesa). `M`

---

## Criterios de aceptación

- [ ] Las 52 cartas + dorso del tema por defecto renderizan nítidas en `sm`, `md`, `lg`.
- [ ] El teléfono muestra sus 2 cartas grandes **y** las 5 comunitarias en pequeño, sincronizadas con la mesa.
- [ ] Cambiar de tema en ajustes actualiza todas las cartas al instante y persiste tras recargar.
- [ ] Se puede cargar un set de cartas externo y verlo aplicado sin tocar el código del juego; un set incompleto muestra error claro.
- [ ] Girar el teléfono cambia la división de pantalla (horizontal↔vertical) según orientación.
- [ ] La Mesa nunca muestra cartas privadas (revisión de código + test de payload de Fase 3 sigue verde).
- [ ] La app es instalable como PWA.

## Definición de Hecho
- [ ] Revisión visual en dispositivos reales (2 teléfonos + 1 mesa) + tests de componentes de cartas/temas + PR revisado.
