---
name: sonido-del-valle
description: Cómo se fabrica, se mide, se hace escuchar, se elige y se integra un sonido en The Valley — la paleta que Vera aprobó (foley de materiales, sin notas afinadas), el bucle de aprobación, las medidas obligatorias y las trampas que ya costaron cuatro tandas descartadas. Úsala antes de tocar `src/ui/sound.ts`, `tools/ui/sounds.py` o `public/audio/`, al añadir cualquier sonido nuevo —de interfaz, de ambiente, de vida o de combate—, al montar capas de ambiente, y cuando Vera pida sonido o diga que algo «suena mal».
---

# El sonido del valle: se fabrica a ciegas, así que se mide y se escucha

**Quien programa esto no puede oír lo que hace.** Ésa es la premisa y el motivo
de toda la disciplina de abajo. El sonido es lo único del juego donde la
comprobación no puede ser una captura: hay que medirlo con números y dárselo a
Vera para que lo escuche, **antes** de integrarlo.

Lo que costó no tenerlo claro: **cinco tandas descartadas** entre el 24 y el 29
de septiembre de 2026, de las cuales cuatro se podrían haber evitado midiendo lo
que esta skill obliga a medir.

---

## 0. La historia, porque cada rechazo es una regla

| Fecha | Qué se hizo | Qué dijo Vera | La regla que dejó |
|---|---|---|---|
| U-09 (14 sep) | Síntesis **en vivo** con Web Audio: viento, río, yunque, campana | «El audio ese es malísimo, el de fondo es hasta incómodo; hay que sustituir o borrar el sistema al completo» | **Nada de síntesis en vivo.** Se fabrica fuera, se escucha, y sólo entonces entra |
| 24 sep | Se borró todo y quedó el hueco | — | El hueco (`CUE_FILES` vacío) es un estado válido: no suena nada y no falla nada |
| 29 sep, tanda 1 | 20 sonidos: marimba apagada, cuerda de tripa, bronce agudo, papel | «No me gusta ninguna» | Un ataque de 3 ms y los agudos cortados a 9 kHz suenan **romos**, a fieltro |
| 29 sep, botón tanda 1 | 6 candidatos de madera **saturada** (tanh, drive 2,5–3,5) | «No me gusta ninguna» | Una saturación fuerte en un transitorio corto **cruje**, no llena |
| 29 sep, botón tanda 2 | 5 candidatos con chasquidos secos hasta 10 kHz | «No me gusta ninguna» | Un chasquido de 1 ms y 10 kHz suena a **ratón de ordenador**, no a juego |
| 29 sep, botón tanda 3 | 5 candidatos blandos con **notas afinadas** (gota, marimba, kalimba, tecla) | «Sigue sonando como muy infantiles… como de juego de niños pequeños» | **Un tono puro afinado entre 600 y 1300 Hz con cola es una caja de música.** Es la trampa que más veces cayó |
| 29 sep, botón tanda 4 | 5 candidatos de **foley de materiales**: cera, cofre, cuero, tambor, piedra | «Menos el N [tambor]. Conserva todos, me gustan mucho, sigue por ahí» · y luego «magnífico» | **La paleta.** Ver §1 |
| 29 sep | Los 20 rehechos con esa paleta; el botón genérico | «Eligo el K» (sello de cera) | El bucle de §3 funciona: probar **un** botón sale mucho más barato que rehacer veinte |

**La lección que resume las otras:** cuando algo no gusta, no hagas otra
variante de lo mismo. **Cambia de familia** y pon cinco familias distintas en la
misma página. Tres de las cuatro tandas de botón fallaron por ser parientes de
la anterior.

---

## 1. La paleta que manda (y lo que está prohibido)

**Foley de materiales. Ninguna nota afinada**, salvo las campanas de bronce
graves de los hitos.

Cada material tiene su papel, para que la interfaz se aprenda de oído:

| Material | Suena en |
|---|---|
| **Piedra sobre madera** (ficha en un tablero, con su rebote) | Los toques: pestañas, fichas de persona, pausa, velocidad |
| **Cofre de madera** (pestillo de hierro, golpe hueco, la tapa que asienta) | Abrir y cerrar: hojas, portada |
| **Cuero y hebilla** (correa que se cierra, hierro que tintinea una vez) | Lo que llega y se contesta: ofertas, arreos del camino |
| **Sello de cera** (golpe sordo, y la cera que se despega al soltar) | Lo que se decide y se acepta; **el botón genérico (elección de Vera: «el K»)** |
| **Madera hueca** (dos golpes en una puerta) | La pregunta y la negativa |
| **Campana de bronce, grave** | El tiempo que pasa: hitos, década, siglo |

**Los tres números que no se negocian** (los aplica `master()` en
`tools/ui/sounds.py`):

1. **Nada por encima de 4,8 kHz.** Por ahí sólo entra filo.
2. **Nada por debajo de 110 Hz.** Un altavoz de móvil no lo da y sólo hace bulto.
3. **El cuerpo de cada sonido, entre 350 y 700 Hz**, que es lo grave que un
   teléfono sí reproduce.

**Prohibido, por experiencia medida:**

- **Notas afinadas agudas con cola.** La trampa de «infantil». Si necesitas
  altura, que sea una campana grave o que no tenga altura definida.
- **Saturación** (`tanh`) sobre un transitorio corto. Cruje. Si te pasas del
  techo, **baja el sonido entero**, no recortes.
- **Realce de presencia** a 2–3 kHz. Se probó y añade filo.
- **Ataques de 0,2 ms con ruido hasta 10 kHz.** Suena a interfaz de sistema
  operativo. El contacto va entre 600 y 3200 Hz con 0,5–1,5 ms de ataque.
- **Voces sintéticas** (personas o animales), y **también el bullicio hecho de
  actividad**: se probó (golpes, pasos, cacharros, rumor) y fue «horrible».
  Una aldea que se oye es gente grabada o generada; hasta entonces, calla.

---

## 2. Las herramientas

| Herramienta | Qué hace | Cómo se lanza |
|---|---|---|
| `tools/ui/sounds.py` | **Fabrica los sonidos.** Materiales modelados con numpy, nivelados en la banda del teléfono, a `public/audio/*.mp3`. Determinista byte a byte. Sella la huella de cada fichero en `sound.ts` | `python tools/ui/sounds.py [--audition] [--stamp] [--only <ids>]` |
| `tools/ui/sound-check.mjs` | **Comprueba que suena lo que toca, cuando toca.** Recorre la interfaz con clics de verdad en Chromium y lee `window.__valleySound` | `node tools/ui/sound-check.mjs --chrome /opt/pw-browsers/chromium [--headed]` |
| `tests/fast/sound.test.ts` | Las propiedades puras del *cuándo*, que los ficheros existen, su huella y el presupuesto de peso | `npx vitest run tests/fast/sound.test.ts` |
| `tests/journeys/sound-long.test.ts` | El acento en sesenta años de motor (25 s: no cabe en la rápida) | `npx vitest run -c vitest.journeys.config.ts tests/journeys/sound-long.test.ts` |
| La hoja de análisis | Espectrograma, forma de onda, centroide, % por encima de 4 kHz y **% en la banda del teléfono**. No está versionada: se escribe en el cuaderno de la sesión | ver §4 |

**Dependencias:** `pip install numpy scipy soundfile` (y `matplotlib` para los
espectrogramas). No están en el contenedor por omisión.

---

## 3. El bucle, y no te lo saltes

```
   una familia nueva            un sonido más de una familia aprobada
   ─────────────────            ────────────────────────────────────
   1. cinco familias                 1. receta en sounds.py
      DISTINTAS, un solo botón       2. medir (§4)
   2. medir (§4)                     3. integrar y comprobar (§6)
   3. página de escucha (§5)         4. decírselo a Vera
   4. Vera elige o descarta
   5. sólo entonces, los demás
```

**La regla de oro: un botón antes que veinte sonidos.** Rehacer los veinte
costó una ronda entera; probar un botón con seis candidatos cuesta diez minutos.
Cuando la dirección esté en duda, **siempre** un solo botón.

**Y cinco familias distintas, no cinco variantes.** Si la tanda anterior no
gustó, la siguiente no puede ser su prima.

---

## 4. Medir: qué números y qué significan

Sin oído, esto es lo único que separa un sonido de un ruido. **Se mide antes de
enseñar nada.**

| Medida | Valor que se quiere | Qué falla si no |
|---|---|---|
| **% de energía entre 350 Hz y 6 kHz** | **≥ 90 %** | En un móvil suena mudo. Cuatro sonidos de la primera tanda tenían 33–72 % |
| % por encima de 4 kHz | < 1 % en un cuerpo · **< 2 % en un roce** (cera que se despega, pergamino) | Filo, fatiga, «ratón de ordenador» |
| Centroide espectral | 350–1300 Hz | Por debajo, se pierde en el móvil; por encima, chilla |
| Pico | ≤ −1 dBFS | Recorte |
| Primera y última muestra | 0,0000 | Un clic al empezar o al cortar |
| Duración | Toque 0,05–0,12 s · navegación 0,1–0,3 s · confirmación 0,15–0,5 s · llamada 0,3–0,9 s · hito 1–2,6 s | Un toque largo cansa; un hito corto no se oye |

**El nivel se mide en la banda del teléfono, no en la señal entera.** Dos
sonidos igual de fuertes con auriculares pueden sonar uno el doble que el otro
en un iPhone, y el iPhone es donde se juega. Lo hace `band_rms()` en
`sounds.py`.

**Mira el espectrograma, no sólo los números.** Un ataque sano es una columna
vertical de banda ancha en los primeros milisegundos, y el cuerpo muere en
60–150 ms. Una mancha horizontal larga y estrecha es una nota: revisa que
quieras una.

---

## 5. La página de escucha: cómo se le pide a Vera que elija

Sin esto no hay decisión posible. Es un artifact publicado, con los MP3
**incrustados en base64** (no puede pedir ficheros por la red).

Lo que la página tiene que llevar, por experiencia:

- **El contexto real**, no una lista. Para un botón, la placa de madera del
  juego, que se hunde al pulsar y suena al apretar y al soltar.
- **Tres variantes de cada sonido** (a / b / c) y, en una familia nueva, **cinco
  familias distintas**.
- **Un interruptor de «como en el altavoz de un móvil»**, que filtra por debajo
  de 350 Hz: es la escucha que decide.
- **Variación de tono de ±3 %** por toque, para que diez seguidos no suenen a
  ametralladora.
- **Qué suena en cada momento del juego**, en una línea por sonido.
- **Un resumen copiable** con la elección, para que Vera lo pegue en el chat.
- Se **republica en el mismo enlace** cuando hay tanda nueva: un enlace por
  tema, no uno por intento.

El generador de la página vive en el cuaderno de la sesión, no versionado; lo
que sí está versionado es el generador de los sonidos.

---

## 6. Integrar: cómo entra un sonido en el juego

1. **La receta** en `tools/ui/sounds.py`, con un comentario que diga de qué
   materiales está hecho y por qué ése y no otro.
2. **El identificador** en el tipo `Cue` de `src/ui/sound.ts`, y su fichero en
   `CUE_FILES`.
3. **La huella.** Cada entrada lleva `?v=` con el `sha256` del fichero, porque
   **el service worker sirve de la caché primero** (§13.4): sin ella, cambiar
   un sonido no llega nunca a un teléfono que ya tenía el viejo. La reescribe
   `python tools/ui/sounds.py --stamp` y la vigila `sound.test.ts`.
4. **Un botón sin voz propia suena a sello**, y no hay que hacer nada: el
   genérico (`ui_button_press` / `ui_button_release`) se engancha solo a todo
   `<button>` de la página. Si el botón nuevo **sí** tiene su propio sonido,
   añade su selector a **`OWN_VOICE`** en `sound.ts` o no sonarán los dos. La
   lista está en un único sitio a propósito: un atributo repartido por siete
   ficheros no se ve, y un botón que suena dos veces tampoco se ve — se oye, y
   nadie que programa esto lo oye. Para eso está el paso `forbidden` del
   recorrido (§2): comprueba que el sello **no** se pone encima.
5. **El disparador.** Una función **pura** que diga *cuándo* suena
   (`routeCue`, `speedCue`, `playerAnswer`, `accentFor`, `milestoneCue`…), y su
   llamada en el sitio que ya manda sobre ese momento. Nunca un `sound.tap`
   suelto dentro de un manejador de clic si hay un punto único por el que pasa
   esa acción.
6. **La prueba**, que describe la propiedad del diseño: «abrir y cerrar son dos
   sonidos distintos», no «`routeCue` devuelve tal cadena».
7. **El recorrido**: añadir el paso a `tools/ui/sound-check.mjs` y comprobar que
   sale verde. **Una prueba que llama a la función no sabe si el juego la
   llama** (CLAUDE.md); esto sí lo sabe.
8. **El papel**: `docs/design.md` §11.10 si es de interfaz, `plan-audio.md` /
   `plan-audio-mundo.md`, el changelog y `task-log.md`.

**Los dos fusibles, y por qué son dos.** Los acentos del juego (encrucijada,
oferta, hito) pasan por `SOUND.ACCENT_MIN_GAP_MS` (2,5 s): son voces del mundo y
no deben apilarse. Los toques del jugador pasan por `SOUND.TAP_MIN_GAP_MS`
(70 ms): quien toca espera oírlo **aunque acabe de sonar un hito**. No los
mezcles.

**Y lo que el juego hace solo no suena como un toque.** La caza y el final
cambian la velocidad; la encrucijada cierra la hoja para abrirse. Por eso el
sonido de navegación vive en `actions.navigate` (lo que llama quien toca) y no
dentro de `navigate` (que también llama el juego).

---

## 7. Las trampas que ya costaron tiempo

- **El cuerpo del sonido cae donde el móvil no llega.** La trampa número uno:
  pasó en las dos primeras tandas y en cuatro de los veinte. Mide siempre el
  % en la banda del teléfono.
- **Editar un fichero con el servidor de pruebas corriendo** recarga la página y
  deja el recorrido de Chromium colgado a la mitad. Termina la comprobación
  antes de tocar nada.
- **iOS sólo abre el audio dentro del gesto.** Chrome deja arrancar al bajar el
  dedo; Safari, sólo al levantarlo. Por eso `installSound` se engancha a
  `pointerdown`, `pointerup` **y** `click`, y suena un búfer vacío de una
  muestra dentro del gesto.
- **Un `<audio>` en iPhone separa el toque de su sonido.** Por eso Web Audio.
- **Un sonido que llega tarde se lee como un fallo**, no como una respuesta: si
  el fichero no estaba descodificado, `SOUND.LATE_PLAY_MS` (250 ms) lo descarta.
- **MP3 y no WAV.** Pesa la cuarta parte y libsndfile escribe la cabecera LAME
  con el retardo del codificador: medido, cero muestras de desfase.
- **El tono varía o suena a ametralladora.** Para una serie (las cuatro
  velocidades) usa `playbackRate`; para repeticiones, ±3 %.

---

## 8. El mundo suena distinto que la interfaz

Lo de arriba vale para un sonido de un solo disparo. **Un ambiente no es eso**, y
el reproductor de hoy **no sabe hacerlo todavía**: no tiene bucles, ni capas con
su ganancia, ni fundidos, ni posición. Construirlo es la fase 0 de
`docs/plan-audio-mundo.md`.

**Un bucle no puede latir al dar la vuelta, y eso no se puede oír desde aquí**,
así que se resuelve por construcción y no escuchando:

- la **costura se pliega en la fábrica** (`seamless` en `sounds.py`: se genera
  una cola de más y se cruza sobre la cabeza — para una textura de ruido eso es
  exacto, no una aproximación);
- toda modulación lenta es **periódica en el bucle** (`wobble` usa un número
  entero de vueltas), o la costura vuelve por otro lado;
- **nada de fundidos en los bordes**: el `master()` normal apaga el final, y en
  un bucle eso es un latido cada vez;
- el **relleno del codificador** se recorta con `loopEnd`, y por eso la
  duración de cada bucle viaja con su fichero (`LOOP_FILES` en `sound.ts`);
- cada capa arranca **por un punto distinto** del bucle, o dos partidas con el
  mismo cielo suenan sincronizadas.

**Una multitud no se sintetiza.** El 30 sep 2026 se probó un bullicio de aldea
hecho de actividad —golpes lejanos, cacharros, un rumor de banda estrecha,
palmas— y Vera lo tachó entero: «horrible, no tiene ningún sentido». La
regla de §1 («el bullicio se sugiere con actividad») **está retirada**: lo que
sugiere gente sin gente suena a nada reconocible. Gente se graba o se genera
con voces de verdad (decisión 1 de `plan-audio-mundo.md`). Y un lecho de ruido
continuo bajo un sonido puntual (la hoguera) se oye como «fondo raro»: los
chasquidos solos, sin cama.

**Y un recorrido de navegador no puede comprobarlo todo.** Lo que depende de
**dónde apunta la cámara** no se puede fijar desde fuera: al intentar comparar
el bullicio de un valle joven contra uno hecho, lo que se medía era el encuadre
de cada uno, no su población. La regla que queda: **una propiedad del contenido
—más gente, más bullicio— va a la prueba pura; el recorrido comprueba que eso
llega vivo al juego**, y nada más. Y dos trampas suyas, medidas: hay que esperar
al vuelo de entrada (9 s) antes de medir nada posicional, porque hasta entonces
la cámara está a 92 celdas y todo lo que tiene sitio vale cero; y un cruce de
capas tarda 2,5 s, así que medir antes es medir una capa a medio entrar.

**Y una mezcla se equivoca de otra manera que un sonido.** Un lecho puede estar
bien fabricado y sonar mal porque se pide demasiado alto. La corrección de Vera
a la fase 1 fue exactamente eso: «un día claro suena muy fuerte el viento y el
río; imagínate que estamos por las montañas». El fallo no estaba en el fichero
sino en la función pura: la fuerza del viento decidía **si había racha** y no
**cuánto se oía la brisa**, así que un día en calma sonaba con la brisa entera.
De ahí dos reglas:

- **Lo que suena siempre es lo que antes cansa.** El viento y el río están ahí
  el 80 % del tiempo: van más bajos que todo lo demás, y se juzgan por cómo
  quedan tras diez minutos, no por cómo suenan aislados.
- **Si un estado tiene una intensidad, esa intensidad tiene que llegar hasta la
  ganancia.** Usarla sólo para elegir capa deja la capa elegida a todo volumen,
  que es el mismo error con otra cara.

Y tres números más, medidos el 29 sep 2026 al hacer la fase 1:

- **un lecho pesa.** Once bucles a la calidad de un toque daban 1,5 MB. Son
  ruido a 35 dB por debajo: con el bitrate bajo (`compression_level` 0,85)
  bajan a 486 KB y no se nota;
- **un lecho con filo cansa.** La lluvia y la cascada salieron con un 10–13 %
  de energía por encima de 4 kHz; en un sonido de un disparo no importa, en uno
  que suena minutos es fatiga. Se bajaron los topes de banda a 3200–3300 Hz;
- **un retumbar vive donde el móvil no llega.** El trueno lejano tenía el 34 %
  en la banda del teléfono. Los tres se subieron hasta el 76–88 %,
  **conservando el orden** (lejos más oscuro que cerca), que es lo que de
  verdad se oye como distancia.

Lo que hay que tener en la cabeza antes de tocar el ambiente:

- **A ×64 una jornada dura 1,9 segundos.** El cielo puede cambiar, una puerta
  abrirse y cerrarse, el día y la noche alternarse cada dos segundos. El
  renderer ya aplana la luz a esas velocidades (`daylight.ts`, `LIGHT_STEADY`);
  el sonido tiene que hacer lo mismo o será un parpadeo. **Un umbral de sonido
  se mira en velocidades, no sólo en segundos.**
- **La pantalla va hasta una jornada por detrás del motor** (el «relevo» de
  `scenic-state.ts`). Un sonido atado al tick llega **antes que la imagen** para
  edificios, nacimientos y muertes. Lo que se pinta del estado vivo (fuegos,
  árboles que caen, el «+1» de la madera) no tiene desfase.
- **Ya hay un contrato para la caza y el asedio** (30 sep 2026):
  `GraphicsStats.moments` + `ui/moments.ts`. Un suceso nuevo añade su cuenta
  al renderer, su `MomentKind` y su fila en `MOMENT_CUE`; nunca un `sound.*`
  suelto en la capa de vida. Una cuenta que baja es una jornada nueva.
- **No hay un flujo de sucesos general**: hay estado que se puede leer. Las tres formas
  de saber *cuándo*, en orden de coste: lo que ya sale por `stats()` y el
  `TickReport`; lo que existe dentro del renderer y hay que exponer con un
  descriptor pequeño; y lo que no existe y necesita un gancho. Todos de **sólo
  lectura**: el sonido nunca gasta azar del motor (CLAUDE.md).
- **Un sonido sin imagen es un fantasma.** Si el motor lo sabe y la pantalla no
  lo enseña, el hueco va a `docs/encargos-3d.md` en la misma ronda (regla §4b de
  la skill `goal`). No pongas una campana donde no hay campanario.
- **El oyente es la cámara.** `viewCentre` y `viewHeight` salen por fotograma y
  bastan para atenuar río, cascada, fuego y gente por distancia y por zoom.

---

## 9. Lo que no decides tú

Se le pregunta a Vera, siempre:

- **Si un sonido vale o no.** No hay medida que sustituya su oído.
- **De dónde salen las voces y los animales**: generados fuera, biblioteca, o
  no ponerlos.
- **Qué suena y qué se queda callado.** «La interfaz no es una máquina de
  premios» es suyo, y vale para el mundo.
- **Cuánto se oye cada capa** (el nivelado), como en el resto del juego.
- **Los sonidos que necesitarían imagen nueva** (la campana de la capilla, el
  cuerno del asedio): primero la imagen, y eso es un encargo suyo.

---

## 10. Dónde está cada cosa

| Qué | Dónde |
|---|---|
| **El análisis del sonido del mundo**, 80 filas contra el código | `docs/plan-audio-mundo.md` |
| El inventario maestro y los prompts de generación | `docs/plan-audio.md` (§1 y §4 tienen desfases, ver el aviso) |
| Cuándo suena cada cosa de la interfaz | `docs/design.md` §11.10 |
| Las constantes de reproducción | `src/engine/balance.ts`, `SOUND` |
| El reproductor y los disparadores puros | `src/ui/sound.ts` |
| La fábrica de sonidos | `tools/ui/sounds.py` |
| El recorrido con clics reales | `tools/ui/sound-check.mjs` |
| Lo que falta de imagen | `docs/encargos-3d.md` |
