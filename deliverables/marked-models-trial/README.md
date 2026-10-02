# Modelos candidatos para revisión e integración

Once modelos rehechos para los señalados por Vera el 25 sep 2026. Se integraron
en el juego mediante `tools/art/rigid-clips.mjs` y `tools/art/adopt-models.mjs`.
El zorro y la piedra del vado quedaron fuera. `bear-v3.glb` es la revisión
vigente del oso; `bear-v2.glb` y `bear.glb` son versiones anteriores.
`bear-rear-preview.png` y `preview-sheet.png` pertenecen también a las
pruebas anteriores; no muestran la versión publicada. Se conservan sólo como
histórico. El archivo que carga el juego es `public/assets/valley3d/bear.glb`.

| ID del juego | Modelo candidato | Vista previa |
|---|---|---|
| `wolf` | [wolf.glb](wolf.glb) | [PNG](wolf.png) |
| `bear` | [bear-v3.glb](bear-v3.glb) | [Tres cuartos](bear-v3-three-quarter.png) |
| `partridge` | [partridge.glb](partridge.glb) | [PNG](partridge.png) |
| `boar` | [boar.glb](boar.glb) | [PNG](boar.png) |
| `dog` | [dog.glb](dog.glb) | [PNG](dog.png) |
| `mule` | [mule.glb](mule.glb) | [PNG](mule.png) |
| `hoe` | [hoe.glb](hoe.glb) | [PNG](hoe.png) |
| `bucket` | [bucket.glb](bucket.glb) | [PNG](bucket.png) |
| `arrow` | [arrow.glb](arrow.glb) | [PNG](arrow.png) |
| `shield` | [shield.glb](shield.glb) | [PNG](shield.png) |
| `pickaxe` | [pickaxe.glb](pickaxe.glb) | [PNG](pickaxe.png) |

Hay capturas adicionales del [oso de perfil](bear-v3-profile.png), del
[oso erguido](bear-v3-rear.png) y de la
[perdiz al despegar](partridge-takeoff-preview.png). Los GLB fuente del lobo,
oso y perdiz incluyen, respectivamente, los clips `attack`, `rear` y `takeoff`.

El [script de autoría](build-models.py) reproduce los once modelos con Blender
desde esta carpeta. El modelo del oso se exporta como `bear-v3.glb`.

Los GLB de esta carpeta están articulados con nodos rígidos y no incorporan
`idle`/`walk`; `rigid-clips.mjs` añade esos movimientos a los archivos
publicados. El `rear` del oso se publica como `attack`. La revisión v3 cambia
solo la anatomía del oso; los otros diez modelos permanecen intactos.

## El oso v4 (29 sep 2026) — **publicado**

Vera: «el oso no termina de convencerme». El v3 tenía el lomo plano, patas que
se afinaban hasta 6 cm en el tobillo y acababan en un disco de 15 cm, y un
marrón (`775A3E`) que con la luz del juego se leía color arena. El v4
(`bear()` en `build-models.py`; el v3 sigue en `bear_v3()`) pone un lomo que
sube apenas hacia la cruz, la cabeza baja por delante, patas en columna con la
zarpa saliendo de la pata y un pardo oscuro. La joroba entera del primer
intento a Vera le pareció horrible: `BEAR_HUMP` dice cuánto queda (0,35 la
suave, que es la de estos ficheros; 0,15 casi plano). Las patas de delante le parecían
largas: `BEAR_FORE_DROP` baja el pecho y las acorta (0,07 se nota; 0 las deja)
y `BEAR_FORE_FUR` cuelga pelo del pecho y del antebrazo sin cambiar la postura.
Eligió el «normal»: los dos a cero, que es lo publicado (`artifacts/graphics/bear-v4/approved/bear/`). Mismo tamaño que
el v3, mismos nodos y la misma pose erguida.

- [bear-v4.glb](bear-v4.glb) · [perfil](bear-v4-profile.png) ·
  [tres cuartos](bear-v4-three-quarter.png) · [quieto, andando y erguido](bear-v4-gestures.png)
- `python3 build-models.py -- bear` (con `pip install bpy==5.0.1`) sólo
  construye el oso; sin nombres, todos.
- Publicado con `rigid-clips.mjs bear-v4.glb <salida> bear`,
  `adopt-models.mjs` y `publish-assets.ts --ids bear`.

## El pez (29 sep 2026) — **publicado**

El de G-23 era una cápsula con rombos pegados y se leía como un submarino.
`fish()` en `build-models.py` hace una trucha facetada: huso que se afina hacia
la cola, caudal ahorquillada, dorsal alta que asoma del agua, lomo oscuro (lo
que se ve desde arriba), costado dorado con pintas y vientre claro. Mismo
tamaño que el de G-23 (0,19 celdas) y los nodos `body`, `head`, `tail`,
`tailTip` y `fin±1`; `rigid-clips.mjs … fish` le da el nado (la cola ondula en
tres tramos, las pectorales reman) y el reposo.

- [fish.glb](fish.glb) · [perfil](fish-profile.png) · [tres cuartos](fish-three-quarter.png) ·
  [nadando bajo el agua](fish-swim.png)
- `python3 build-models.py -- fish`. `merge_parts()` junta las piezas que
  comparten articulación y material: de 37 mallas a 19, y hay hasta cuatro
  peces a la vez.

## El cerdo (29 sep 2026) — **publicado**

El de G-23 era una caja con dos losas por orejas que salían de lado como alas.
`pig()` en `build-models.py` lo hace facetado, sobre la estructura del jabalí
de Vera: barril redondo, patas cortas, hocico de disco, orejas grandes caídas
hacia delante y rabo rizado. Mismo tamaño que el de G-23 (0,55 celdas); marcha
de `rigid-clips.mjs … pig`.

- [pig.glb](pig.glb) · [perfil](pig-profile.png) · [tres cuartos](pig-three-quarter.png) ·
  [andando](pig-walk.png)
- `python3 build-models.py -- pig`

## La vaca (29 sep 2026) — **publicada**

La de G-23 era de cajas, como la gallina, y con el cerdo facetado el corral
quedaba en dos estilos. `cow()` en `build-models.py` la hace facetada sobre la
estructura de la mula de Vera: barril hondo, cuello corto con papada, cuernos,
pelo rojizo con la cara y el vientre blancos, y ubre. Vera la quiso más gorda: `COW_GIRTH`
ensancha y ahonda el tronco (1,22 y 1,14) con el lomo donde estaba. Mismo tamaño que la de
G-23 (0,75 celdas); marcha de `rigid-clips.mjs … cow`.

- [cow.glb](cow.glb) · [perfil](cow-profile.png) · [tres cuartos](cow-three-quarter.png) ·
  [andando](cow-walk.png)
- `python3 build-models.py -- cow`

## La gallina (29 sep 2026) — **publicada**

La última de cajas del corral. `hen()` en `build-models.py`, sobre la
estructura de la perdiz de Vera: cuerpo lleno, cola alzada hacia atrás, cresta
y barbillas rojas, pico y patas amarillos. Blanca, que se lee sobre la hierba y
no se confunde con la perdiz ni con el zorro. Mismo tamaño que la de G-23;
`rigid-clips.mjs … hen` le da el paso y el picoteo, sin vuelo. El pico es un
cono corto desde el 29 sep: el rombo de las plumas lo dejaba en punta de flecha.

- [hen.glb](hen.glb) · [perfil](hen-profile.png) · [tres cuartos](hen-three-quarter.png) ·
  [andando](hen-walk.png)
- `python3 build-models.py -- hen`

## El cuervo (29 sep 2026) — **publicado**

`crow()` en `build-models.py`, sobre la estructura de la gallina pero esbelto:
negro con brillo azulado en las alas, pico macizo que se afina con una curva
hacia abajo (el rombo de las plumas lo dejaba de perfil en punta de flecha),
alas largas pegadas al
cuerpo y cola en cuña maciza. Mismo tamaño que el de G-23; `rigid-clips.mjs …
crow` le da el paso y el picoteo, sin vuelo, como hoy.

- [crow.glb](crow.glb) · [perfil](crow-profile.png) · [tres cuartos](crow-three-quarter.png) ·
  [andando](crow-walk.png)
- `python3 build-models.py -- crow`

## El pato (29 sep 2026) — **publicado**

`duck()` en `build-models.py`: un ánade real macho facetado sobre la
estructura de la gallina, con casco de barca que flota a la altura a la que el
juego lo pone (línea de agua a 0,06 del suelo del modelo), cabeza verde con
collar blanco, pecho castaño, lomo gris, espejuelo azul, cola negra rizada y
pico plano de pato. Mismo tamaño que el de G-23; `rigid-clips.mjs … duck`.
El banco de fauna pinta ahora la lámina de agua para el pato.

- [duck.glb](duck.glb) · [perfil](duck-profile.png) · [tres cuartos](duck-three-quarter.png) ·
  [nadando](duck-swim.png)
- `python3 build-models.py -- duck`

## El ciervo (29 sep 2026) — **publicado**

El último de cajas. `deer()` en `build-models.py`, sobre la estructura de la
mula de Vera: tronco esbelto sobre patas largas con el corvejón atrás, cuello
alto con crin oscura, pardo rojizo con vientre claro y espejo blanco en la
grupa, y cuerna con luchadera, candil y corona. A Vera las patas le parecieron demasiado
largas: `DEER_DROP` baja el cuerpo y las acorta lo mismo (0,11; se probó 0,07). Mismo tamaño que el de G-23;
`rigid-clips.mjs … deer` le da el paso con el casco plantado: cadera y rodilla
por cinemática inversa y el cuerpo un poco agachado al andar, como hacía
`art/recipes/deer/plant-gait.cjs` con el modelo de cajas. Lo vigila
`animal-gait-axis.test.ts`.

- [deer.glb](deer.glb) · [perfil](deer-profile.png) · [tres cuartos](deer-three-quarter.png) ·
  [andando](deer-walk.png)
- `python3 build-models.py -- deer`


## La mula y el jabalí, con las patas más cortas (29 sep 2026) — **publicados**

A Vera las patas le parecían muy largas. `mule()` y `boar()` siguen siendo sus
modelos; dos parámetros de `build-models.py` bajan el cuerpo con todo lo que
lleva encima y acortan las patas lo mismo, con la pezuña en el suelo y de su
tamaño: `MULE_DROP` (0,10) y `BOAR_DROP` (0,08). `BOAR_TUSK` (1,5) agranda los
colmillos desde su raíz, para que se vean («destacarlos»). Con los tres a su
valor neutro (0, 0 y 1) sale el modelo de Vera pieza a pieza, comprobado
contra el GLB publicado antes del cambio.

- [mula](mule-short-three-quarter.png) · [jabalí](boar-short-three-quarter.png)

La golondrina y la perdiz se quedan las de siempre: se probaron otras y Vera
prefirió las suyas.

## Los animales rehechos (2 oct 2026, v5.100)

Vera: «los modelos de Astra de los animales no me gustan, los corregirás tú con
el estilo que has ido usando con los últimos», y tras cinco vueltas dentro de
los topes del encargo de Astra, «para y hazlos bien, con la calidad de los que
tenemos ahora». Seis funciones en `build-models.py`, cada una **de la receta de
su animal del valle, casi literal y con su densidad**:

| ID | De qué receta | Triángulos | Esqueleto y clips |
|---|---|---|---|
| `horse` | `mule()` sin albarda, ×1,22 (`HORSE_SIZE`): pecho y cruz que funden el cuello, orejas cortas, crin y cola llenas, lucero, calzas | 2202 | Los de la mula; `walk` con el casco plantado (como el ciervo) e `idle` |
| `stork` | `hen()`: remeras negras, cuello en S, pico largo, patas con dedos | 1838 | Los de la gallina; `walk` e `idle` |
| `chick` | `hen()` en cría | 1454 | Los de la gallina; `walk` e `idle` |
| `crane` | Cuerpo de la gallina y plumas de la perdiz, en vuelo | 832 | `bird_wing_l`/`bird_wing_r` en el hombro, como la golondrina |
| `butterfly` | Dos pares de alas redondeadas, ocre y terracota | 182 | `wing_l`/`wing_r` en el eje del cuerpo |
| `stork-nest` | Plataforma de ramas con rodete (`NEST_FLOOR`, donde pisa la cigüeña) | 192 | — (sólo modelo) |

Reconstruir y publicar (con `pip install bpy==5.0.1`):

```bash
cd deliverables/marked-models-trial && python3 build-models.py -- horse stork stork-nest chick crane butterfly
node tools/art/rigid-clips.mjs deliverables/marked-models-trial/horse.glb <salida> horse   # y stork, chick
node tools/art/adopt-models.mjs <lista.json>     # ronda animales-rehechos
npx tsx tools/graphics/publish-assets.ts --ids stork,chick,crane,butterfly
```

El caballo y el nido no se publican: no tienen sitio en el juego todavía. Las
hojas de antes (Astra) y después están en `artifacts/graphics/animales-rehechos/`
(`tools/art/fauna-sheet.py`).
