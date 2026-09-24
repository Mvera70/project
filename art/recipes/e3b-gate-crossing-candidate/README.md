# E3b.2b · Coronación cardinal de portón, sin juntas diagonales

Fuente: `e3b-gate-crossing-candidate.json`, generada por `e3b-walkway-turn-candidate/review.py`. Tres cubos, piedra de la paleta común, un material y 36 triángulos estimados. El tablero nominal de 0,09 se apoya desde Y=0,93 hasta el suelo Y=1,02, sin bajar del dintel indicado en el encargo. Su planta X `0…1`, Z `0,33…1,27` conserva 0,72 entre pretiles, en correspondencia con la recta. La abertura pública del portón es 0,84 y la hoja/gozne quedan intactos en la fuente `gate.json`.

**Rechazado para el portón actual y las máscaras reales 65 y 128.** El GLB publicado `gate.glb` llega a Y=0,865 en sus almenas; el tablero candidato empieza en Y=0,93, así que deja **0,065 sin soporte certificado**. El dintel de la receta acaba a Y=0,72. El `OpenGate` de `defences.ts` es sólo el respaldo procedural cuando no se carga el GLB: su dintel ocupa Y≈0,9607…1,0807 y **sí intersectaría** este tablero, por lo que el respaldo tampoco puede recibirlo. La semilla 7 une cardinal con diagonal y la 91 une dos diagonales. Esta pieza no incluye suelo ni apoyo en esas esquinas. Corregirlo exige apoyo real y juntas que mantengan la abertura pública de 0,84 y permitan barrer un disco de radio 0,35. No se incorpora colisión, navegación ni malla pública.

Planta, sección, oblicua y medidas CPU: `artifacts/graphics/E3b2-candidates/`. Regenerar desde la raíz con `python art/recipes/e3b-walkway-turn-candidate/review.py`. Las vistas son esquemas de receta, no capturas de la app.

## Segunda sonda: marco amplio y uniones explícitas

`inspect-gate.ts` mide el GLB publicado sin render: las jambas de piedra dejan **0,666667** en su eje local; la hoja móvil ocupa Y=0,0133…0,5933 y el dintel Y=0,60…0,72. La abertura lógica de 0,84 que usa el juego es más ancha que el hueco visual existente. Los nuevos apoyos no lo estrechan, pero **ninguna coronación del GLB vigente puede mostrar 0,84 de abertura de piedra**.

`e3b-gate-wide-opening-candidate.json` es una fuente completa alternativa del portón: copia intactos el grupo `gate_door`, sus primitivas, gozne y materiales; sólo estrecha las dos jambas de piedra y sus seis hiladas hasta dejar X=0,08…0,92, anchura **0,84**. Conserva el dintel. Tiene 30 cubos, un cilindro, cuatro materiales y 380 triángulos estimados. La primera sonda la dejó pendiente de exportación y revisión del gozne.

**Revisión posterior autorizada por Vera:** `build-wide-gate.ts` exportó el GLB sólo a `artifacts/graphics/E3b2-candidates/gate-wide-review-01/`, sin sustituir el recurso público. Blender 5.2.1 generó `.blend`, `.glb` y vista aislada. `validate-wide-gate.ts` pasó el validador nativo y GLTFLoader: 48.828 bytes, 380 triángulos, abertura de piedra **0,84000007**, misma geometría y pivote de `gate_door` que el GLB publicado. En **19 posiciones** de la bisagra del juego, cada 5° entre 0° y −90°, ninguna caja envolvente de madera cruza las jambas. Es inspección estática y una vista Blender; falta verla junto a murallas en la app, comprobar la colisión real y resolver la continuidad del adarve. No está aprobada para publicación.

`e3b-gate-crossing-65-candidate.json` cubre el caso actual de semilla 7, eje público X, vecino norte y diagonal suroeste. `e3b-gate-crossing-24-candidate.json` cubre la muestra actual de semilla 91, eje público Z, vecino oeste y diagonal noreste. Cada una tiene cinco cubos, un material y 60 triángulos de cubos estimados. Los pilares ocupan sólo los extremos del vano lógico (0…0,08 y 0,92…1), arrancan en Y=0,72 y llegan al reverso del tablero Y=0,93; quedan 0,1267 por encima del punto alto de la hoja. La sonda comprueba centro, medio radio y circunferencia de un disco de radio 0,35 desde la recta vecina hasta pasar el vértice diagonal: **147.600 puntos por ruta**; los resultados están en `round-2/measurements.json`. El suelo pisa Y=1,02. Con el GLB publicado las dos siguen **bloqueadas por la abertura visual de piedra existente**; con el marco amplio exportado todavía quedan pendientes la integración con muro, la colisión y los árboles.

`e3b-gate-crossing-128-candidate.json` conserva la orientación explícita del caso archivado. La muestra del 22 de septiembre tenía sólo un vecino NO, así que no certifica un recorrido de lado a lado. La muestra actual de semilla 91 ha derivado a máscara **24**, según `round-2/current-topology.json`; esto no demuestra que la máscara 128 sea imposible en otras partidas.

Reproducción desde la raíz, sólo CPU:

```powershell
npx tsx art/recipes/e3b-gate-crossing-candidate/inspect-gate.ts
npx tsx art/recipes/e3b-gate-crossing-candidate/current-topology.ts
python art/recipes/e3b-walkway-diagonal-candidate/study.py
```

La segunda sonda genera recetas, medidas y vistas SVG en `artifacts/graphics/E3b2-candidates/round-2/`. Los SVG del marco enseñan sólo piedra estática; el informe conserva las cajas de la hoja del GLB. No son capturas de la app ni validación de malla exportada.

La exportación de revisión se reproduce sólo con autorización exacta para su
destino y si `gate-wide-review-01/` no existe. La inspección posterior lee el
GLB exportado y escribe `three-validation.json` en esa misma carpeta:

```powershell
npx tsx art/recipes/e3b-gate-crossing-candidate/build-wide-gate.ts
npx tsx art/recipes/e3b-gate-crossing-candidate/validate-wide-gate.ts
```

## Sonda de apoyo y pretiles rectos, 23 sep 2026

`check-wide-support.ts` carga el GLB del marco amplio exportado, lo coloca con
`buildFromAsset` y monta el vecino diagonal mediante `buildDefence` y el
`wall.glb` real. Los pilares de los candidatos 65/24 apoyan en **81/81 puntos
cada uno**, pero las almas originales de ancho 0,34 sólo en **64/81 y 71/81**.
Las fuentes nuevas `make-narrow-web.py` estrechan esas almas a 0,20 sin tocar
las recetas anteriores: el caso 24 llega a **81/81**, el 65 a **72/81**. Sus
nueve puntos sin apoyo están en la costura del vértice, con muro a Y≈0,707
frente a base del alma Y=0,755. La clave de la diagonal colineal no resuelve
automáticamente esta unión distinta; debe diseñarse una clave propia.

`make-guarded.py` añade a esas fuentes dos pretiles en la aproximación recta
de cada portón. `check-guarded.py` barre el disco de radio 0,35 por las rutas
recto→diagonal del estudio: **59.450 puntos por caso, cero choques con los
pretiles nuevos**. Quedan abiertos el pretil del tramo diagonal, la clave de
la costura 65, el contraste de todo el tablero con la malla real, colliders y
la revisión en partida. Son candidatos condicionales, sin exportación ni
autorización para ruta.

```powershell
npx tsx art/recipes/e3b-gate-crossing-candidate/check-wide-support.ts
python art/recipes/e3b-gate-crossing-candidate/make-narrow-web.py
npx tsx art/recipes/e3b-gate-crossing-candidate/check-wide-support.ts --narrow-web
python art/recipes/e3b-gate-crossing-candidate/make-guarded.py
python art/recipes/e3b-gate-crossing-candidate/check-guarded.py
```

Informes y hashes: `artifacts/graphics/E3b2-candidates/round-4/`.

### Puente estructural propuesto para la costura 65

La medición del marco amplio ya colocado por `buildFromAsset` da la jamba sur
en X=0,343…0,657, Z=0,92…1,00 y Y=0…0,72. `make-corbel-65.py` crea otra
variante **separada**: una ménsula X=−0,08…0,50, Z=0,92…1,08,
Y=0,72…0,93. Su extremo sobre la jamba tiene contacto en **29/81 muestras**;
su huella cubre los nueve puntos de costura sin apoyo directo bajo el alma
diagonal. La ménsula empieza en Z=0,92, borde del gálibo público 0,08…0,92,
y su base Y=0,72 queda 0,1267 por encima del punto alto de la hoja aislada.
La sonda conserva las máscaras y transformaciones reales; informe
`round-4/gate-wide-corbel-support.json`.

Esto es **una propuesta de puente por solape**, no una certificación de
capacidad portante, unión de mallas, colisión con el portón en movimiento ni
gálibo en la escena. El cuerpo barrido se había medido para los tableros, y
los dos pretiles rectos nuevos pasan su barrido; todavía faltan los pretiles
diagonales de la transición, revisar la ménsula en malla y aprobar en juego.

```powershell
python art/recipes/e3b-gate-crossing-candidate/make-corbel-65.py
npx tsx art/recipes/e3b-gate-crossing-candidate/check-wide-support.ts --narrow-web --corbel
```

## Variantes mixtas con apoyo de fábrica, 24 sep 2026

Las fuentes explícitas `e3b-gate-crossing-{65,24}-supported-candidate.mesh.json`
son otra propuesta **aislada** para los dos cruces cardinal–diagonal. Parten de
fábrica a suelo fuera del vano público y un dintel Y=0,60…0,94 bajo el tablero
Y=1,02. Cada fuente tiene 100 triángulos, paso libre 0,70 y conserva la
abertura pública 0,84. Los cuatro puertos medidos coinciden con los modelos
cardinales y diagonales acabados; la hoja y el gozne no cambian. Un barrido
geométrico de 91 posiciones de hoja registra cero choques con la propuesta.

Las 10.882 muestras de suelo por pieza caen sobre fábrica o dintel, pero
8.718/8.742 de ellas descansan sobre la luz salvada por el dintel. La distancia
máxima al apoyo inferior es 0,455/0,442. Es una mejora respecto a los 0,631
de la primera propuesta, **no** una certificación de carga. La separación
vertical medida entre la hoja y el dintel es sólo 0,0067, por lo que aún hay
que revisar tolerancias y movimiento en el juego real.

Fuentes y medidas reproducibles: `build-mixed-supported-source.ts`,
`check-mixed-ports.ts` y
`artifacts/graphics/E3b2-candidates/gate-mixed-source-review-02/`. No hay GLB
exportado ni pieza publicada, collider o ruta aprobada.

### Holgura de la hoja

La holgura de 0,0067 de la propuesta anterior no basta como tolerancia
visual. La variante separada `e3b-gate-crossing-{65,24}-clearance-candidate.mesh.json`
va con `e3b-gate-wide-clearance-candidate.json`: el intradós del dintel original
y el nuevo suben juntos a Y=0,63. Medidos por CPU, la hoja conserva forma y
gozne, gira 91 posiciones sin choques y deja **0,0367** de holgura; tablero,
paso, vano y cuatro puertos no cambian. Fuentes y lámina:
`build-mixed-clearance-source.ts` y
`artifacts/graphics/E3b2-candidates/gate-mixed-source-review-03/`.

La lámina muestra una coronación demasiado maciza: 0,57 de franja superior
continua frente a 0,63 de alto libre del vano. La variante queda **pendiente
de diseño visual**, además de exportación, apoyo estructural, colliders y
prueba en partida. No sustituye el portón público.

### Variante ligera del dintel, 24 sep 2026

`build-mixed-light-source.ts` genera dos fuentes nuevas para las máscaras 65
y 24 y `e3b-gate-wide-light-finish-candidate.json` para el portón amplio. La
revisión CPU reduce la franja visible exterior de 0,57 a 0,38, conserva el
vano de 0,84, el paso de 0,70, el tablero a Y=1,02 y cuatro puertos
coincidentes. La hoja conserva gozne y recorrido: 91 posiciones medidas, cero
choques y 0,0367 de holgura. Cada cruce tiene 312 triángulos y un material.

La lámina `artifacts/graphics/E3b2-candidates/gate-mixed-source-review-04/gate-light-sheet.png`
deja ver una silueta más ligera que la propuesta anterior. Son **fuentes sin
exportar**: faltan apoyo estructural completo, colliders, comprobación con
vecinos reales y prueba en escena. No cambian el portón público ni la fase
de madera del cerco.
