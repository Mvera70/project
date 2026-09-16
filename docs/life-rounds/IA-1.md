# IA-1 · Movimiento y destinos fiables

**16 sep 2026.** Segunda fase de `docs/life-ai-implementation-prompt.md`.
Implementada por una sesión de Sonnet sobre el commit `0a45e0c`, con dos
decisiones arbitradas después por el coordinador (§4). Cierra los puntos **2 y
4** de `docs/rework.md` §3.5; el punto 5 (malla contra radio) es de
`render3d/` y sigue pendiente.

---

## 1. Qué se arregló

Los seis puntos de la lista de comprobación de IA-1:

| Punto | Qué pasaba | Qué se hizo |
|---|---|---|
| **Cuerpos en celda libre y conectada** | `anchorOf()` ponía el ancla de un animal en la puerta de su casa más 1,4 celdas en un ángulo del `hash32`; si caía en celda cerrada se quedaba **en la puerta**, a 0,82 celdas del muro, y con la colisión por contorno el animal pasaba el día apretado contra la pared | `terrain.ts` gana `nearestReachable(land, reach, from)`: barrido en anillos cuadrados crecientes, sólo perímetro, determinista por posición y sin hash. `anchorOf` exige libre **y** conectada (`canReach`) |
| **El círculo respeta paredes y esquinas** | — | Ya estaba hecho en la ronda anterior (§3.5.1). No se tocó |
| **Varios sitios y aforo de verdad** | `SELF_OFFER` daba a cada animal **un** punto con `seats: 1`, así que una vaca volvía siempre al mismo palmo exacto | `spotsAround()`: tres o cuatro puntos por animal, de 0,8 a 1,5 celdas del ancla, todos libres y alcanzables; `seats` igual al número de sitios |
| **El aforo se comparte con las personas** | `stepBeasts()` pasaba a `decide()` un `noSeats` **vacío**: todos los animales de un ancla elegían el mismo asiento y se empujaban entre sí sin fin | `village.ts` cuenta ahora en `seats()` personas **y** bestias, y pasa ese mismo mapa a `stepBeasts`. Además `decide` elige asiento **al azar entre los libres** y no siempre el primero |
| **Una intención inalcanzable se invalida** | `decide()` acababa con `return who.doing`: el cuerpo conservaba la intención vieja hasta `GIVE_UP` (600 pasos, 20 s) y volvía al mismo fracaso | Devuelve `null` cuando la intención iba de camino y se dio por eterna; sólo la conserva si ya había llegado. Y `noProgress()` mide el avance cada `PROGRESS_CHECK = 90` pasos (3 s) con espera que se dobla por atasco, hasta el tope de `GIVE_UP`: replanteo escalonado, ni cada paso ni a los veinte segundos |
| **Pausa local siempre alcanzable** | Si `decide()` no encontraba nada, el cuerpo se quedaba de pie | `pauseHere()`: un `Place` efímero con tres sitios a una o dos celdas, en celda libre, y el propio punto de partida como último recurso. Sustituye cualquier `null` de `decide()`, en personas y en animales |

Constantes nuevas, todas con `// TUNE:` y su motivo: `SPOT_COUNT` (3 gallina,
3 cerdo, 4 vaca), el rango 0,8–1,5 celdas de `spotsAround`,
`PROGRESS_CHECK = 90` pasos, `PROGRESS_MIN = 0,3` celdas (el mismo margen que
`TURN_MIN_PROGRESS`, para que las dos cosas llamen «avanzar» a lo mismo),
`PAUSE_SPOTS = 3`, y `reach: 1` en la pausa —por debajo de 0,75 el margen de
llegada (`reach × 0,6`) cae por debajo de `REACHED = 0,45` y un cuerpo podría
vaciar la ruta sin marcarse nunca como llegado.

`body.ts`, `navigate.ts` y `offers.ts` no necesitaron cambios para estos seis
puntos (sí para el arbitraje de §4).

---

## 2. Lo medido

`npx tsx tools/life-report.ts 7 23 97 --days 2`, sobre personas **y** animales,
26 880 cuerpo-segundos por fila. **Muestra corta a propósito**: el dueño del
diseño pidió no parar la sesión con medidas largas, y tres semillas × dos
jornadas bastan para ver estas cuatro cifras moverse. La muestra grande
(seis × cuatro, 92 160 cuerpo-segundos) está en `docs/rework.md` §3.6 y es la
que hay que usar el día que se afine un umbral.

| | centro en muro | círculo en muro | giros > π/2 parado | **parados con impulso ≥ 0,9** |
|---|---|---|---|---|
| antes de IA-1 | 0 | 29 · 0,11 % | 102 · 0,38 % | 2 · 0,01 % |
| IA-1, primera versión | 0 | 20 · 0,07 % | 83 · 0,31 % | **5 · 0,02 %** |
| IA-1 con el arbitraje de §4 | 0 | 20 · 0,07 % | 92 · 0,34 % | **1 · 0,00 %** |

Las tres primeras no empeoran. La cuarta, que era la de esta fase, **sólo baja
de verdad con el arbitraje**: la primera versión la subía.

**Y la medida que de verdad demuestra el mecanismo**, sobre el mismo mundo y
las mismas seis jornadas-semilla, contando cuerpo-segundos con `doing === null`
sea cual sea el impulso:

| | total | de personas | de bestias |
|---|---|---|---|
| antes | 2 686 · 9,99 % | 318 | **2 368** |
| después | 364 · 1,35 % | 323 | **41** |

**Los animales sin nada que hacer caen 57 veces**, de 2 368 cuerpo-segundos a
41. Eso es lo que el dueño ve como «dan vueltas» y «vuelven siempre al mismo
punto»: no era el giro —eso se arregló en la ronda anterior—, era que no tenían
a dónde ir. El número de las personas no se mueve (318 → 323) y no es de esta
fase: es el arranque escalonado de la jornada (`rethinkAt` de 0 a 44) más quien
entra en una escena antes de decidir por primera vez.

**Por qué el umbral de ≥ 0,9 es mala vara de medir aquí**, dicho para que nadie
lo vuelva a usar solo: es un subconjunto raro de un suceso ya raro, y a 26 880
muestras son dos o cinco eventos, o sea ruido. `CLAUDE.md` avisa de esto con
otras palabras. La cifra honesta de esta fase es la tabla de `doing === null`.

---

## 3. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/life-motion.test.ts life-body life-navigate life-needs
                     life-terrain life-orders animals daylife life-staging
  → 9 ficheros, 76 pruebas, todas verdes (incluido el it.fails de life-motion,
    sin tocar)
```

**No se pasó la suite rápida entera, y es deliberado.** El dueño del diseño:
«deja de hacer estas pruebas tan largas… no podemos estar parando a hacer
pruebas de 15, 30, 45, una hora». Queda pendiente para el cierre de la tanda,
con lo escrito en `IA-0.md` §5 sobre el trabajador de vitest que se cae en
paralelo.

---

## 4. Las dos decisiones que el coordinador arbitró

### 4.1 Una pausa no bebe agua — y el hueco estaba en otro sitio

La primera versión de `pauseHere()` calmaba, además de descanso, aburrimiento e
irritación, **un pellizco de sed, compañía y deber** (0,02 cada uno), con el
motivo de «que nadie se quede con la sed a 1,0 mostrada indefinidamente». Eso
tapa el síntoma en vez de arreglarlo: con la sed calmándose de pie, un cuerpo
sediento se queda parado en lugar de ir al agua, y la cifra de §3.6 mejora sin
que el valle mejore. **Rechazado.** La pausa da sólo lo que de verdad da estar
parado un rato.

Y entonces la pregunta correcta: ¿por qué había gente con sed al máximo? Porque
**en todo el valle sólo se podía beber en un sitio y con dos plazas.** `drink`
era una oferta de `seats: 2` y la única clase de edificio que la daba era el
pozo (`BY_BUILDING.well`). La sed sube una vez cada ciento diez segundos para
cada uno y una jornada dura ciento veinte, así que en una aldea de treinta y
cinco hay cola permanente —y si el pozo no está levantado todavía, o se ha
perdido, no hay agua en el mapa—. Los seis de treinta y cinco con sed 1,0 que
`IA-0.md` §1 dejó anotados eran eso.

Dos cambios, y son de contenido, no de decisión:

- **`OFFERS.drink` pasa de 2 a 6 plazas.** Seis es el aforo de `work`, el otro
  sitio donde se junta media aldea, y un brocal con seis alrededor se lee como
  un pozo con gente y no como una cola.
- **El vado da de beber** (`places.ts`, `detectFord`). El vado es una celda de
  tierra con el río al lado y hasta ahora sólo ofrecía `loiter`. **Un río del
  que no se puede beber** era el hueco que estaba detrás de la cifra. Sin hora
  punta: al río se va cuando se tiene sed, no a una hora.

Con eso, la cuarta cifra baja a 1 de 26 880 sin que nada se calme de pie.

### 4.2 Dónde vive el estado de progreso — se acepta, con deuda anotada

El estado del replanteo escalonado (`ProgressState`) **no** se añadió a
`Dweller`, porque `tests/journeys/life-scenes.test.ts` construye un `Dweller` a
mano y `tsc` lo rompía, y ese fichero no estaba entre los autorizados de la
fase. Vive en un `Map<id, ProgressState>` en `village.ts` para las personas y
en `Beast.progress` para los animales.

**Se acepta tal cual, y queda escrito como deuda**, porque el precedente dice
que lo coherente es lo otro: `faceAnchor` sí se añadió a `Dweller` en la ronda
anterior y costó una línea en ese mismo test de jornadas. Tener el mismo estado
en dos formas es lo que rompe el día que aparezca un tercer tipo de cuerpo.
El arreglo, para quien toque `Dweller` la próxima vez: subir `progress` al
`Dweller`, quitar el `Map` de `village.ts` y el campo de `Beast`, y añadir
`progress: freshProgress()` al fixture de `life-scenes.test.ts`.

---

## 5. Lo que queda abierto

1. **§3.5 punto 5**, la malla contra el radio: una vaca colisiona con radio 0,4
   y su malla mide más de una celda, así que la malla puede atravesar un muro
   que el círculo respeta. Es trabajo de `render3d/`, no de `life/`, y hay que
   mirar D.6.2 (un aldeano mide 0,65 celdas) antes de decidir si sube el radio
   o baja la malla.
2. **Sin capturas.** Esta fase cambia cómo se mueven los cuerpos, así que la
   secuencia toca: animales delante de una casa, y la aldea al mediodía con el
   pozo y el vado. No se hizo en esta ronda.
3. **Las personas con `doing === null`** siguen en 318 cuerpo-segundos y no es
   un fallo de movimiento: es el arranque de la jornada. Si molesta en pantalla
   —gente quieta los primeros segundos— es un ajuste de `rethinkAt`, no de
   IA-1.
4. **La deuda de §4.2.**

---

## 6. Qué observación en pantalla refutaría esta fase

Un animal plantado contra una pared un rato largo. Una vaca que vuelve siempre
al mismo palmo exacto de su corral después de varias horas. Dos animales
empujándose sin fin en el mismo punto. Alguien con la sed muy alta de pie sin ir
a ningún sitio más de unos segundos, ahora que hay agua en el vado y seis plazas
en el pozo. O reconstruir el mismo día —misma semilla, mismo número de pasos— y
ver una escena distinta.
