# El cartel del camino — encargo de modelo (28 sep 2026)

Pedido por el dueño del diseño al conectar el camino de los desfiladeros con la
aldea (v4.93): «luego sendero, alguna señal, cartel anunciando la aldea… el
camino que construye el pueblo llega hasta la puerta, y ahí iría el cartel».
Hoy hay uno provisional hecho de dos cajas (`src/render3d/world/road.ts`,
`buildSignposts`); este documento es lo que hay que darle a Astra.

## Qué es

Un **poste con tablilla**, de madera, clavado al borde del camino a unas diez
celdas de la plaza, en cada una de las dos entradas del valle. Anuncia la
aldea a quien llega: la tablilla cruza el camino y se lee de frente.

## Medidas y sitio

- Una celda del juego es un metro y pico; un aldeano mide 0,65 celdas.
- Alto total **1,1 celdas**; tablilla de **0,56 × 0,20** celdas, a 0,9 de alto;
  poste de 0,08 de grueso. Que quepa en un cubo de 0,7 × 1,2 × 0,3.
- Origen en la base del poste, sobre el suelo. La tablilla en el plano XY
  (mirando a +Z); el juego lo gira con `yaw` para que cruce el camino.
- Sin texto legible (el juego no escribe nada en los modelos): unas marcas
  talladas o una flecha bastan.

## Estilo

El de los demás modelos de Astra (`docs/encargos/` y `public/models/`):
facetado, sin texturas, colores en los materiales (madera de poste
`#6b4a2e`, tablilla `#a8845a` o parecidos, que la estación no la tiñe). Puede
llevar un clavo o dos y la tablilla un poco torcida: es un cartel de aldea.

## Variantes (si hay ganas)

- `signpost`: el de la aldea (obligatorio).
- `signpost-town`: el de la villa cerrada, con dos tablillas o una más grande
  y el poste más recio.

## Cómo entra

`npm run art -- all signpost` y `npx tsx tools/graphics/publish-assets.ts
--ids signpost`, como los demás; `road.ts` lo instancia con
`library.instance('signpost')` en vez de las dos cajas.
