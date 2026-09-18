# Encargo: la fuente de la plaza (`fountain`)

Para quien modele en Blender. Mismo formato que `docs/encargo-arado.md`, que se
entregó el 17 sep 2026 y sirvió: medidas, piezas, materiales, presupuesto y los
tres pasos para meterla en la escena.

**Por qué hace falta.** Desde el 18 sep 2026 el valle tiene plaza de verdad: un
círculo de seis celdas de diámetro, elegido el día de la fundación, empedrado, y
donde la aldea no construye nada (`docs/task-log.md` §4.0b, P-1 y P-2). En su
centro hay **una fuente de apaño hecha con tres cilindros**
(`src/render3d/world/plaza.ts`, `standIn`), y se ve: es un pilón gris con una
columna. Funciona para leer la plaza y no para mirarla de cerca.

El dueño del diseño lo pidió así: «me gustaría que la plaza fuese un espacio que
tuviese un círculo grande, con separación. Y en el centro quizás puedo poner una
fuente, que eso habrá que hacerlo con 3D».

---

## Medidas

Una celda del valle son **tres metros** (`docs/design.md` D.6.2), y un aldeano
mide 0,65 celdas, o sea **1,95 m**. La fuente tiene que leerse desde la cámara
isométrica sin taparle la cara a nadie que pase por detrás.

| Qué | Metros | Celdas |
|---|---|---|
| Diámetro del pilón | 2,4 m | 0,8 |
| Altura del pilón | 0,45 m | 0,15 |
| Altura total con la columna | 1,95 m | 0,65 |
| Huella | 1 × 1 celda | la celda de la fuente está **cerrada al paso** |

La altura total es **la de un aldeano a propósito**: la fuente es lo más alto de
la plaza y sigue siendo una cosa de pueblo, no un monumento.

---

## Piezas

Cinco, y ninguna es adorno:

1. **El pilón**, octogonal u ovalado, con el borde de una mano de ancho
   (0,15 m). Es lo que dice «aquí se coge agua».
2. **El agua**, un disco a tres cuartos de la altura del pilón. Plano: el agua
   quieta de este juego es un color, no un material transparente.
3. **La columna** del centro, más gruesa abajo que arriba.
4. **El caño**, un cilindro corto saliendo de la columna hacia +z, a 1,1 m del
   suelo: la altura a la que se pone un cántaro debajo.
5. **El desgaste**: la piedra del borde del pilón, gastada donde la gente apoya
   las manos. Si el presupuesto de triángulos no llega, esta es la que se cae.

---

## Materiales

Los nombres tienen que ser **exactamente** los que el pipeline ya conoce
(`art/recipes/*/**.json`), o el material sale sin asignar:

| Pieza | Material |
|---|---|
| Pilón, columna, caño | `stone` |
| El agua | `water` |
| El borde gastado | `stoneLight` si existe en la receta del pozo; si no, `stone` |

Mira `art/recipes/well/well.json` antes de empezar: el pozo del valle ya resuelve
piedra y agua juntas, y lo que se quiere es que la fuente **parezca de la misma
aldea que el pozo**.

---

## Presupuesto y forma

- **≤ 500 triángulos.** Es más que el arado (400) porque el pilón es redondo y
  se mira de cerca: la plaza es el sitio donde la cámara se para.
- Cilindros de **ocho lados**, como el resto del catálogo. No dieciséis.
- **Origen centrado y en el suelo** (el punto más bajo en y = 0).
- **Mirando a +z**, como todo el catálogo.
- Sin suavizado global: este valle es de facetas planas.

---

## Receta y publicación

Tres pasos, los mismos que el arado:

1. La receta en `art/recipes/fountain/fountain.json`, en **metros** y con
   `"scale": 1/3` como el resto (el pipeline divide para pasar a celdas).
   Modélala sobre `art/recipes/well/well.json`.
2. `npm run art` y `npm run assets:publish`.
3. **No hay que tocar el render.** `fountain` ya está pedido en `WANTED`
   (`src/render3d/renderer.ts`) y `PlazaFountain` la usa en cuanto
   `instance('fountain')` la devuelve: la de apaño desaparece sola. El
   empaquetador ya la lista como «aún sin modelo».

---

## Cómo se comprueba

```
npm run bundle -- --out artifacts/graphics/P-3/game
node tools/graphics/observe-life.mjs --page artifacts/graphics/P-3/game/valley.html \
  --means ale --seed 11 --year 30 --live --speed 16 --seconds 20 --fps 2 \
  --out artifacts/graphics/P-3/fuente
```

En la traza, `penetratingCircles` y `blockedCentres` tienen que seguir en cero:
la celda de la fuente está cerrada al paso y nadie debe acabar dentro. Y en la
imagen, la fuente tiene que verse **entera** desde la cámara, sin que el pilón
se hunda en el empedrado ni la columna atraviese el tejado de nadie.
