# El rey, medido (K-6)

**24 semillas × 60 años, política `prudent`.** Cada variante corona al primer
candidato posible —con el oficio que da ese estilo— la primera semana en que
`crownRefusal` lo permite, y no da nada más. `nada` es el mismo valle sin tocar.
Medido el 18 sep 2026 con `tmp/reyes.ts`, sobre el árbol de K-5.

El criterio del plan (`docs/historico/plan-rey.md` §K-6) es **distancia lateral, no
escalera**: cada estilo tiene que tener una firma que un tercero distinga, y
ninguno puede ganar a los otros tres a la vez.

---

## 1. La tabla, al cerrar K-6

Medianas de las 24 partidas.

| Variante | Pob. | Casas | Muralla | Campos | Grano | Fe | Sala (de 24) | Año de la corona |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **nada** | 42 | 10 | 24 | 7 | 2 272 | 34 | 0 | — |
| **rey herrero** | 38 | 9 | **45** | 7 | 2 684 | 34 | 0 | 27 |
| **rey del campo** | 37 | 8 | 34 | 7 | 2 656 | 34 | 0 | 27 |
| **rey cura** | 43 | 9 | 43 | 8 | 2 755 | **83** | 0 | 27 |
| **rey de corte** | 37 | 7 | 28 | 7 | 2 283 | 34 | **4** | 27 |

Muertas: 1 de 24 en todas las variantes salvo el cura (1) — el rey **no apaga el
caos**, que es el criterio 2 del plan, y tampoco lo enciende.

## 2. Qué cumple

- **La corona llega a tiempo.** Año mediano 27, dentro de la ventana de 15 a 30
  que el plan pedía. Con treinta personas y treinta de plata, coronar es una
  decisión de generación y no una compra.
- **El herrero tiene firma.** 45 tramos de muralla contra 24 sin rey: casi el
  doble, y se ve desde la cámara de reposo sin leer una cifra.
- **El cura tiene la firma más clara del juego.** Fe 83 contra 34. Con eso la
  capilla llega sola (pide 45) y el valle se lee distinto.
- **La sala es del noble.** Sólo su estilo la levanta, en 4 de 24 valles, y la
  paga: es el que menos casas tiene (7 contra 10).
- **Y el caos no baja.** Las muertas no se mueven y los sucesos tampoco.

## 3. Qué no cumple, y queda anotado

**El rey del campo no tiene firma**, y es lo único de las cinco fases que no
llegó. Su historia completa, porque cada intento se midió:

1. `PLOUGH_FIELDS` (sembrar un 30 % más ancho) **no mueve nada** en una aldea
   hecha: §5.2 trabaja `min(campos, necesarios, dotables)` y con cuarenta
   personas los siete u ocho campos que hay ya están todos trabajados. Veinte
   manos en el campo con rey y sin él.
2. `PLOUGH_MORE_FIELDS` (dos campos más de los ocho de §12) **tampoco**: el valle
   mediano no llega ni a los ocho, así que levantar el tope no cambia nada. Lo
   que limita no es el permiso, es la madera y las manos.
3. `PLOUGH_MORE_GRANARIES` (un granero más) **tampoco se ve**: tres graneros y
   2 750 de bodega en las cinco variantes. La cuenta del granero vive dos veces
   —en `withinCap` y en la cola de §7.3— y hasta arreglar la segunda no llegaba;
   arreglada, el valle sigue sin construir el cuarto, porque para pedirlo tiene
   que tener el tercero lleno al 80 % **y** madera a mano, y las dos cosas juntas
   pasan pocas veces.

La conclusión es del dueño del diseño y está anotada: **el rey del campo necesita
un efecto que no sea un permiso**. Lo que este motor tiene y no se ha usado es la
cosecha por campo (`FOOD.FIELD_YIELD`) y el reparto de manos; tocar la cosecha es
«un número mejor» y el plan lo descartó para los medios (§7.12), pero para un rey
puede ser justo lo que se quiere. **No se toca sin que él lo decida.**

**Y el cura seguía siendo una mejora limpia** hasta que se le puso precio: fe 82,
población 49 y más grano que cualquiera, con la mitad de ánimo en las fiestas como
único coste, que es invisible porque las fiestas son pocas. Ahora la obra le rinde
un 10 % menos (`CROWN.CHAPEL_WORKS`): las manos que están en la capilla no están
en el andamio. Con eso baja de 49 a 43 de población y sigue siendo el estilo más
suave, que para un valle devoto está bien.

## 4. Lo que se arregló por el camino, y era un impuesto

**La sala costaba dos o tres casas a todos los reyes.** Con cualquier rey, la
aldea la pedía en cuanto tenía treinta personas: doscientos de madera y ciento
sesenta de obra, y como las casas son el techo de la población, coronar bajaba la
población de 42 a 31–39 **en las cuatro variantes**. Eso no es una elección, es
un impuesto por coronar. Medido:

| | Casas | Pob. |
|---|---:|---:|
| Sin rey | 10 | 42 |
| Con rey, sala para todos | 7–8 | 31–39 |
| Con rey, sala sólo del noble | 7–9 | 37–43 |

---

**Lo que falta para cerrar K-6 del todo** es lo que el plan dice que no cabe en un
script: que el dueño del diseño juegue una tarde y diga si se nota quién manda.
