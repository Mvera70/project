# E3b · Codos cardinales con contorno exterior

Candidatos nuevos de las máscaras **9 (N/W), 3 (N/E), 6 (E/S), 12 (S/W)**.
La fuente es `generate.py`: reutiliza el cálculo de contorno de
`../e3b-contour-joint-candidate/generate.py` y el formato/piedra del codo
`../e3b-walkway-turn-candidate/e3b-walkway-turn-braced-candidate.json`.
No se modifican ni exportan esas fuentes. Cada orientación tiene su receta
explícita, con rotación geométrica y sin escala negativa.

## Geometría y resultado CPU

El codo base es la unión de tres tableros de sección **0,94**, entre Y=0,93
y **1,02**. Los centros de sus portales son `(-0,5;0,8)` y `(0,8;-0,5)`
en X/Z; su eje pasa por `(0,8;0,8)`. Los otros codos rotan alrededor de
`(0,5;0,5)`. Las recetas usan `(X,-Z,Y)` de Blender, escala 1.

Cada variante tiene **14 cubos, un material stone, 168 triángulos estimados**
antes de exportar: 3 tableros, 5 apoyos, 6 pretiles de contorno. Sus seis
tramos de borde cerrado quedan protegidos y sus dos portales abiertos.

Las cuatro orientaciones obtienen las mismas medidas:

| Medida | Resultado |
|---|---:|
| Suelo | Y=1,02; error 0 |
| Distancia analítica del eje al borde del suelo | 0,47 |
| Distancia analítica del eje al pretil | 0,37 |
| Diámetro libre continuo | **0,74** |
| Radio corporal ensayado | **0,35** |
| Muestras adicionales del disco por orientación | 125.802 |
| Huecos / fallos de cobertura de pretil | 0 / 0 |
| Portales abiertos / bordes protegidos | 2 / 6 |
| Apoyos o componentes sin conexión al muro | 0 |

El barrido no se limita a secciones: calcula la distancia mínima de todos
los segmentos del recorrido al contorno de la unión de suelos y a todos
los rectángulos de obstáculo. Además muestrea centro, radio 0,175 y radio
0,35 cada 0,005 de recorrido, con 120 ángulos por círculo.

## Apoyo contra la pared publicada

`check-real-support.ts` carga los bytes de `public/assets/valley3d/wall.glb`
y ejecuta `buildDefence` para el codo y sus dos vecinos rectos (5/10).
No sustituye la pared por una caja. El muro real alcanza Y=0,88500005,
por debajo del suelo. La sonda de 441 rayos por apoyo obtiene, en cada
orientación, **441/441** en ambos durmientes, **120/441** en ambas ménsulas
y **35/441** en el capitel de esquina. Estas cifras son muestras de contacto,
no porcentaje de carga soportada. Las ménsulas prolongan el muro hasta
la cara inferior del tablero, sin elementos separados.

La conectividad se comprueba primero entre apoyos y pared, **sin utilizar el
tablero como enlace**; después se incorporan tableros y pretiles. Así un apoyo
colgado únicamente del tablero no puede justificar su propio soporte.
Las cajas orientadas y los triángulos del muro se guardan en la evidencia.

## Reproducción

Desde la raíz del proyecto, con Python, Node y dependencias locales instaladas:

```powershell
python art/recipes/e3b-turn-contour-candidate/generate.py
npx tsx art/recipes/e3b-turn-contour-candidate/check-real-support.ts
python art/recipes/e3b-turn-contour-candidate/review.py
```

Los comandos sólo crean archivos nuevos; cuando ya existen verifican igualdad
y rechazan reemplazar evidencia diferente. `loadRecipe` comprueba el formato
de cada receta. No hay invocaciones Blender. `game-dev` no estaba en PATH:
no hay recibo de validación del CLI ni paquete canónico.

Evidencia: `artifacts/graphics/E3b2-candidates/turn-review-01/` contiene
`sources.json`, `real-support.json`, `sweep.json` y doce SVG:
`turn-{9,3,6,12}-{plan,section,oblique}.svg`. Gris representa triángulos del
muro real; las demás piezas son geometría CPU candidata, no captura del juego.
Las tres vistas de la máscara 9 también están en PNG y se inspeccionaron
visualmente. Se reproducen con `python art/recipes/e3b-turn-contour-candidate/render-previews.py`
(requiere CairoSVG local). La sección pasa por el núcleo real en Z=0,5.

## Límites y puerta pendiente

El barrido usa prolongaciones **sintéticas** de tablero y pretil en los dos
conectores; el soporte sí usa paredes vecinas reales. Esto acredita la sección
local de conexión, no el montaje de un anillo completo ni compatibilidad con
todos los vecinos publicados. Las prolongaciones ocupan media celda vecina:
una integración futura debe resolver propiedad del tablero y pretiles sin
apilar dos juegos de bordes interiores.

No se ha medido la dispersión de troncos reales para una celda concreta. El
volumen completo de tableros y apoyos debe contrastarse con el bosque adulto
antes de admitir una colocación; si coincide, queda **condicionada a la tala
ordinaria**, sin borrar árboles ni reducir recursos. La huella nominal de
tablero es 1,77×1,77; los solapes de pretiles añaden hasta 0,055 en extremos,
por lo que la comprobación debe usar las cajas guardadas, no sólo esa huella.

Contacto y adyacencia no calculan resistencia estructural. Tampoco validan
terreno, colisiones, navegación, flechas, coste móvil, exportación, inspección
GLB o revisión humana. Las cuatro variantes pasan la geometría CPU local y
permanecen **candidatas sin exportar ni publicar**.
