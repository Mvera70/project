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
`rigid-clips.mjs … hen` le da el paso y el picoteo, sin vuelo.

- [hen.glb](hen.glb) · [perfil](hen-profile.png) · [tres cuartos](hen-three-quarter.png) ·
  [andando](hen-walk.png)
- `python3 build-models.py -- hen`

## El cuervo (29 sep 2026) — candidato, **sin publicar**

`crow()` en `build-models.py`, sobre la estructura de la gallina pero esbelto:
negro con brillo azulado en las alas, pico grueso, alas largas pegadas al
cuerpo y cola en cuña maciza. Mismo tamaño que el de G-23; `rigid-clips.mjs …
crow` le da el paso y el picoteo, sin vuelo, como hoy.

- [crow.glb](crow.glb) · [perfil](crow-profile.png) · [tres cuartos](crow-three-quarter.png) ·
  [andando](crow-walk.png)
- `python3 build-models.py -- crow`
