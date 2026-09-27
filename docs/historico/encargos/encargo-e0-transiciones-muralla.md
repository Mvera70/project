# E0d · Las obras de la muralla no aparecen de golpe

## Objetivo

Que una construcción se vea mientras está en curso y que las dos sustituciones
del anillo que hoy ocurren de golpe —un tramo de empalizada por la segunda
puerta y una empalizada por muro de piedra— dejen un hueco de obra legible hasta
terminar. Esta ronda cierra las transiciones pendientes de E0 sin simular un
derribo físico ni añadir activos.

## Depende de

- `ConstructionWork`: huella, `bpDone`, `bpCost`, `startedTick` y `upgradeOf`.
- A2c: una puerta nueva puede sustituir un tramo de defensa ya construido.
- A4: `wall` mejora una `palisade` existente sobre la misma celda.
- G-06: `planFor` y `planChange` son la descripción pura de la escena; el
  renderer sólo aplica su diferencia.
- V-06: la gente ya acude a `state.works[0]`. Esta ronda hace visible el solar,
  no cambia el reparto.

Todo el estado necesario existe. No se añade campo al motor, malla, clip ni
material publicado.

## Ficheros

Producción limitada a:

- `src/render3d/world/plan.ts` para derivar solares de obra y sus cambios;
- un módulo nuevo bajo `src/render3d/world/` para dibujar y mantener los
  solares procedurales;
- `src/render3d/renderer.ts` para aplicar el diff de obras;
- `src/ui/debug.ts`, `src/main.ts` y una herramienta existente de
  `tools/graphics/` sólo para construir y observar los dos estados reales;
- pruebas focalizadas en `tests/fast/`;
- `docs/task-log.md`, `docs/plan-meta.md`, `docs/encargos-3d.md` y el informe
  de ronda.

No tocar `src/engine/`, `src/derive/`, balance, esquema, colocación, coste,
cadencia de obra, navegación, vida, Rapier ni activos. Si hace falta otro
fichero de producción, se declara antes de tocarlo.

## Contrato

- `ScenePlan` describe por separado edificios terminados y obras activas. Cada
  obra conserva el `id`, tipo, huella y `upgradeOf` del estado, y expone un
  progreso normalizado y acotado derivado de `bpDone / bpCost`.
- El mismo estado produce el mismo plan y la misma geometría. Planificar o
  pintar no escribe `GameState`, no consume RNG y no depende del reloj real.
- Toda obra activa tiene una marca procedural visible sobre su huella: base
  baja y estructura incompleta que crece por etapas con su progreso. Debe
  distinguirse desde la cámara normal y no parecer un edificio terminado.
- Si una obra `gate` o `wall` tiene `upgradeOf`, el edificio fuente no aparece
  como intacto durante la obra. En su celda se ve exclusivamente el solar:
  esto abre el hueco temporal en el anillo sin cambiar colisiones ni estado.
- Las demás mejoras conservan el edificio fuente y superponen la marca de obra;
  no se amplía esta ronda a diseñar su transición completa.
- Al terminar o desaparecer la obra, el solar se retira. Cuando el motor añade
  el edificio nuevo, el diff sustituye solar por edificio sin reconstruir todo
  el valle.
- Cambiar sólo `bpDone` cambia únicamente la obra correspondiente; no el suelo,
  bosque ni edificios ajenos.
- La observación de depuración parte de una empalizada real y crea una
  `ConstructionWork` válida de `gate` o `wall` sobre ella. No inventa una
  segunda regla de colocación.

## Reglas

- Presentación pura: el motor sigue siendo el único dueño de cuándo empieza,
  avanza y termina una obra.
- Sin derribo animado, cascotes, físicas ni malla nueva. La promesa de esta
  ronda es el hueco y el solar, no una caída de estacas.
- Geometría y materiales procedurales propios se liberan al retirar el solar,
  cambiar de partida o cerrar el renderer.
- Los ids de obra no comparten el espacio de ids de edificios dentro del
  renderer: se mantienen en un grupo y registro separados.
- El solar es presentación y no obstáculo nuevo. La navegación conserva lo que
  diga el estado durante la construcción.
- La primera puerta ya terminada, el portón roto de D6 y las conexiones de las
  defensas vecinas no cambian de contrato.

## Tests exigidos

1. Una obra normal aparece en `ScenePlan` con huella y progreso acotado; el
   mismo estado devuelve exactamente el mismo resultado sin mutarlo.
2. Una obra de `gate` y una de `wall` con `upgradeOf` ocultan sólo la empalizada
   sustituida; sus defensas vecinas se vuelven a planificar alrededor del hueco.
3. Una mejora distinta conserva su edificio fuente y añade el solar.
4. Subir `bpDone` produce un cambio de la obra correspondiente y ningún alta,
   baja o cambio espurio de edificio, suelo o bosque.
5. Retirar la obra elimina el solar; completar la sustitución muestra el
   edificio final y no deja restos del solar ni resucita la empalizada.
6. El gestor 3D añade, actualiza, retira y libera solares sin duplicarlos; su
   geometría cambia de etapa entre progreso bajo y alto.
7. Regresiones focalizadas de plan, defensas, puertas y render; typecheck, lint
   y `git diff --check`.

## Evidencia y terminado cuando

Capturar, con el mismo valle y encuadre, control y obra a progreso bajo/medio
para los dos casos: segunda puerta y estacada a piedra. La empalizada intacta
del control debe convertirse en un hueco ocupado por un solar inequívoco; en
otra toma, el estado terminado debe contener el portón o muro nuevo y ningún
solar. Guardar plan/traza junto a las capturas y confirmar cero errores.

**Falsaría el brief** que el cambio sólo se descubra en la traza, que durante
la obra sigan viéndose simultáneamente la empalizada intacta y el solar, que el
solar sobreviva al terminar, o que representar la transición altere la partida,
las colisiones o el ritmo de construcción.

Esta ronda cierra únicamente las **transiciones de muralla** de E0. No aborda
ambiente de era, identidad del clan, adarve, bastión, fuego ni gore.
