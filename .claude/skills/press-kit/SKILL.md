---
name: press-kit
description: Fotografía todas las pantallas del juego y todos sus estados —con interfaz y sin ella, desplegado y sin desplegar— en una pasada, con hoja de contactos. Úsala cuando el dueño del diseño pida un paquete de capturas, material para un tráiler o vídeo, o "enséñame cómo se ve todo". No es para una captura suelta de una pantalla concreta (para eso, `tools/graphics/shot.mjs` directamente) ni para diagnosticar el comportamiento de la vida del valle (para eso, la skill `observe-valley-life`).
---

# El paquete de prensa

Existe por un encargo del dueño del diseño, el 18 sep 2026: «necesito un paquete
completo de capturas de todas las pantallas que tenemos ahora mismo en el juego,
todas y cada una de ellas, las diferentes formas; si aparece un botón, sin
botón, desplegado, sin desplegar. Lo necesito para hacer una especie de vídeo
trailer». Y una segunda petición, después: escribir esto como skill para que
fotografiar el juego entero sea un procedimiento y no un comando que hay que
recordar cada vez.

**Antes de nada: esto hace ruido.** Chromium con WebGL por software (swiftshader)
es la parte más pesada de todo el proyecto para el ventilador de la máquina.
Pregunta si se puede hacer ruido antes de lanzar nada; si la respuesta es no,
deja el encargo anotado en `docs/task-log.md` con los comandos exactos para
continuarlo — es lo que se hizo el 19 sep 2026 y funcionó: la tanda se retomó
al día siguiente sin perder nada.

## La herramienta

Todo vive en `tools/graphics/press-kit.mjs`. Léela antes de tocar nada: cada
grupo está comentado con qué pantalla o estado captura y por qué.

```bash
npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/press/game
node tools/graphics/press-kit.mjs
```

Sale en `artifacts/graphics/press/`: los PNG numerados, `index.html` con la
hoja de contactos (se reconstruye sola en cada captura, así que un paquete a
medias sigue siendo usable) y `manifest.json`.

### Los grupos

Con interfaz puesta, `--only <grupo>`:

`menu` `entrada` `valle` `horas` `cronica` `gente` `carro` `encrucijada`
`asedio` `estados` `final`

El metraje del tráiler, **sin interfaz** (con el botón de pantalla despejada de
UI-V10, así que sale el valle solo — sin cabecera, sin bandeja, sin barra):

`crecimiento` (el mismo valle a nueve edades) `estaciones` `escenas` (los
sucesos de R-1: boda, cosecha, riña, forastero…) `cerco` (la muralla
cerrándose, con un plano ancho de cada edad)

### Continuar una tanda partida

Cada captura suma uno a un contador global. Si el paquete se corta —o si
trabajas por grupos para no bloquear la máquina mucho rato seguido—, sigue
donde se quedó:

```bash
node tools/graphics/press-kit.mjs --offset 62 --only escenas
```

`--offset N` arranca la numeración en N sin renumerar lo que ya salió bien. La
hoja de contactos se escribe en cada disparo y se suma a lo que ya hubiera —no
la borra— así que un paquete hecho en cinco pasadas distintas queda como uno
solo.

### El encuadre

Por defecto 390 × 844 a escala 3× (un móvil). Si el destino es un tráiler
horizontal: `--width 1280 --height 720`. `--seed` y `--year` cambian el valle
base (por defecto semilla 7, año 50).

## Las cinco trampas que ya costaron tiempo

Están escritas en el código, y aquí para no tener que releerlo entero:

1. **Una decisión abierta tumba una captura**, y con ella la tanda entera: el
   campo de año juega la trayectoria de verdad, así que un valle puede abrir
   con una encrucijada planteada, y `page.screenshot` agota su plazo esperando
   un velo que no se va a ir solo. `dismiss(tab)` la aparta deslizándola antes
   de cada disparo del metraje.
2. **El asalto pide `raid` además de `assault`**: `main.ts` sólo lee
   `&assault=1` dentro de `&raid=N`, nunca solo. Sin `raid`, la partida del
   asedio nunca se planta.
3. **La hora se va entre planos.** Jugar sesenta años tarda más que jugar uno,
   así que una tira de "el valle a nueve edades" puede caer con una captura de
   noche entre dos de día. `atHour(tab, '09')` corre a ×64 —donde el día dura
   menos de dos segundos— hasta la hora pedida y vuelve a ×1 antes de disparar.
4. **Un click que se pierde no se nota hasta ver la tira entera.** `bare(tab)`
   reintenta tres veces antes de darse por vencida y avisar por consola.
5. **El asedio se encuadra fuera de cuadro** si no se aleja la vista: la cámara
   por defecto enmarca la aldea, y la partida llega por el camino, que queda
   fuera. `wide(tab, notches)` aleja con la rueda antes de disparar.

## Lo que no está en el juego, y no lo va a estar por más que se pida

Un guion de tráiler puede pedir planos que el juego no tiene. Los dos que ya
salieron:

- **Un valle literalmente vacío.** El juego se funda con la pareja ya puesta;
  no hay un estado de "antes de que llegue nadie".
- **Un entierro.** La muerte se cuenta en la crónica y deja una tumba en el
  cementerio; no hay clip de nadie cayendo ni de un cuerpo en el suelo.

Dilo en vez de improvisar un plano que no existe.

## Cerrar

Cuando el paquete esté completo (o la parte que se pidió), enseña la hoja de
contactos (`artifacts/graphics/press/index.html`) y no las capturas sueltas —es
para eso que existe—, y dile al dueño del diseño qué grupos quedan si el
paquete se hizo por partes.
