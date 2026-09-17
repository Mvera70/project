# IA-9 · Rodar el valle, y lo primero que se ve es que una de cada cinco personas está de pie creyendo que va a algún sitio

**16 sep 2026.** Ronda de herramienta y arreglo, a petición del dueño del
diseño: «ya sé que no puedes ver la pantalla en tiempo real… ¿podrías inventar
algún tipo de herramienta que haga captura frame por frame para tú después
analizarlo como si fuese realmente un vídeo?».

---

## 1. La herramienta, y por qué no es «más capturas»

Tomar cien capturas ya se podía (`shot.mjs --sequence`). **El problema es
leerlas**: cuesta más mirar cien imágenes que el defecto que se busca, y a la
distancia de la cámara una persona son cuarenta píxeles. Así que la
herramienta hace tres cosas, y las tres juntas son lo que sirve:

1. **`tools/graphics/film.mjs`** rueda fotogramas seguidos del juego real
   —empaquetado, en el navegador, con su render y su capa de vida— y en cada
   uno **le pregunta al juego dónde está cada cuerpo y qué está haciendo**.
2. **El enganche `window.__valleyLife`** (`src/render3d/renderer.ts`) es lo que
   contesta: por persona, posición, velocidad, rumbo, paso, las seis
   necesidades, la intención con su sitio, su oferta, su plaza, si ha llegado y
   **cuántos tramos de ruta le quedan**; por animal, lo mismo en corto; y del
   reparto, el clip que se está pintando y la burbuja que lleva. No puede
   desplazar la simulación: sólo lee valores que el fotograma acaba de
   calcular, no tira ningún dado y nadie de `src/` lo llama.
3. **`tools/graphics/film-sheet.py`** convierte eso en dos cosas legibles: una
   **tira de contactos** con todos los fotogramas en una sola imagen, numerada
   con sus pasos de vida, y un **informe** con las anomalías que la traza
   delata —quién no se movió, quién saltó de sitio, quién giró sobre sí mismo,
   quién fue a algo y nunca llegó— más los fotogramas congelados y los saltos
   de imagen, que salen de comparar píxeles.

**El reloj de la película no es el de pared, es `steps`:** la capa de vida da
treinta pasos por segundo y el enganche los cuenta, así que el tiempo entre dos
fotogramas se sabe exacto aunque la captura tarde lo que tarde. Medido: 1,8
fotogramas por segundo de pared, y en una película de sesenta fotogramas caben
**treinta segundos de vida de la aldea**.

```
npx tsx tools/graphics/bundle-game.ts
node tools/graphics/film.mjs --seed 11 --year 50 --seconds 10 --fps 6 --zoom 6 \
  --out artifacts/graphics/film/x
python tools/graphics/film-sheet.py artifacts/graphics/film/x --width 320 --columns 5
```

## 2. Lo que encontró en su primer rodaje

Semilla 11, año 50, 44 personas, 987 pasos (33 s de vida):

| | |
|---|---|
| muestras (persona × fotograma) | 2 640 |
| quietos (velocidad < 0,05) | 33,7 % |
| **quietos con intención, sin haber llegado y sin estar en ninguna escena** | **18,0 %** |
| quietos parados a charlar (correcto, §11.9) | 9,5 % |
| quietos ya en su sitio (correcto) | 5,0 % |
| personas que lo sufren alguna vez | 36 de 44 |
| **personas clavadas más del 80 % de la película** | **3** |

Y el caso que lo explica, seguido paso a paso —que es lo que siempre funciona
en esta capa—: **la persona 91 pasó los 907 pasos de la película en el mismo
punto exacto** (28,69, 66,47), con la intención «perseguir la gallina
10006», **la ruta a cero**, sin escena, con el clip `idle`, y la sed subiendo
de 0,22 a 0,58 sin que nada la moviera.

**Nada de esto lo veía `tools/life-report.ts`**, que mide la misma capa fuera
del navegador y daba «parados con impulso ≥ 0,9: 0,08 %». No mentía: contaba
sólo a quien **no tiene intención ninguna** y encima con una necesidad al
límite. Estar de pie con una intención muerta no entraba en la cuenta. Es la
regla de `CLAUDE.md` otra vez, en su forma más cara: **una medida que no pasa
por donde pasa el juego no mide el juego.**

## 3. El arreglo, y es una línea

`decide()` empezaba así: si la mejor opción vuelve a ser el mismo sitio y la
misma oferta que la intención de ahora, **devolver esa intención tal cual** —«se
sigue, sin recalcular el camino»—. Correcto para un viaje que avanza, ruinoso
para uno que no: con la ruta gastada sin haber llegado, `want` vale cero, el
cuerpo se queda de pie, y **cada replanteo vuelve a devolver la misma intención
muerta**. Ese atajo estaba *antes* que el descarte de plaza de IA-8 y que el
plazo del viaje, así que ninguno de los dos podía entrar nunca en el único caso
en que hacían falta.

Ahora la intención se conserva **sólo si todavía sirve**: si ya se llegó, o si
queda ruta. Y `village.ts` puede decir además que el viaje ha fallado
(`Chooser.restart`, puesto cuando `noProgress` o el plazo de `arriveBy` lo
dicen), que es el otro camino por el que hay que soltarla.

**Medido, rodando la misma película con el arreglo puesto:**

| | antes | después |
|---|---|---|
| parado con intención, sin llegar, sin charlar | 18,0 % | **15,2 %** |
| de eso, con la ruta gastada | 4,4 % | **2,8 %** |
| **personas clavadas > 80 % de la película** | **3** | **0** |
| personas que no se movieron nada | 1 | 0 |
| recorrido mediano (celdas en 31 s) | 5,4 | **6,6** |

Fuera del navegador, las cifras de siempre no empeoran: centro en muro 0,
parados con impulso 0,05 % (antes 0,06), círculo en muro 0,11 %, giros 0,42 %.

## 4. Lo que queda, y no es lo mismo que se arregló

**El 15,2 % que sobra no es gente sin ruta: es gente con ruta que no anda.** En
otra película —semilla 42, año 50, 62 personas— sigue habiendo **siete personas
clavadas**, y su traza dice otra cosa: ruta de 12, 16 y 21 tramos, `until` que
se renueva (o sea que el replanteo **sí** está entrando ahora), y el cuerpo
inmóvil en el mismo punto, con coordenadas pegadas a un borde de celda junto a
un edificio (25,43/53,50; 31,49/53,52; 31,50/48,43).

Eso ya no es la decisión, es **la dirección**: `seek()` tirando hacia el tramo
siguiente y `avoid()` empujando desde la pared, cancelándose. Está descrito como
riesgo en `village.ts` desde IA-1 y ahora tiene medida y sitio donde mirar.
**Va como IA-10**, y la película es la forma de comprobarlo.

Reparto del 25,6 % de la semilla 42, por sitio: granero 144 muestras, perseguir
un animal 142 (42 de ellas con la ruta a cero, que es el caso del animal que se
mueve y deja la ruta obsoleta), pozo 91, claro del bosque 61, campo 49.

## 5. Y una prueba que pasa a `it.fails`, con su medida

`el devoto reza al menos el doble que el resto` (IA-3) ha caído por segunda
vez con un cambio que no toca el rezo. Ya estaba medido por qué: el rezo es el
1 % del tiempo de la aldea y la muestra de la prueba —dos semillas, tres
segundos— no lo ve; sobre seis semillas la proporción va de 0,6× a 2,7× según
cambios ajenos, y con IA-9 queda en 1,0×. Se deja como `it.fails` **con el
listón del brief intacto**, que es el patrón de `CLAUDE.md`, en vez de bajarlo.
Lo que haría falta para cerrarla está en `docs/task-log.md` §4, punto 0c.

## 6. Qué observación refutaría esta ronda

Una persona clavada más de diez segundos con la ruta vacía. Un replanteo que
devuelva una intención sin ruta y sin haber llegado. Una película en la que el
recorrido mediano baje de las cinco celdas por medio minuto. O el enganche
`window.__valleyLife` cambiando una sola posición del valle: si la película
alterara lo que filma, no serviría de nada.
