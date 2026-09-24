# Cuatro variantes de vivienda · candidato 01

Se añaden diseños para las dos etapas constructivas reales, `tier: 0` (madera)
y `tier: 1` (piedra). No son épocas nuevas ni cambian capacidad o parcela.

| Receta / recurso | Diseño | Triángulos de receta | Publicado de referencia | Materiales |
|---|---|---:|---:|---:|
| `house-twin-gable.json` / `house-twin-gable` | Dos crujías de entramado, una ancha y alta y otra estrecha y baja; dos cumbreras paralelas de paja | 736 | 668 | 6 |
| `stone-house-cross-gable.json` / `stone-house-cross-gable` | Cubierta transversal de teja con cuerpo central elevado y hastial perpendicular; cubierta en cruz | 856 | 764 | 5 |
| `house-hip-roof.json` / `house-hip-roof` | Cuerpo de entramado más alto y cubierta piramidal de cuatro aguas, sin cumbrera longitudinal | 702 | 668 | 6 |
| `stone-house-tower-loft.json` / `stone-house-tower-loft` | Cubierta principal baja y altillo lateral alto con su propia cubierta piramidal | 818 | 764 | 5 |

La segunda pareja responde al pedido de otra variante muy distinta. La madera
se reconoce por su cubierta de cuatro faldones y punto alto central; la piedra
por su perfil escalonado con altillo en la esquina posterior. El altillo no
lleva almenas, saeteras ni ventanas extra. Se descarta añadir porche saliente:
con la puerta y la huella fijas, el fondo disponible frente al muro es apenas
0,14 celdas y no permite un porche abierto convincente sin tapar el giro.

La silueta cambia por volúmenes estructurales: escalón lateral en madera y
hastial central en piedra. Se mantienen las paletas maestras, rugosidad mate,
carpinterías, basamento y detalle concentrado del resto del pueblo. Geometría
original del proyecto, sin fuentes de terceros ni texturas nuevas.

## Cotas y contrato de integración

La receta usa Blender Z arriba, escala `1/3`; 6 unidades de receta son 2 celdas.
Origen y huella horizontal exacta se conservan: `[0,0]` a `[2,2]`, sin decoración
fuera. Altura máxima: madera 1,561; piedra 1,56. La caja mínima vertical
`-0,0025` procede del fondo del umbral heredado del modelo original.
La segunda pareja alcanza 1,6533 (cuatro aguas) y 1,8767 (altillo), manteniendo
2×2. El cuerpo alto del altillo mide 0,68×0,68 celdas, dentro de la esquina
posterior; su cubierta termina exactamente en el límite de la parcela.

La puerta sigue centrada en X=3, frente Y≈0,25; ninguna pieza nueva ocupa
su paso o giro. Madera: hoja `[3,0.28,0.85]`, dimensiones `[1,.16,1.7]`;
piedra: `[3,.25,.9]`, dimensiones `[1.05,.16,1.8]`. No hay conectores nuevos.
`mergeByMaterial: true` y el material `door` independiente hacen que el
exportador nombre las hojas `house-twin-gable_door`,
`stone-house-cross-gable_door`, `house-hip-roof_door` y
`stone-house-tower-loft_door`, conforme a `${planned.asset}_door` del runtime.
Esto se ha comprobado en el código exportador; verificar también en los bytes
GLB al exportar.

**Exactamente tres ventanas, en las posiciones originales y con el mismo
material oscuro `window`.** Madera: A `[1.45,.36,1.4]`, B `[4.55,.36,1.4]`,
C `[.36,3.4,1.4]`; piedra: A `[1.4,.31,1.55]`, B `[4.6,.31,1.55]`,
C `[.31,3.5,1.55]`. Se conservan también dimensiones y carpinterías.
Los hastiales nuevos son macizos, sin ventanas, tragaluces o respiraderos.
El material `window` también incluye el hueco de chimenea y fondo del umbral,
como en los originales: **no debe hacerse emisivo todo ese material** para
resolver la noche. La luz nocturna debe seguir las tres ventanas originales.
La evidencia CPU confirma la geometría oscura; no valida emisión nocturna,
oclusiones de los quads luminosos del juego ni cuatro estaciones. Esa revisión
queda para la importación e integración real.

## Fuente y evidencia

`design.mjs` genera las cuatro recetas a partir de las publicadas y es la fuente de
los cambios de diseño: editar ahí y regenerar, sin mantener ajustes manuales
paralelos en el JSON. `loadRecipe` acepta las cuatro recetas (62, 72, 59 y 69
primitivas, por orden de la tabla). La revisión CPU compara exactamente los
JSON de las tres ventanas, todas las piezas de material `door` y los materiales
con sus originales; las cuatro variantes pasan y la evidencia guarda el resultado.
`review.py` rasteriza las primitivas con un z-buffer CPU, cámara y escala
comunes y paleta real. La comparativa muestra originales y candidatos desde
ambos lados del frente, también en grises:

- `artifacts/graphics/house-variant-review-01/comparison-cpu.png`
- `artifacts/graphics/house-variant-review-01/comparison-cpu-gray.png`
- `artifacts/graphics/house-variant-review-01/recipe-measurements.json`

La inspección visual CPU de las seis casas, color y grises y ambos lados del
frente, confirma cubiertas doble, cruzada, piramidal y altillo lateral legibles,
puerta despejada y ausencia de ventanas nuevas. Es evidencia de recetas,
no de importación GLB, iluminación del juego, sombras o aprobación humana.
No se ha ejecutado Blender, exportado GLB, publicado ni cambiado catálogo.
