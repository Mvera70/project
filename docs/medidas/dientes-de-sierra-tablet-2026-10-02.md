# Dientes de sierra en la tablet: medida y arreglo (v5.65, 2 oct 2026)

**Lo que vio Vera** (Medium @60, 2 oct 2026): «se ve muy mal y con dientes de
sierra todo», con el panel de taller en «resolución 50 %». El ciervo pixelado,
las briznas de hierba con escalera y los bordes del río y de los árboles
dentados. **El aparato**: ALLDOCUBE iPlay 70 mini Ultra, Android 14 (Chrome),
Snapdragon 7+ Gen 2 con **Adreno 725**, pantalla de 8,8″ a 2560×1600 y 144 Hz.

## Qué pasaba

Medium dibuja con la densidad tope en 1,5 y sin MSAA, y la adaptativa podía
bajar hasta la mitad: **0,75 píxeles dibujados por píxel CSS**. En una pantalla
de densidad 2 cada píxel dibujado tapa 2,7 de la pantalla. El navegador los
estira con filtro lineal (comprobado en las capturas: los escalones salen
borrosos, no duros), así que **no es un problema de filtrado por vecino**, sino
de que falta resolución.

Y la adaptativa de v5.28 **bajaba sin mirar si bajar servía**: con cada ventana
de 2 s lenta, otro 15 %, hasta el suelo, en ocho segundos. En un aparato al que
le pesa la CPU (la vida, el envío de llamadas, los vértices) el fotograma tarda
lo mismo a cualquier escala, así que acababa en el 50 % sin ganar nada.

## Medido (Chromium 141 con SwiftShader, aldea 11/21, Medium táctil)

**De qué está hecho el fotograma** (`scene-report`, aldea): 378 mallas
visibles, 156 con sombra, 584 mil triángulos; la hierba son 28 mallas
instanciadas y 182 mil triángulos sin sombra, y el bosque 166 mil. Con la
sonda a 750×1240 y densidad 2: 269–288 llamadas, 517 mil triángulos y 42
programas, **iguales a cualquier escala y con MSAA o sin él**. Las sombras ya
se rehacen cada 4 fotogramas en táctil y la hierba ya va aligerada en Medium:
quitar más de ahí no toca lo que se ve dentado.

**Fotogramas en 30 s** (`gl-probe`, escala fija; por software, así que sólo
compara entre sí):

| | escala 1 | 0,667 | 0,5 |
|---|---|---|---|
| Sin suavizado (Medium hoy) | 24 | 39 | 41 |
| MSAA 4× (`?aa=msaa`) | 16 | 25 | 35 |

Bajar de 0,667 a 0,5 quita el 44 % de los píxeles y da **un 5 %** de
fotogramas: es exactamente la bajada que no paga. En SwiftShader el MSAA cuesta
un 33–36 % (rasteriza en la CPU); en una GPU por teselas como Adreno el MSAA
se resuelve en la memoria del chip, y su coste es otro: **no se decide aquí**.

**La adaptativa en vivo**, sin escala fija, muestras cada 2 s (`*` = la
bajada no pagó y se deshizo):

| Aparato simulado | Antes (v5.54) | Después (v5.65) |
|---|---|---|
| Limitado por CPU (200×300, el coste en los vértices), tres tomas | 0,85 0,70 0,55 **0,50** … y ahí se queda | 1 1 1 1 0,85 **1\*** … y ahí se queda, las tres |

El caso contrario, un aparato limitado por píxeles que tiene que seguir
bajando, no se puede reproducir por software con fiabilidad: a 750×1240 cada
fotograma tarda 800 ms, una ventana de 2 s junta dos o tres y en SwiftShader
vértices y píxeles se pagan en serie en la misma CPU. En una GPU de verdad CPU
y GPU van en paralelo y manda la más lenta: una bajada paga entera o no paga.
Lo guarda la prueba con ese modelo (`max(cpu, gpu · escala²)`) sobre la misma
función pura que llama el renderer.

**El ruido**: la media de una ventana de 2 s con cinco fotogramas baila un
6–10 % entre ventanas, y el valle recién abierto va un 20 % más lento en la
primera ventana que en las siguientes. Con el primer umbral (un cuarto de la
ganancia ideal, reintento al empeorar un 15 %, sin calentamiento) el ruido daba
por buenas dos bajadas inútiles. De ahí los tres TUNE de abajo.

## Lo que cambia

1. **Una bajada tiene que pagarse** (`render3d/adaptive-scale.ts`). La ventana
   que sigue a una bajada la juzga: si el fotograma no se acortó al menos la
   **mitad** de lo que se acortaría con todo el coste en píxeles (que van con el
   cuadrado de la escala), se deshace y no se reintenta hasta que el fotograma
   empeore un **25 %**. Los **8 primeros segundos** del valle no deciden.
2. **El suelo de Medium es un píxel dibujado por píxel CSS** (`profile.ts`):
   `lowestScale` de 0,5 a 1/1,5, igual que High (2 × 0,5). Low sigue bajando a
   0,35: es la opción de quien acepta lo feo.
3. **El panel de taller dice «(CPU)»** tras la resolución cuando la
   adaptativa probó a bajar y no acortó el fotograma: en el aparato es la señal
   de que lo que pesa es la CPU y no los píxeles.

## Antes y después, a la misma toma

Recortes de la página entera (lo que se ve, con el estiramiento del
navegador), ampliados: el ciervo en la hierba de cerca, la iglesia y los
tejados de lejos, la orilla del río. Columnas: **hoy** (suelo 0,5), **suelo
nuevo** (0,667, lo peor que puede pasar con el cambio), **escala 1** (lo que
se espera en la tablet si manda la CPU) y **escala 1 con MSAA** (la lectura
pendiente).

- `aa-img/hoja-390.jpg` — 390×844 a densidad 3
- `aa-img/hoja-750.jpg` — 750×1240 a densidad 2 (la tablet)
- `aa-img/hoja-750-rio.jpg` — la orilla a 750

## Lo que falta medir en la tablet

Con el panel de taller abierto, aldea 11/21, Medium @60, un minuto en cada uno:

1. **Esta versión, sin nada en la dirección.** Esperado si manda la CPU (lo
   más probable con un Snapdragon 7+ Gen 2 y ~270 llamadas): «resolución 100 %
   (CPU)» y los mismos fps que hoy al 50 %. Si dice «resolución 67 %» sin
   «(CPU)», manda la GPU y lo que mejora es el suelo.
2. **`?aa=msaa`** contra lo de arriba. Esperado en Adreno 725: menos de 1 ms
   más por fotograma y los mismos fps si el panel dijo «(CPU)». **Si los fps
   no bajan más de un 10 %, MSAA pasa a Medium** (v5.66, una línea en
   `profile.ts`); si bajan más, se queda como está.
