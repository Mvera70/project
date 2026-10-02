# Encargo · K8+K9: las ilustraciones y los dos tablones

**Ronda:** K8+K9, 2 oct 2026 (v5.60). **Por qué aquí y no en
`docs/plan-arte-pendiente.md`:** Codex está trabajando ahora en ese fichero,
en `public/ui/art/index.json`, `chronicle-art.ts` y `ui/milestones.ts`, y la
ronda no los toca. Cuando Codex termine, estas filas pasan allí y se integran
por `index.json` y `chronicle-art.ts`, como las demás.

## 1 · Las líneas de crónica nuevas (para Codex)

Hasta que lleguen, caen al grabado de respaldo por `kind: 'means'`. A color,
con el trazo y la paleta de las 44 de la crónica (`cronica-color-v9`), 5:4.

| Clave | Qué tiene que enseñar |
|---|---|
| `smithy.axes.ordered` | El herrero en la fragua batiendo filos de hacha; dos o tres hachas nuevas apoyadas en el yunque |
| `smithy.ploughshares.ordered` | Una reja de arado al rojo sobre el yunque; un labrador esperando en la puerta |
| `smithy.ironware.ordered` | Clavos, bisagras y ganchos colgados en la fragua; un fardo atado para el camino |
| `smithy.axes.done` | Un hacha mellada colgada en la pared de una casa |
| `smithy.ploughshares.done` | Una reja gastada junto al surco, brillante de uso |
| `smithy.ironware.done` | Un buhonero cargando el último fardo de herrajes en su mula, plata en la mano del herrero |
| `rite.mass.held` | La aldea entera dentro de la capilla, el cura en el altar, los campos vacíos por la ventana |
| `rite.rogation.held` | Procesión por el borde de los campos detrás del cura con una cruz, cantando |

## 2 · Las tarjetas de los tablones (para Codex)

Las misiones de la plaza llevan su ilustración en la esquina del aviso
(`public/ui/art/cards/mission-*.png`, 56 × 48 a 1×). Los avisos de la
herrería y de la capilla salen hoy sin ella:

| Fichero | Qué tiene que enseñar |
|---|---|
| `cards/order-axes.png` | Un hacha nueva |
| `cards/order-ploughshares.png` | Una reja de arado |
| `cards/order-ironware.png` | Un manojo de clavos y una bisagra |
| `cards/rite-mass.png` | Una campana de capilla |
| `cards/rite-rogation.png` | Una cruz de procesión sobre espigas |

## 3 · Los tablones en 3D (para Astra)

Hoy son la pieza provisional del de la plaza (cajas: dos postes, tabla,
tejadillo, papeles), a 0,72 de escala, clavada en la fachada que mira a la
plaza (`derive/building-boards.ts`). Lo de verdad:

| Modelo | Qué es | Medidas |
|---|---|---|
| `smithy-board` | Una tabla de avisos colgada en la pared de la fragua, con un clavo de herradura arriba y hollín en la madera | 0,7 × 0,5 de celda, cara a +Z, el pie en el suelo |
| `chapel-board` | Una tabla de avisos con un tejadillo pequeño y una cruz tallada arriba, junto a la puerta de la capilla | la misma |

Una llamada de dibujo por tablón, como el de la plaza
(`docs/encargos/visitantes-y-expediciones.md`, `notice-board`).
