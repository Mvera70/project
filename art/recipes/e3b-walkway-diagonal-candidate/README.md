# E3b.2b · Tramo diagonal de estudio

Fuente: `e3b-walkway-diagonal-candidate.json`, generada por el script de la carpeta hermana `e3b-walkway-turn-candidate/`. Piedra de la paleta común, escala 1, cuatro cubos, un material y 48 triángulos estimados. La rotación de cubos es propia de la receta; ninguna instancia requiere escala negativa.

El tablero centrado en `(0,5;0,5)` gira 45° en planta, con suelo Y=1,02 y ancho nominal 0,94. Los pretiles dejan 0,72 nominal. Se superpone a la dirección diagonal que usa `defences.ts`, cuyo tramo recortado llega al vértice compartido entre celdas. **El ancho útil de esa junta no está certificado**: falta componer las dos piezas reales, verificar el apoyo del tramo recortado y barrer un disco de radio 0,35 por el vértice y por la transición cardinal. La sonda la marca `rejected_joint`; el ancho nominal de la banda aislada no autoriza exportarla como continuidad ni usarla para ruta.

Las vistas de `artifacts/graphics/E3b2-candidates/e3b-walkway-diagonal-candidate/` son esquemas de cajas CPU; el SVG muestra cajas envolventes de las primitivas rotadas, no silueta de malla ni captura del juego. La revisión posterior debe modelar y medir una pieza de vértice y trazar el disco completo de radio 0,35 por cada transición. Donde el tablero intersecte el tronco dispersado de un adulto, la celda esperará a la tala normal.

## Segunda sonda: dos mitades explícitas

`study.py` genera `e3b-walkway-diagonal-joined-candidate.json` y `e3b-walkway-diagonal-nw-candidate.json`. Son las mitades SE y NO, tres cubos cada una, un material y 36 triángulos de cubos estimados por variante. Se unen en el vértice `(1;1)` sin reflejar una escala. Cada alma de piedra sube desde la corona existente Y=0,755 hasta el reverso del tablero Y=0,93. Los dos suelos quedan en Y=1,02 y las bandas de 0,94 se tocan por una sección completa. La sonda barre un disco de radio 0,35 a través del vértice: 17.280 puntos de apoyo, sin fallo; paso analítico de la banda de 0,94 antes del pretil de un lado: 0,37 por lado útil.

Estado **condicional**: aún hay que comprobar que el alma se apoye en la geometría recortada de `buildDefence`, acortar pretiles según cada cambio de dirección y resolver árboles que crucen el tablero. La sonda revisada comprueba centro, medio radio y circunferencia en **51.840 puntos**; sólo certifica esta junta colineal concreta, sin convertir en válida la transición cardinal→diagonal. Evidencia en `artifacts/graphics/E3b2-candidates/round-2/`.

La comprobación posterior `npx tsx art/recipes/e3b-walkway-diagonal-candidate/check-wall-support.ts` cargó el `wall.glb` y ensambló dos muros reales con `buildDefence` (máscaras 32 y 128). Rayos verticales sobre 95 puntos del alma actual: **73 apoyados y 22 sin muro debajo**. El eje y ±0,12 se apoyan en los 19 cortes; en ±0,17 sólo 8 de 19. Por tanto, la franja de 0,34 del alma **no tiene apoyo continuo** sobre el muro recortado: esta geometría queda rechazada para exportación o montaje. Hace falta estrechar el alma hasta la corona realmente apoyada y diseñar una ménsula que soporte los bordes del tablero, o cambiar la unión con una prueba equivalente. El script devuelve error si encuentra huecos.

## Tercera sonda: alma estrecha y clave de vértice

La pareja nueva `e3b-walkway-diagonal-supported-se-candidate.json` y `e3b-walkway-diagonal-supported-nw-candidate.json` estrecha el alma a **0,20** y añade una `VertexKeystone` sólo en SE. Esa clave cruza el vértice longitudinal `c=1` de `c=0,95` a `1,05` y se solapa con las dos almas. La mitad SE tiene cuatro cubos y 48 triángulos estimados; NO tiene tres cubos y 36 triángulos. Ambas conservan un material, tablero Y=0,93…1,02 y ancho 0,94. Son recetas nuevas; las rechazadas arriba no se sustituyen.

`check-supported-web.ts` carga el `wall.glb` actual y ensambla las máscaras 32/128 mediante `buildDefence`. En una malla longitudinal y transversal de 0,01, hay piedra a Y≥0,754 bajo **2.115/2.121 puntos** del alma. Los seis puntos sin contacto directo están exactamente en `c=1`; una malla de 0,001 alrededor de la costura detecta los mismos seis y apoyo a ambos lados de la clave. El límite superior de vano sin contacto a esa resolución es **0,002**. La clave puentea ese vano y apoya en sus dos extremos muestreados. Esto prueba contacto y geometría en esas muestras; no calcula capacidad portante ni unión física de cubos.

El barrido CPU del suelo SE↔NO pasa un disco de radio **0,35** por el vértice en **51.840 puntos** de centro, medio radio y circunferencia. No detecta hueco ni escalón; sólo se ha modelado un pretil lateral. **Estado: candidato geométrico condicional.** Faltan los cambios de dirección, el pretil interior, el cruce con árboles, el GLB exportado, las colisiones y la marcha en el juego.

Desde la raíz del proyecto, sólo CPU:

```powershell
python art/recipes/e3b-walkway-diagonal-candidate/make-supported.py
npx tsx art/recipes/e3b-walkway-diagonal-candidate/check-supported-web.ts
python art/recipes/e3b-walkway-diagonal-candidate/make-supported.py
```

El segundo paso guarda `artifacts/graphics/E3b2-candidates/round-3/support-grid.json`; el último compara hashes de ambas recetas con los que midió la sonda y escribe `round-3/supported-variants.json`. También deja planta, sección y oblicua SVG de cajas envolventes. Esas vistas no certifican malla ni carga física.

## Dos pretiles para la junta diagonal colineal

`make-two-sided.py` deriva dos variantes nuevas de las mitades apoyadas y añade
el pretil interior en el lado opuesto al existente. Ambos dejan 0,74 de ancho
neto entre pretiles sobre el tablero de 0,94. `check-two-sided.py` monta las
dos celdas del vértice y barre centros de X=Z=0,85…1,15 con radio 0,35,
incluidos medio radio y circunferencia: **17.545 muestras, cero huecos de suelo
y cero choques con pretil**. El alma y la clave no cambian respecto a la sonda
anterior contra `wall.glb`; el apoyo de ambos bordes exteriores no se mide como
capacidad física. Los pretiles deberán recortarse en cambios de dirección.

```powershell
python art/recipes/e3b-walkway-diagonal-candidate/make-two-sided.py
python art/recipes/e3b-walkway-diagonal-candidate/check-two-sided.py
```

Informe con hashes en `artifacts/graphics/E3b2-candidates/round-4/`. Estado:
**candidato geométrico condicional**, sin GLB, colliders ni transición cardinal.
