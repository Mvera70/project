# Encargo · K5: la sastrería y el lino

**Ronda:** K5, 2 oct 2026 (v5.76). Como el del cuero
(`ilustraciones-k5-cuero.md`): Codex sigue llevando
`docs/plan-arte-pendiente.md`, `public/ui/art/index.json` y
`chronicle-art.ts`; cuando lo suelte, estas filas pasan allí. Los modelos son
de Astra por omisión (`docs/plan-meta.md`, «Los modelos nuevos van por
encargo»).

## 1 · Las líneas de crónica nuevas (para Codex)

Hasta que lleguen, caen al grabado de respaldo por `kind` (`build`, `means`,
`harvest`). A color, con el trazo y la paleta de la crónica
(`cronica-color-v9`), 5:4.

| Clave | Peso | Qué tiene que enseñar |
|---|---:|---|
| `built.tailor` | 3 | Un taller de madera junto a la fragua, con un telar visible por la puerta abierta y una pieza de lienzo colgada del alero |
| `tailor.flax.ordered` | 2 | La tejedora señalando un campo al borde del valle; un labrador con un saco de linaza |
| `tailor.flax.harvest` | 2 | El campo de lino arrancado: gavillas en remojo en el río y tiras de lienzo blanqueando sobre la hierba; al lado, el granero con la puerta medio vacía |
| `tailor.flax.done` | 1 | El mismo campo arado de nuevo para trigo, con alguna flor azul suelta en el surco |
| `tailor.clothes.ordered` | 2 | La tejedora y dos mujeres cosiendo camisas de lino blanco en la puerta del taller; un niño probándose una |
| `tailor.clothes.done` | 1 | Una camisa remendada y desteñida tendida en una cuerda |

## 2 · Las tarjetas del tablón (para Codex)

56 × 48 a 1×, como las de la herrería (`ilustraciones-k8-k9.md` §2):

| Fichero | Qué tiene que enseñar |
|---|---|
| `cards/tailor-flax.png` | Un manojo de lino con su flor azul |
| `cards/tailor-clothes.png` | Una camisa de lino doblada con aguja e hilo |

## 3 · En 3D (para Astra)

| Qué | Medidas y presupuesto | Dónde se juzga |
|---|---|---|
| **`tailor.glb`, la sastrería**: taller de madera de 2 × 2 celdas, con un telar visible por una puerta ancha y lienzo colgado del alero | Como la herrería: ≤ 1 500 triángulos, una llamada de dibujo, la puerta en la cara que mira a la plaza; hoy se pinta como caja de pared de lienzo crudo (`BUILDING_LOOKS.tailor`) | `npm run shot` a 390 × 844, semilla 11, año 8 (la sastrería llega a las 70 h a ×1), encuadre de la plaza |
| **`field-flax.glb`, el campo de lino**: la variante del campo con plantas finas de flor azul (`FIELD_CROPS`), y su rastrojo | Como `field.glb` y sus variantes de cultivo | El campo más lejano de la plaza con el encargo `flax` en marcha, a principios de verano |
| **Las gavillas en remojo y el lienzo blanqueando**: haces de lino en la orilla del río y tiras blancas sobre la hierba, las semanas después de la siega con lino | Piezas sueltas, ≤ 300 triángulos en total | La misma toma, en otoño |
| **`villager-weaver.glb`, la tejedora** | Mismo esqueleto que `villager.glb`; delantal y un huso a la cintura | La puerta de la sastrería de día |
