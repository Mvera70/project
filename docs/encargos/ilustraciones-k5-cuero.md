# Encargo · K5: las ilustraciones y los modelos del cuero

**Ronda:** K5, 2 oct 2026 (v5.75). **Por qué aquí y no en
`docs/plan-arte-pendiente.md`:** Codex sigue llevando ese fichero,
`public/ui/art/index.json` y `chronicle-art.ts`, y la ronda no los toca. Cuando
Codex lo suelte, estas filas pasan allí y se integran como las demás. Lo que
pide un modelo es de Astra por omisión (`docs/plan-meta.md`, «Los modelos nuevos
van por encargo»).

## 1 · Las líneas de crónica nuevas (para Codex)

Hasta que lleguen, caen al grabado de respaldo por `kind` (`road`, `means`,
`raid`). A color, con el trazo y la paleta de las de la crónica
(`cronica-color-v9`), 5:4.

| Clave | Peso | Qué tiene que enseñar |
|---|---:|---|
| `fate.pedlar.hides` | 2 | El buhonero en la plaza palpando una piel de ciervo tendida en un bastidor, el carro detrás |
| `offer.pedlar.hides.taken` | 2 | Un fardo de pieles atado en el carro del buhonero que se va por el camino; plata en la mano de un aldeano |
| `offer.pedlar.hides.gone` | 1 | El carro vacío alejándose; las pieles siguen en su bastidor junto a la casa |
| `smithy.jerkins.ordered` | 2 | El herrero (o una mujer con lezna) cortando y cosiendo petos de cuero en la fragua; pieles apiladas |
| `smithy.jerkins.done` | 1 | Un peto agrietado colgado de un clavo en la pared |
| `raid.held.jerkins` | 2 | En la muralla, un defensor con peto de cuero levantándose del suelo, una flecha clavada en el cuero |

## 2 · La tarjeta del tablón (para Codex)

Los avisos de la herrería llevarán su ilustración en la esquina
(`docs/encargos/ilustraciones-k8-k9.md` §2). La de este:

| Fichero | Qué tiene que enseñar |
|---|---|
| `cards/order-jerkins.png` | Un peto de cuero con sus correas, 56 × 48 a 1× |

## 3 · En 3D (para Astra)

| Qué | Medidas y presupuesto | Dónde se juzga |
|---|---|---|
| **El bastidor de pieles**: un marco de varas con una o varias pieles tendidas, junto a la casa del cazador o a la herrería; de 0 a 4 pieles visibles según `village.hides` (0, 1–2, 3–5, 6+) | 1 × 0,4 celdas de planta, 0,9 de alto; ≤ 400 triángulos con cuatro pieles; una llamada de dibujo (RV-1) | `npm run shot` a 390 × 844, semilla 11, año 20 con arco dado, encuadre de la casa del cazador |
| **El peto en el cuerpo**: una pieza de cuero sobre el torso de `villager.glb` para los del cerco mientras el encargo `jerkins` está en marcha | ≤ 120 triángulos, mismo esqueleto | El banco de batallas (`?sandbox=battle`) y la villa cerrada de la semilla 11 |
| **El fardo de pieles en el carro del buhonero** | Variante del fardo de leña de hoy (`tradeSites`, `bundle`) | La visita del buhonero con pieles en la plaza |
