---
name: calcar-iconos
description: Cómo sacar un icono, un adorno o una viñeta de un prototipo en PNG y dejarlo en la interfaz de modo que se parezca de verdad al diseño. Úsala cuando haya que dibujar o corregir un icono, cuando una pantalla «tenga la estructura pero la estética sea mala», cuando algo «no se parece» al prototipo, o cuando lleves más de dos intentos peleando con un `d=`. Cubre el calco de línea, el recorte de pintura, el dibujo a mano con una pieza repetida, las medidas previas y el bucle de comprobación.
---

# Calcar del prototipo: iconos y adornos

Esta skill sale de una tanda que costó **nueve versiones dibujadas a mano de dos
iconos** —la espiga del grano y la pila de leña de la cabecera— con el dueño del
diseño diciendo «siguen sin estar bien» cuatro veces. Las dos que valieron no se
dibujaron: **se calcaron del prototipo, y con eso salieron a la primera.**

Y volvió a pasar en la página de la crónica, que es la prueba de que no era
mala suerte con dos iconos: se entregó la estructura entera con los colores
correctos y el veredicto fue «la estructura está más o menos conseguida pero la
estética sigue siendo muy mala». Lo que le faltaba —capitular ilustrado,
palmeta, rombos, orla de hojas, viñeta a pluma— estaba pintado en el prototipo
desde el principio. **Un esqueleto con la paleta correcta no se parece al
diseño; el adorno no es el acabado, es la mitad del dibujo.**

El orden de abajo importa, porque la regla 1 es la que ahorra las otras.

---

## 1. Si el dibujo ya existe, no lo deduzcas: cálcalo

**La trampa que costó la tanda entera** fue intentar *deducir* la forma de un
dibujo que ya estaba hecho. Los prototipos de `docs/ui-redesign/ui-prototypes/`
son PNG: el icono está ahí, pixel a pixel. Aproximarlo con trigonometría es el
camino largo y encima sale peor.

```bash
python tools/ui/trace-glyph.py <png> <x0> <y0> <x1> <y1> [bias]
```

Devuelve un `d=` de 24 × 24 listo para meter en un `<symbol>`. Por dentro:
umbral de Otsu, seguimiento del borde de píxel, Ramer–Douglas–Peucker para
quitar la escalera y dos pasadas de Chaikin para redondear. No necesita numpy;
con Pillow basta.

**Pero antes de calcar, decide qué clase de pieza es. Hay dos herramientas y
usar la que no toca es el error siguiente:**

| La pieza es… | Herramienta | Por qué |
|---|---|---|
| Línea o silueta: un icono, una palmeta, un rombo, una rama de orla | `tools/ui/trace-glyph.py` | Sale un `<path>` que toma el color de quien lo usa y escala sin límite |
| Pintura con medios tonos: un capitular ilustrado, una viñeta a pluma, un sello | `tools/ui/cut-art.py` | Calcarla da un borrón negro: no hay una silueta que sacar |

Lo aprendí calcando la página de la crónica: la palmeta y el rombo salieron
perfectos, y el capitular ilustrado —oro y filigrana sobre un cuadrado rojo—
salió como una mancha con jirones, por mucho que le moviera el corte. Era
pintura, no línea.

`cut-art.py` tiene dos modos, y el segundo es el que importa:

```bash
python tools/ui/cut-art.py plain <png> <x0> <y0> <x1> <y1> <salida> [ancho]
python tools/ui/cut-art.py wash  <png> <x0> <y0> <x1> <y1> <salida> [ancho]
```

- `plain` recorta y reescala: para una pieza que trae su propio fondo, como el
  capitular con su cuadrado rojo.
- `wash` es para **tinta sobre papel**, y hace lo único que funciona: tira el
  fondo y **guarda el dibujo como alfa**, tiñéndolo de la tinta del juego. El
  papel del prototipo no es el papel del juego, así que recortar a lo bruto
  deja un rectángulo de otro tono encima de la página; con el alfa se compone
  sobre cualquier papel y conserva los medios tonos del aguado.

**Y un adorno calcado que va como fondo de CSS no puede usar `currentColor`:**
dentro de una `data:` URI no hay color que heredar. Hay que sustituirlo por un
hex literal —muestreado del prototipo, no elegido a ojo— y codificar el SVG con
`encodeURIComponent`, porque un `#` sin escapar dentro de una `url()` rompe la
declaración entera y en silencio.

Tres cosas que hay que saber para que salga bien:

- **`fill-rule="evenodd"` y agujeros, no parches.** Los claros encerrados —la
  testa de un tronco, el ojo de una llave— salen como lazos propios. Con
  `evenodd` son agujeros de verdad y el icono vale sobre cualquier papel. La
  versión anterior rellenaba la testa con `--skin-parchment-deep` y solo
  cuadraba encima de un chip.
- **El `bias` es el mando que de verdad usarás, y es donde entra el gusto.**
  Corre el umbral de Otsu. Hacia abajo la tinta adelgaza y **las juntas claras
  entre piezas pegadas se abren**. Con el corte a secas, la pila de leña salía
  como un solo bulto con tres agujeros —justo el defecto de las versiones a
  mano—; con `-40` aparecen las juntas y se leen los tres troncos. En la espiga
  el dueño eligió `-10` sobre `-20`, `-30` y `-40`: más abajo los granos se
  separan más pero adelgazan, y él los quería gordos. **Saca la tira con cinco
  cortes de golpe** (`0 -10 -20 -30 -40`) y que elija; es un minuto y ahorra
  cuatro rondas.
- **Escribe el recuadro y el corte donde se puedan repetir.** Un calco sin su
  receta no se puede rehacer. En este proyecto viven en
  `tools/ui/icons/regenerar-calcos.py`, que los regenera todos, y además van
  copiados en el comentario del propio `<symbol>` de `public/ui/icons.svg`.

---

## 2. Si hay que dibujarlo a mano: una pieza, repetida con `transform`

A veces el prototipo no tiene el glifo, o hace falta uno que el prototipo no
dibuja. Entonces se dibuja, pero **no generando el `d=` con senos y cosenos**.
Eso dio cuatro fracasos seguidos: una pluma, un romero, una aguja y un helecho.

La forma que funciona es al revés: **una pieza, dibujada una sola vez, repetida
con `translate` y `rotate`.**

```svg
<defs>
  <path id="grano" d="M1 0Q3.4 -2 5.9 0Q3.4 2 1 0Z"/>
</defs>
<g fill="currentColor" stroke="none">
  <use href="#grano" transform="translate(7.5 18.0) rotate(-97)"/>
  <use href="#grano" transform="translate(7.5 18.0) rotate(-17)"/>
  ...
</g>
```

Cambiar la forma del grano es cambiar **un** `d=`. Mover un grano es mover **dos
números**. Eso es lo que permite iterar sin volverse loco.

**Y al escribirlo en el sprite, expande los `<use>` a `<path transform>`.** Un
`<use>` dentro de un `<symbol>` que a su vez se instancia con otro `<use>` es
una referencia en árbol de sombra; el juego se abre en el iPhone del dueño y no
se apuesta un icono a que Safari la resuelva.

---

## 3. Mide el prototipo antes de dibujar, y mide lo que importa

Cuando toque dibujar a mano, tres medidas con Pillow evitan las cuatro
iteraciones. Amplía el glifo ×10 con `Image.NEAREST` y mide **en proporción al
glifo**, no en píxeles absolutos:

| Qué medir | Por qué |
|---|---|
| Largo y ancho de la pieza que se repite | Las mías salieron un 45 % más largas y un 80 % más gordas que las del prototipo |
| **Cuántas hay** | Tres por lado en vez de cuatro cambia la lectura entera |
| La separación entre piezas del mismo lado | Es la que decide si se fusionan |
| El alto del glifo dentro de su caja | El del prototipo ocupaba 18,3 px de 31,5; el nuestro 12,5, y se leía como un adorno |

**La condición de que los granos se cuenten uno a uno**, que es lo que separa
una espiga de una pluma:

```
separación a lo largo del tallo  >  largo de la pieza × cos(ángulo con el tallo)
```

Si la proyección de cada pieza sobre el tallo es mayor que el hueco entre
piezas, se solapan y el dibujo se convierte en un bulto. Con 5,1 de largo a 17°
la proyección es 4,9, y con 5,9 de separación no se tocan.

Y un detalle del prototipo que no se ve si no lo buscas: **el abanico es
asimétrico**. Las piezas de un lado a 17° del tallo y las del otro a 28°, para
que todas barran hacia la punta. Simétrico parece un helecho.

---

## 4. Lo que el sprite de este proyecto hereda, y te va a morder

`.skin-icon` pone `fill: none` **y** `stroke: currentColor` de 1,5 a todo icono,
porque la mayoría del juego son de trazo. Una silueta rellena necesita las dos
cosas explícitas:

```svg
<path d="..." fill="currentColor" stroke="none"/>
```

Sin `stroke="none"` cada pieza sale con 0,75 de contorno por lado y la espiga se
funde otra vez. Este fallo se cuela porque en un visor de prueba propio no pasa:
solo aparece dentro del juego.

Y el sprite vive **dos veces**: `public/ui/icons.svg` y la copia incrustada en
`index.html`. La copia existe porque un `<use>` contra un fichero externo no
carga bajo `file://`, que es como lo fotografía `shot.mjs`. Hay una prueba en
`tests/fast/ui-skin.test.ts` que compara los ids y todos los `d=`, así que **no
se edita uno sin el otro**. Escribe los dos con un script y no a mano.

---

## 5. El bucle de comprobación: grande primero, luego pequeño

El error de método que más tiempo me comió fue **juzgar el dibujo a 21 px**. A
ese tamaño todo lo malo parece aceptable y todo lo bueno parece igual.

1. Un visor propio con el icono a **96, 42 y 21 px**, sobre el papel real del
   chip, **con el recorte del prototipo al lado en la misma imagen**. Sin el
   prototipo delante no estás comparando, estás recordando.
2. Mira la forma en grande. Corrige. Confirma en pequeño.
3. Solo entonces, al juego de verdad:
   ```bash
   npx tsx tools/graphics/bundle-game.ts
   node tools/graphics/shot.mjs --seed 11 --year 50 --settle 7 --answer 1 --out <png>
   ```
   Es donde aparecen los defectos heredados del CSS (§4), que ningún visor ve.
4. `npx vitest run tests/fast/ui-skin.test.ts`.

**Y cuando lleves dos versiones rechazadas, deja de iterar y pon tres variantes
distintas delante del dueño.** No tres matices de la misma: tres decisiones
—la fiel al prototipo, la más legible en pequeño, la más simple—, cada una con
su motivo y su renuncia escritos. En este caso eligió una que yo no habría
elegido, y tenía razón. Un lienzo de `/design` con un artboard por variante es
la forma cómoda de hacerlo.

---

## Dónde queda cada cosa

| Qué | Dónde |
|---|---|
| El calcador de línea | `tools/ui/trace-glyph.py` |
| El recortador de pintura | `tools/ui/cut-art.py` |
| Los adornos de la crónica | `tools/ui/chronicle-ornaments.py` → `src/ui/redesign/chronicle-ornaments.ts` |
| Las piezas pintadas | `public/ui/art/` |
| Los recuadros y los cortes de cada calco | `tools/ui/icons/regenerar-calcos.py` |
| Las variantes dibujadas a mano, por si hay que volver | `tools/ui/icons/variantes.py` |
| El que escribe el sprite y su copia de una vez | `tools/ui/icons/aplicar.py` |
| Los iconos | `public/ui/icons.svg` **y** la copia en `index.html` |
| Los tamaños de caja | `src/ui/redesign/skin.css`, sección «iconos» y la de la HUD |
| Los prototipos | `docs/ui-redesign/ui-prototypes/` |
| La paleta muestreada | `src/ui/redesign/tokens.css` |
| El plan de la piel | `docs/ui-redesign/piel/plan-piel.md` |
| La prueba que vigila las dos copias | `tests/fast/ui-skin.test.ts` |
