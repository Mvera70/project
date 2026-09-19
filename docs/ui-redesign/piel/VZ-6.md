# VZ-6 · Las deudas que quedaban

17 sep 2026. Cierre de la tanda VZ. El encargo del dueño del diseño fue
«cubrir el resto de deudas, informe al finalizar todo», y antes de eso el
reparto de prioridades: la silueta del aldeano y las cinco pruebas de PWA
primero (VZ-4 y VZ-5), los recorridos declarados y el caché del worker como
secundarios, las dos asimetrías menores y la línea «Today» «si es fácil,
arréglalo ya».

Esto es lo secundario hecho, más tres cosas que aparecieron por el camino y no
estaban en ninguna lista.

---

## 1. Los modelos viejos que no se iban del iPad

El dueño del diseño lo vio antes de que fuera una deuda: «creo que siguen
saliendo los animales antiguos, hay modelados nuevos». No era un fallo de
código y no era la otra sesión: era el **service worker**.

Su cabecera decía, desde M-27, que la política de «caché primero» es segura
porque *«everything else carries a content hash in its name, so a cached copy
can never be the wrong copy»*. Para el bundle es verdad —Vite le pone la huella
al nombre— y **para los modelos era falsa**: `cow.glb` se llama `cow.glb` toda
la vida. Así que un dispositivo que hubiera visitado el juego servía su vaca
guardada para siempre, y la única invalidación que hay —subir el nombre del
caché— se hizo a mano por última vez el 17 sep a las 14:57.

Dos ficheros, y los dos tienen que decir lo mismo o el arreglo empeora las
cosas:

- `render3d/assets.ts` pide cada recurso con los ocho primeros caracteres de su
  `sha256` colgados (`?v=...`), que es el dato que el manifiesto ya trae.
- `public/sw.js` **precachea esas mismas direcciones**. Sin esto se guardarían
  claves que nadie va a pedir y el modo avión se quedaría sin modelos.

Con eso, la promesa de la cabecera pasa a ser cierta: un modelo nuevo tiene otra
dirección, y la copia guardada del viejo no la responde. El nombre del caché
sigue subiéndose a mano, y ya no hace falta para los modelos.

## 2. Enfocar al decidir no hacía nada

§11.5 promete que contestar una encrucijada enfoca lo que esa decisión cambia.
El recorrido que lo vigilaba llevaba declarado como fallo, y al arreglarlo
resultó que **la prueba no estaba mal: el juego sí**.

`screens/crossroad.ts` lo hacía escalando `#valley` con un `transform` y un
`transform-origin` en tanto por ciento. Funcionaba porque el lienzo 2D dibuja
el mapa entero, así que una fracción de su caja es una fracción del mapa. **Y
dejó de hacer nada el día que el 3D relevó**: UI-V10 esconde ese lienzo en
cuanto el piloto carga. O sea que desde entonces enfocar era una operación sobre
un elemento oculto, en el juego que se publica, sin que nada lo dijera — porque
la prueba leía **ese mismo `transform`** y por tanto medía el camino muerto. Es
el caso de libro de la regla de `CLAUDE.md`: una prueba que llama a una función
directamente no sabe si el juego la llama.

El arreglo es un conducto nuevo y corto: `app.look(x, y)` → `backend.live.look`
→ `renderer.look` → `view.look`. Cuatro contratos, un no-op en el backend 2D
—que dibuja el mapa entero y no tiene a dónde mirar— y la celda sale de
`report.visualEffects[0]`, que es el efecto que §11.5 ya nombra.

Dos decisiones dentro:

- **Mueve el centro y no la altura.** Acercarse es del jugador (§11.2), y un
  salto de zoom sobre un valle en marcha marea más de lo que señala.
- **Cuenta como mover la cámara**: apaga el vuelo de entrada y pone `disturbed`.
  Sin eso, el encuadre automático del pintado siguiente (`if (!isQuiet(change)
  && !disturbed) frameCamera()`) se comía el enfoque — y contestar **cambia** el
  estado, así que se lo comía siempre.

Y la prueba pasa a leer **dónde mira la cámara** en vez de un `transform`:
`viewCentre` entra en `GraphicsStats` y `app.ts` lo publica en la raíz como
`data-view-centre`, por el mismo motivo que `data-view-height` — lo que no se
puede leer desde fuera se rompe en silencio.

## 3. Los tres recorridos declarados, verdes de verdad

Los tres llevaban `test.fail()` y en los tres el fallo era de la prueba:

| Recorrido | Qué lo tenía rojo |
|---|---|
| El parte de bienvenida | Congelaba el velo como literal (`rgb(18, 17, 14)`), y ha cambiado dos veces: UI-V5c lo bajó al 18 %, VZ-04a vistió la pantalla. Ahora comprueba **la propiedad**: atenúa el valle en vez de taparlo |
| El epitafio | Congelaba «82 people at its height», exigía visible una clase que UI-V2b retiró (`.valley-speeds`) y probaba el selector de archivo que UI-V8 borró |
| La encrucijada | Fijaba «60 ticks a 16×» para que el motor plantara una, y desde R-1 el valle tira sucesos cada semana: esa trayectoria ya no es la que era. Ahora sondea semana a semana con tope, y no exige **cuál** se planta: el catálogo tiene 56 opciones |

Los trece recorridos de `tools/shots/valley.shots.ts` están en verde y **ninguno queda
declarado**.

## 4. La línea «Today» de la ficha

Era la que el dueño dejó en «si es fácil». Lo fue, en cuanto se vio de dónde
tenía que salir el dato.

UI-V4 la dejó fuera y la razón escrita era buena: derivarla del motor —oficio,
estación, órdenes— daba una frase que **puede contradecir al cuerpo** que se ve.
La cura no es adivinar mejor: es preguntar a quien lo sabe. `ActorDoing` sale
del mismo `lastActors` con el que se pintó el último fotograma, así que la ficha
dice literalmente lo que se está viendo.

Nueve palabras en el banco y ninguna inventa nada:

- **Ningún destino.** El prototipo pone «carrying timber to the mill» y el
  molino no se puede afirmar: la vida sabe qué se lleva y en qué tramo va, no a
  qué edificio.
- **La carga manda sobre el tramo**: quien lleva un fardo está acarreando, ande
  o vuelva.
- **Quien ya no está no tiene línea.** Es la misma regla por la que UI-R4 le
  quitó la edad de hoy a un fallecido.
- **Con el lienzo 2D no hay línea**: no simula cuerpos, y `doing` devuelve
  `null`. `null` es «no se dice nada», nunca una frase de relleno.

Tres pruebas rápidas guardan las propiedades (`doingLine` es puro) y **un
recorrido de navegador guarda que la línea llega**, que es lo que una prueba
rápida no puede ver: sin renderer la línea saldría callada sin que nada
estuviera mal.

## 5. Tres cosas que aparecieron por el camino

Ninguna estaba en la lista; las tres las encontró una prueba nueva.

**El sello de la decisión aplazada no se podía pulsar.** `shell.css` lleva
`.ui-shell-message > .skin-ornament { pointer-events: none }` desde UI-R2, y por
un motivo medido: el ornamento era una hoja de roble decorativa y se tragaba los
toques del valle que hay debajo. **VZ-03 lo convirtió en botón** —el sello de
lacre de una decisión aplazada— y esa regla no se revisó: tocarlo no hacía nada
y el lienzo 3D se comía el toque. Y el sello es **el único camino de vuelta a
esa decisión**. La excepción va atada a `:disabled`, que es exactamente lo que
`shell.ts` pone con la hoja: decoración no recibe toques, control sí. Sólo lo
caza un click de verdad: «canvas #valley3d intercepts pointer events» sobre un
botón visible y habilitado.

**La deuda más vieja del cuaderno estaba cerrada y nadie lo había comprobado.**
«Una decisión pendiente bloquea la navegación»: el pintado devolvía la ruta al
valle en cada fotograma mientras hubiera decisión pendiente, aplazada incluida,
así que aplazar —que existe precisamente para ir a mirar otra cosa (§8.6)— no
servía de nada. VZ-03 la cerró de paso al separar la aplazada de la planteada.
Ahora hay un recorrido que lo guarda, y hace falta uno: el fallo estaba en el
bucle de pintado, o sea que un solo `expect` lo habría dado por bueno y el
fotograma siguiente habría deshecho la navegación.

**El documento sellado de UI-V3 se ha visto por primera vez**
(`artifacts/vz6-sealed.png`): «NINE AT THE FORD», con su lacre y su título en
tinta roja. Llevaba desde UI-V3 sin captura, y no por estar mal: sólo existe
habiendo decisión pendiente, que era justo el estado en el que la crónica no
abría. Para poder llegar a él hay `?crossroad=1` en las rutas de depuración —
sigue jugando con la política prudente hasta que haya una sin contestar, que es
un estado que `stateAt` nunca deja porque contesta todas.

Y una **asimetría anotada y no cambiada**: el documento sellado lleva al valle,
donde espera el sello, así que volver a la decisión desde la crónica son dos
toques y desde el ornamento uno. Es lo que su contrato promete —un panel no abre
pantallas por su cuenta— y desde VZ-03 aplazada es aplazada. Que ese documento
la reabra de un toque es una decisión del dueño del diseño, no mía.

---

## 6. Verificación

- `npm run typecheck` y `npm run lint` limpios.
- **Los trece recorridos de interfaz en verde, ninguno declarado**, más los tres
  nuevos de esta ronda (la línea «Today», la decisión aplazada y el documento
  sellado). Los tres de animales se saltan solos: son de la otra sesión.
- 122 pruebas rápidas de interfaz y 50 de gráficos en los ficheros tocados,
  con 3 nuevas para `doingLine`; y las del banco y la frontera de módulos, que
  este cambio toca por añadir claves y un import entre capas.
- El recorrido de la encrucijada mide 1,4 min porque sondea semana a semana
  hasta que el motor planta una. Es el precio de no fijar el instante.

## 7. Lo que esta ronda no resuelve

- **Las seis pruebas rápidas rojas de la otra sesión** (`graphics-clock`,
  `life-needs` ×3, `life-staging`, `ui-milestones`), comprobadas en un árbol
  limpio de `origin/main` con los mismos números. Son de `src/render3d/life/` y
  de la vida del valle, que se está reescribiendo.
- **Leer la crónica de un valle anterior**: no tiene puerta de entrada desde que
  UI-V8 retiró el selector de archivo. El dato sigue guardado.
- **La fuerza del resalte del aldeano, sin juzgar en dispositivo.** El arnés no
  la aísla: el oro del anillo se confunde con la paja del valle al buscarlo por
  píxel.
- **El nombre del caché del service worker se sigue subiendo a mano.** Con los
  modelos ya con huella pesa mucho menos, pero el casco y el documento siguen
  dependiendo de que alguien se acuerde.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
