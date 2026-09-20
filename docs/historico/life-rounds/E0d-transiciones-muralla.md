# E0d · Transiciones de muralla

21 sep 2026.

`ScenePlan` ya separa `buildings` de `works`; el diff de obra es independiente
del de suelo, bosque y edificios. Cada obra expone huella, `upgradeOf` y
progreso acotado de `bpDone / bpCost`. Para sustituciones de `gate` y `wall`, el
plan oculta sólo la empalizada fuente antes de recalcular conexiones, por lo que
los vecinos se rematan contra el hueco. Otras mejoras mantienen su fuente.

`world/works.ts` dibuja y libera una base baja con estructura incompleta de tres
etapas. Tiene grupo y registro propios: sus ids no comparten edificios, no añade
obstáculos y se retira al desaparecer/terminar la obra o cerrar el renderer.

La depuración `--wallwork gate|wall --progress 0..1` parte de una empalizada
existente; progreso uno representa el estado terminado que deja el motor. La
traza expone `life.works` junto a la captura.

## Verificación

11 pruebas focalizadas de plan, defensas, portones y gestor: verdes. También
`npm run typecheck`, `npm run lint` y `git diff --check`.

En semilla 7, año 40, había una empalizada real. Con el mismo valle y encuadre:

- `artifacts/graphics/E0d/seed-7-control/`: una estaca, sin solar.
- `probe-7-40-gate/`: solar de puerta a 45 %, fuente oculta en el plan/traza.
- `seed-7-gate-done/`: segundo portón, sin solar.
- `seed-7-wall-work/`: solar de muro a 45 %, fuente oculta.
- `seed-7-wall-done/`: muro final, sin solar.

Todas las tomas registran cero errores de página. No se tocó motor, derive,
balance, esquema, activos, vida, navegación ni Rapier; no se añadieron físicas,
cascotes ni derribo animado.
