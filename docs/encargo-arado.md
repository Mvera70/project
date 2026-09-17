# Encargo de arte · el arado (y qué hacer con el barril)

**Para la sesión de Blender.** 17 sep 2026. Lo pide el juego de los medios
(`docs/plan-medios.md`, `docs/design.md` §7.12): el jugador **da cosas al valle**
y el arado es la primera y la que más cambia la partida —de 38 a 61 habitantes
de mediana, medido— así que es la que más se nota que no se ve.

**El barril ya está casi hecho** (dicho por el dueño del diseño), así que este
documento va del arado; al final hay una nota de tres líneas con lo único que el
barril necesita del lado del juego.

---

## 1. Qué es, en una frase

**Un arado de vertedera de madera con reja de hierro, tirado a mano** —sin
bueyes, porque en este valle no hay— apoyado en el borde de un campo cuando no
se usa. No es una máquina: son dos varas, un cuerpo de madera, una cuchilla y un
mango.

**Por qué así.** El valle es del siglo IX–XI inglés (§1, «medieval inglés», señor
de Wealdmere) y no tiene bueyes en ningún sitio del catálogo: hay vacas de leche
(`cow`) y un carro de mano (`handcart`) que ya establece la convención de «lo
tira una persona». El arado tiene que leerse como **de la misma familia que ese
carro**: madera de tablón, herrajes oscuros, varales apoyados en el suelo.

**Lo que el arado significa en el juego, por si ayuda a decidir el gesto:** no
hace crecer la cosecha, **libera manos** —un campo se trabaja con la mitad de la
gente—. Así que si algo tiene que decir la silueta, es *«esto hace el trabajo de
dos personas»*, no *«esto es una fábrica»*.

---

## 2. Las medidas, que son lo que no se puede improvisar

| Qué | Cuánto | De dónde sale |
|---|---|---|
| **Una celda del mapa** | 3 m | §D.6.2 |
| **Un aldeano de pie** | 1,95 m = 0,65 celdas | §D.6.2, y es la referencia de todo |
| **Largo total del arado** | **2,4 m** (0,8 celdas), varales incluidos | Que quepa junto a un campo de 3 × 2 celdas sin invadirlo |
| **Ancho** | **0,9 m** (0,3 celdas) | Un surco, no una cosechadora |
| **Alto** | **1,0 m** (0,33 celdas) al extremo del mango | La mitad de un aldeano: se lee como herramienta y no como edificio |
| **Huella declarada** | `footprint: [1, 1]` | Como la azada y el carro de mano |

**Comprobación rápida antes de aprobarlo:** puesto al lado del `villager`, el
mango tiene que llegarle a la cintura. Si le llega al pecho, está grande; si le
llega a la rodilla, está pequeño y a 390 px de ancho no se distingue del suelo.

---

## 3. Las piezas, de atrás hacia delante

1. **Dos varales** (las varas de tirar), 1,2 m, saliendo hacia delante en «V»
   muy abierta —unos 18° entre ellas— y **apoyados en el suelo**: el arado está
   parado, y un varal en el aire dice que alguien lo está tirando.
2. **El cuerpo**, un tablón de 0,9 × 0,25 m tumbado, que es lo que une los
   varales con la reja.
3. **La reja** (la cuchilla), de hierro, 0,35 m, clavada hacia abajo y **algo
   girada** —15° respecto al eje— porque un arado echa la tierra a un lado. Es
   la única pieza que no es madera y la que dice qué es esto.
4. **La vertedera**, una tabla curva pequeña detrás de la reja, del lado al que
   la tierra se echa. Con dos o tres caras basta: a esta distancia una curva
   suave y una curva de tres tramos se ven igual.
5. **El mango**, una vara de 1,0 m saliendo hacia arriba y atrás, con un
   travesaño corto arriba (0,3 m) para las dos manos.

**Lo que no lleva:** ruedas (ésas son del carro de mano), cadenas, correas,
yugo, ni asiento. Y ni un remache visible: a 0,8 celdas de largo en cámara
isométrica, un remache es un píxel sucio.

---

## 4. Materiales, y sólo estos

De `art/recipes/palette.json` (P1, §D.2.1). **Tres materiales como máximo**, que
es lo que mantiene la instanciación barata:

| Nombre en la receta | `role` | Para qué |
|---|---|---|
| `wood` | `timber` | Varales, cuerpo, mango, travesaño |
| `plank` | `soil` | La vertedera, para que se distinga del resto de la madera |
| `iron` | `timberDark` | La reja |

Es la misma pareja de roles que usa la azada (`art/recipes/hoe/hoe.json`) más el
tono de tablón del carro de mano. **No se añaden colores nuevos a la paleta por
esto.**

---

## 5. La receta, el eje y el presupuesto

- **Formato:** una receta como las demás, `art/recipes/plough/plough.json`,
  `schemaVersion: 1`, `mergeByMaterial: true`, `palette: "../palette.json"`.
  Copia la estructura de `art/recipes/handcart/handcart.json`, que es el vecino
  más parecido: escrita en metros y con `scale: 1/3` para llevarla a celdas, con
  su `scaleNote` diciéndolo.
- **Origen:** centrado en planta, **apoyado en el suelo** (`y = 0` en la base de
  los varales y de la reja). El juego lo posa en una celda y no lo levanta.
- **Orientación:** mirando a **+z**, igual que el resto del kit. La reja hacia
  delante, el mango hacia atrás.
- **Presupuesto:** **≤ 400 triángulos.** La azada anda por ciento y pico y el
  carro de mano por seiscientos; un arado está entre los dos. Cilindros de 6
  lados (`vertices: 6`), como el resto del catálogo. El límite existe por la
  memoria de vértices, no por los milisegundos (§D, la corrección del
  presupuesto).
- **Sin animación y sin clips.** El arado es un trasto quieto, como el carro.
- **`id`: `plough`** y `metadata.kind: "plough"`, con una `note` que diga de qué
  ronda sale, como todas.

---

## 6. Cuándo se ve, para que el gesto tenga sentido

- **El día que el jugador lo da**, el valle lo cuenta («A plough came into the
  valley…») y §11.5 reúne a la gente.
- **Después, siempre**: apoyado en el borde del **campo más viejo** de la aldea.
  Quieto. Es el recordatorio de que ese valle tiene una cosa que otro no.

Ese «apoyarlo en el campo» es trabajo de la capa de vida (`life/props.ts`), y
está encargado aparte en `docs/dos-sesiones.md`. **Lo único que hace falta de
Blender es la malla.**

---

## 7. Cómo entra en el juego cuando esté

En este orden, y los tres pasos están escritos en `docs/dos-sesiones.md` §«Las
tres fronteras»:

1. `npm run art` construye la receta y deja la malla aprobada.
2. `npm run assets:publish` la mete en `public/assets/valley3d/manifest.json`
   con su `sha256` — **y desde VZ-6 ese hash va en la dirección con la que el
   juego la pide**, así que un modelo nuevo no puede servirse viejo.
3. `WANTED` en `src/render3d/renderer.ts` y la lista de
   `tools/graphics/bundle-game.ts`: una línea en cada uno, y **sólo esa línea**
   (es un fichero de dos dueños).

Cuesta unos 300 KB de descarga en la instalación, como los demás.

---

## 8. El barril: lo único que falta del lado del juego

Cuando esté la malla, que se llame **`barrel`** y siga las mismas reglas de §4 y
§5 (madera `timber`, aros `timberDark`, ≤ 250 triángulos, origen en el suelo).
En el juego ya existe todo lo demás: el medio (`ale`), su coste, la fiesta que
provoca esa misma semana (`ale_feast`) y la reunión en la plaza de dos días. Lo
que falta es ponerlo **en medio de esa reunión**, y eso es `life/props.ts`.

**Y una medida por si sirve para decidir el tamaño:** la fiesta dura dos días de
juego y la cámara de reposo enseña 26 celdas de ancho. Un barril de 0,9 m de
alto (0,3 celdas) se ve; uno de 0,5 m es una mancha.
