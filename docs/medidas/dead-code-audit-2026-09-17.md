# Auditoría de código muerto · 17 septiembre 2026

Base examinada inicialmente: `f0b112f`; limpieza y verificación final sobre
`d508e60` (`main`) después de los cambios concurrentes de UI-V7. La limpieza
no modificó esos cambios.

## Alcance y método

Se revisaron los 362 ficheros TypeScript, JavaScript, MJS y Python del árbol,
los puntos de entrada de `package.json`, las configuraciones de Vite, Vitest y
Playwright, los HTML que cargan módulos y los hooks de `.claude/settings.json`.

Comprobaciones ejecutadas:

- `npm run typecheck`: verde. El proyecto ya activa `noUnusedLocals` y
  `noUnusedParameters`.
- `npm run lint`: verde.
- `npm run build`: verde.
- `tsc --allowUnreachableCode false --allowUnusedLabels false`: verde; no se
  encontró ninguna sentencia inalcanzable ni etiqueta sin uso.
- Knip 6.36.0, contrastado después con búsquedas de cada símbolo y cada fichero.
  No informó dependencias o importaciones sin resolver.

Knip no conoce por sí solo los comandos manuales, módulos cargados desde HTML,
service workers ni hooks. Por eso ningún resultado se considera muerto hasta
comprobar también esos caminos.

## Resultado de la limpieza

- Se eliminó el módulo muerto `src/ui/icons.ts` y se corrigió el comentario
  obsoleto que todavía lo describía como vivo.
- Se eliminaron el alias ejecutable `GREET_COOLDOWN_SPAN` y el tipo totalmente
  huérfano `BeastSighting`.
- Se cerraron 78 exportaciones de valor o función que sólo se consumían dentro
  de su propio módulo, sin borrar su lógica.
- Se cerraron 34 exportaciones de tipo que sólo formaban parte de la
  implementación interna.
- Se corrigieron dos resultados del análisis inicial: `RecipeClip` sí tiene un
  consumidor en `tools/graphics/animation-audit.ts`, mientras que `build` se
  usa dentro del banco de catálogo pero no debe exportarse.
- La repetición final de Knip no deja código muerto confirmado: sólo enumera
  puntos de entrada manuales o configurados, `canQuarry` y `woodCostOf`
  consumidos por `tools/reports/works-report.ts`, y `RecipeClip`, consumido por la
  auditoría de animaciones.

La suite completa ejecutó 1.330 pruebas: pasaron 1.327 y fallaron tres
comprobaciones de comportamiento ajenas a esta limpieza (`graphics-clock`,
`life-staging` y `ui-milestones`). Las modificaciones de esta limpieza son
eliminaciones de símbolos sin lectores y cambios de visibilidad; no alteran los
valores comprobados por esos tres tests.

## Código muerto confirmado y eliminado

### 1. Módulo completo de iconos HTML antiguo

`src/ui/icons.ts` no tenía ningún importador. Sus únicas
salidas son `VITAL_ICONS` (línea 29) y `NAV_ICONS` (línea 72), y el módulo no
tiene efectos laterales. La interfaz actual usa el sprite incrustado en
`index.html` mediante `<use href="#id">`.

La propia cabecera de [`src/ui/redesign/shell.ts`](../src/ui/redesign/shell.ts#L21)
documenta la sustitución por `public/ui/icons.svg`, aunque conserva una frase
obsoleta en las líneas 24–26 que llama «vivo» a `NAV_ICONS`. Una búsqueda global
de `VITAL_ICONS` y `NAV_ICONS` sólo devuelve el módulo, esa explicación y la
documentación histórica. Es código muerto completo, no sólo una exportación
sobrante. Al no estar importado, el bundler ya lo deja fuera del artefacto.

### 2. Alias de tiempo de saludo sin lectores

`GREET_COOLDOWN_SPAN` se limitaba a copiar
`GREET_COOLDOWN` y no tiene ninguna lectura en código, pruebas, herramientas o
documentación. No participa en el comportamiento de las escenas y es código
ejecutable muerto.

## API muerta corregida: lógica viva antes exportada sin consumidores

Los símbolos de esta sección sí se usan dentro del fichero que los declara; lo
muerto es su exposición pública. Quitar únicamente `export` no cambia el juego,
pero reduce contratos falsos y permite que futuras herramientas detecten cuándo
la implementación interna deja de usarse de verdad.

### Motor y catálogo de encrucijadas

| Fichero | Exportaciones sin consumidor externo |
|---|---|
| [`src/engine/balance.ts`](../src/engine/balance.ts#L964) | `TRAIT_WEIGHT_ROLE` |
| [`src/engine/crossroads/select.ts`](../src/engine/crossroads/select.ts#L24) | `FALLBACK_ID`, `leaderVacantSince` (52), `isTrade` (87) |
| [`src/engine/crossroads/catalog/index.ts`](../src/engine/crossroads/catalog/index.ts#L54) | `FAITH_TEMPLATES`, `FAMINE_TEMPLATES`, `FEUD_TEMPLATES`, `FOREST_TEMPLATES`, `LORD_TEMPLATES`, `PLAGUE_TEMPLATES`, `RESERVE_TEMPLATES`, `STRANGER_TEMPLATES`, `SUCCESSION_TEMPLATES` |
| [`src/engine/crossroads/catalog/plague.ts`](../src/engine/crossroads/catalog/plague.ts#L9) | `PLAGUE_PIT` |
| [`src/engine/crossroads/catalog/feud.ts`](../src/engine/crossroads/catalog/feud.ts#L122) | `FEUD_INHERITED` |
| [`src/engine/crossroads/catalog/faith.ts`](../src/engine/crossroads/catalog/faith.ts#L6) | `CHAPEL_OR_GRANARY`, `RELIC_PEDLAR` (75) |
| [`src/engine/crossroads/catalog/famine.ts`](../src/engine/crossroads/catalog/famine.ts#L12) | `HUNGRY_SPRING`, `GRANARY_THEFT` (77) |
| [`src/engine/crossroads/catalog/forest.ts`](../src/engine/crossroads/catalog/forest.ts#L14) | `FOREST_CUT`, `WOLF_WINTER` (107) |
| [`src/engine/crossroads/catalog/lord.ts`](../src/engine/crossroads/catalog/lord.ts#L15) | `WINTER_GRAIN_DEBT`, `TITHE_DEMAND` (115) |
| [`src/engine/crossroads/catalog/reserve.ts`](../src/engine/crossroads/catalog/reserve.ts#L16) | `QUIET_YEARS` |
| [`src/engine/crossroads/catalog/stranger.ts`](../src/engine/crossroads/catalog/stranger.ts#L6) | `STRANGERS_AT_THE_FORD`, `BANDITS` (96) |
| [`src/engine/crossroads/catalog/trade.ts`](../src/engine/crossroads/catalog/trade.ts#L22) | `CATTLE_DROVER`, `SALT_CARRIER` (88), `GRAIN_FACTOR` (161) |
| [`src/engine/crossroads/catalog/succession.ts`](../src/engine/crossroads/catalog/succession.ts#L13) | `SUCCESSION`, `FIRST_STONE` (119) |
| [`src/engine/world/paths.ts`](../src/engine/world/paths.ts#L106) | `invalidateRoutes` |
| [`src/engine/world/sky.ts`](../src/engine/world/sky.ts#L68) | `skiesOfWeek` |
| [`src/engine/world/placement.ts`](../src/engine/world/placement.ts#L8) | `overlaps` |

### Vida y render 3D

| Fichero | Exportaciones sin consumidor externo |
|---|---|
| [`src/render3d/world/buildings.ts`](../src/render3d/world/buildings.ts#L200) | `buildBuilding` |
| [`src/render3d/world/defences.ts`](../src/render3d/world/defences.ts#L12) | `isDefence` |
| [`src/render3d/world/models.ts`](../src/render3d/world/models.ts#L98) | `CHILD_UNDER`, `ELDER_OVER` |
| [`src/render3d/camera.ts`](../src/render3d/camera.ts#L24) | `VIEW` |
| [`src/render3d/life/village.ts`](../src/render3d/life/village.ts#L293) | `actorOf` |
| [`src/render3d/life/body.ts`](../src/render3d/life/body.ts#L138) | `TURN_RATE` |
| [`src/render3d/life/commitments.ts`](../src/render3d/life/commitments.ts#L56) | `sameActor` |
| [`src/render3d/life/decide.ts`](../src/render3d/life/decide.ts#L57) | `JOURNEY_SLACK`, `JOURNEY_GRACE_STEPS`, `SEAT_DWELL` (293) |
| [`src/render3d/life/offers.ts`](../src/render3d/life/offers.ts#L404) | `PARCEL_REACH`, `parcelSeats` (406), `seatsOn` (429) |
| [`src/render3d/life/beasts.ts`](../src/render3d/life/beasts.ts#L452) | `driftBeast` |
| [`src/render3d/life/wildlife.ts`](../src/render3d/life/wildlife.ts#L58) | `WOLF_ID` |
| [`src/render3d/life/props.ts`](../src/render3d/life/props.ts#L111) | `standable`, `standableNear` (137), `GRAVITY` (285), `ROLL_DRAG` (288) |
| [`src/render3d/effects/daylight.ts`](../src/render3d/effects/daylight.ts#L284) | reexportaciones `DAWN`, `DUSK`, `LIGHT_STEADY`, `STEADY_PHASE` y `hourAt` (285). Los consumidores vigentes importan los hitos desde `day-phases.ts`. |

### Render Canvas, UI y herramientas

| Fichero | Exportaciones sin consumidor externo |
|---|---|
| [`src/render/canvas.ts`](../src/render/canvas.ts#L20) | `makeBackground` |
| [`src/render/sprites/index.ts`](../src/render/sprites/index.ts#L40) | `house`, `stoneHouse` (49), `field` (51), `granary` (62), `chapel` (71), `church` (79), `smithy` (86), `mill` (94), `well` (101), `palisade` (107), `wall` (113), `watchtower` (118), `graveYard` (123) |
| [`src/ui/screens/title.ts`](../src/ui/screens/title.ts#L218) | `devPreference`, `setDevPreference` (222), `rollSeed` (229) |
| [`tools/art/glb.ts`](../tools/art/glb.ts#L47) | `inspectGlb` |
| [`tests/helpers/catalogue-bench.ts`](../tests/helpers/catalogue-bench.ts#L167) | `build` |

En total eran **79 exportaciones de valor o función** sin consumidor externo.
Se eliminó `GREET_COOLDOWN_SPAN`; las otras 78 conservan su lógica interna sin
seguir formando parte de la API pública.

## Tipos exportados sin consumidor corregidos

El análisis inicial señaló 36 tipos. La revisión de los consumidores corrigió
un falso positivo (`RecipeClip`), eliminó un tipo completamente huérfano
(`BeastSighting`) e hizo internos los 34 restantes. El hallazgo era API pública
ficticia, no coste de ejecución:

| Fichero | Tipos |
|---|---|
| [`src/render3d/camera.ts`](../src/render3d/camera.ts#L49) | `Angles`, `Bounds` (84), `Viewport` (91), `View` (103) |
| [`src/render3d/life/village.ts`](../src/render3d/life/village.ts#L178) | `PassRecord` |
| [`src/render3d/life/commitments.ts`](../src/render3d/life/commitments.ts#L81) | `Commitment` |
| `src/render3d/life/beasts.ts` | `BeastSighting` (eliminado por completo) |
| [`src/render3d/life/scenes.ts`](../src/render3d/life/scenes.ts#L30) | `SceneKind` |
| [`src/render3d/life/wildlife.ts`](../src/render3d/life/wildlife.ts#L178) | `WolfPhase` |
| [`src/engine/sim.ts`](../src/engine/sim.ts#L166) | `PositionedVisualEffect` |
| [`src/render3d/renderer.ts`](../src/render3d/renderer.ts#L1118) | `LifeSnapshot` |
| [`tools/art/schema.ts`](../tools/art/schema.ts#L3) | `ArtMaterial`, `CubePrimitive` (19), `ConePrimitive` (24), `CylinderPrimitive` (32), `GablePrimitive` (39), `SpherePrimitive` (46), `ArtPrimitive` (53), `ArtGroup` (55), `RecipeClipKey` (382), `RecipeClipMove` (383), `RecipeClipTrack` (384), `RecipeBone` (398), `RecipeHinge` (413), `RecipeGait` (418), `RecipeRig` (419). `RecipeClip` se conserva exportado porque lo consume la auditoría de animaciones. |
| [`src/engine/crossroads/schema.ts`](../src/engine/crossroads/schema.ts#L56) | `CrossroadOption`, `SeedSpec` (140) |
| [`src/engine/chronicle/digest.ts`](../src/engine/chronicle/digest.ts#L36) | `DigestSummary` |
| [`src/render3d/presentation-clock.ts`](../src/render3d/presentation-clock.ts#L132) | `ClockInput` |
| [`src/ui/milestones.ts`](../src/ui/milestones.ts#L20) | `MilestoneKind` |
| [`src/render3d/assets.ts`](../src/render3d/assets.ts#L19) | `AssetMotion`, `AssetEntry` (27) |
| [`src/ui/backend.ts`](../src/ui/backend.ts#L22) | `ValleyBackend` |
| [`src/ui/person-card.ts`](../src/ui/person-card.ts#L32) | `CardFace` |

## Candidato conservado

[`tools/art/lots/animals-g23.mjs`](../tools/art/lots/animals-g23.mjs) no aparece
en `package.json`, configuración, documentación ni otro código. Es un script de
autoría de una sola ronda que reescribe las recetas de seis animales. La
cabecera lo presenta como autoría reproducible. Se conserva como procedencia y
fuente regenerable de los GLB; no hay evidencia suficiente para borrarlo.

## Resultados de Knip que no son código muerto

- [`public/sw.js`](../public/sw.js) se registra por URL desde
  [`src/ui/pwa.ts`](../src/ui/pwa.ts#L20); no necesita import.
- `tools/*.shots.ts` y `tools/*.pwa.ts` los descubre Playwright mediante los
  patrones `*.shots.ts` y `*.pwa.ts` de sus configuraciones.
- `tools/pwa/subpath-server.mjs` y `tools/pwa/stale-server.mjs` son servidores declarados
  en `playwright.pwa.config.ts`.
- `.claude/hooks/route-agent.mjs` y `guard-subagent.mjs` están registrados en
  `.claude/settings.json`.
- `tools/graphics/bench.ts` y `viewer.ts` se cargan desde sus HTML;
  `animals-preview.ts` lo empaqueta `animals-preview.mjs`.
- Los informes `fate`, `founding`, `life`, `life-species`, `life-traits`,
  `notice`, `sky` y `works`, y las herramientas gráficas `doctor`, `capture`,
  `animation-audit`, `benchmark`, `film`, `observe-life`, `day-report`,
  `sound-check`, `thunder-check` y `g20-check` son comandos manuales documentados
  o contienen su propia invocación. No tener un importador es normal en un CLI.
- `tools/ui/sampler.mjs` y `docs/visual-reference/verify.mjs` tienen invocación
  documental explícita.
- `canQuarry` y `woodCostOf`, aunque Knip los marcó al excluir el CLI no
  alcanzable, sí se importan desde `tools/reports/works-report.ts` y no son API muerta.
- `RecipeClip` aparece como tipo exportado sin uso porque Knip no alcanza el
  comando manual `tools/graphics/animation-audit.ts`; ese comando sí lo importa.

## Qué no demuestra esta auditoría

No se ejecutó cobertura de todas las combinaciones del juego; por tanto no se
afirma que cada rama condicional alcanzable se produzca en una partida real.
Tampoco se clasifican selectores CSS por búsqueda textual: muchas clases se
construyen en plantillas o se consumen desde Playwright. Los hallazgos anteriores
son los que tienen evidencia estática directa y reproducible.

La limpieza se limitó a los hallazgos con lectoría global comprobada. No se
borraron puntos de entrada manuales, hooks, service workers, pruebas
configuradas ni fuentes reproducibles de arte.
