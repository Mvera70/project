# El plan siguiente: qué falta, en qué orden, y quién lo hace

**15 sep 2026, al cerrar la auditoría del proyecto.** Este documento es para
**delegar**: cada ronda lleva su brief listo para pegar en un agente, con el
carril del router (`docs/agents.md`) y el criterio de terminado.

**Lo que manda por encima de esto:** `CLAUDE.md`, `docs/design.md` (Anexo D para
el render, Anexo E para la vida, §11 para la interfaz), `docs/agents.md` para
cómo se delega y se audita. Y la regla que más veces ha ahorrado una tarde:
**medir antes de tocar, y nunca con una sola semilla.**

## El estado, en cinco frases

- **El juego es el 3D y la aldea se mueve por la capa de vida.** Sin banderas.
  V-12 retiró el camino viejo, el descarte y 6 011 líneas.
- **La interfaz está cerrada de U-01 a U-09** y el diagnóstico de «se ve muy
  pobre» está atendido: se ve qué se puede hacer, la cabecera reacciona, la
  decisión pendiente es una píldora, hay pantalla de gente y el valle suena.
- **La auditoría encontró cuatro regresiones invisibles del día de G-12** y
  arregló tres. La cuarta —las reuniones de §11.8— es V-11 y está medida.
- **Lo que decide si hay juego no es gráfico.** Siete a doce decisiones en
  cuarenta años, medio catálogo muerto. La decisión de diseño está tomada; la
  ronda no.
- **Y lo que decide si esto corre no está medido:** todo lo de rendimiento es de
  un portátil. Hay demo de una sola página; falta un teléfono.

## Lo que dijo el dueño del diseño al probar la demo · 15 sep 2026

**Esto manda sobre el orden de abajo.** Es la primera vez que alguien juega la
demo del 3D con la interfaz nueva puesta, y es la clase de veredicto que
`docs/handover.md` §1 dice que no se puede sustituir por una medición. Transcrito
por áreas, sin suavizarlo:

### El mapa es pequeño, y tiene que ser el centro de algo más ancho

> «el mapa sigue siendo muy pequeño, dijimos que iba a ser mucho más grande.
> Vamos a expandir, vamos a meter más generación de diferentes cosas: bosques,
> montañas, lago, etc. El valle es el centro del mapa pero debe ser más amplio,
> para que podamos extender y hacer más cosas.»

Es **V-15 y V-16**, que estaban aparcadas con el coste medido (`design.md` E.8).
Dejan de estar aparcadas. Y llega con algo que los briefs no pedían: **más
clases de terreno generado** —lago, montaña dentro del mapa, bosques
distinguibles— no sólo más celdas del mismo prado. Sube `SCHEMA_VERSION` a 4 y
rompe partidas guardadas, que es la razón por la que estaba aparcada y ya no
basta.

### La cámara sólo mira desde un sitio

> «aunque tengamos 3D ahora mismo, solamente tenemos una visión de un plano.
> Deberíamos poder mirar desde diferentes ángulos, ahora que tenemos 3D
> implementado. Y el mapa en sí debe poder funcionar: cuando ya lo tengamos más
> grande, poder moverlo, hacer zoom y esas cosas.»
>
> «no se puede bien mover el mapa.»
>
> «si seleccionas algo del mapa, nunca se puede deseleccionar lo que aparece
> seleccionado.»

**Va antes que el mapa grande**, por orden de dependencia: un mapa nueve veces
mayor con una cámara que no gira ni se mueve bien es peor que el de ahora. `VIEW`
es hoy una dirección fija (`camera.ts`, la misma de todas las capturas desde
G-01) y D.7 nunca contempló girar.

### El reloj no cuadra al acelerar

> «cuando hacemos por 4 o por 64, hay muchas cosas que no se cuadran: aparece
> que es invierno y no se ve que sea invierno, los personajes no van al ritmo que
> deberían ir. Hay muchas cosas del reloj que están mal.»

Dos síntomas distintos y hay que separarlos: **lo que se pinta no corresponde a
la estación que dice la cabecera** (sospecha: el estado escénico de D.6.7 congela
la jornada de anoche y a ×64 pasan ocho semanas dentro de una jornada, así que la
cabecera va por delante de lo pintado), y **el ritmo de la gente**, que D.6.1
acelera con la raíz de la velocidad a propósito. Lo segundo puede ser la decisión
funcionando y viéndose mal; lo primero es un fallo.

### La interfaz, y sobre todo los textos

> «la interfaz sigue siendo bastante mala, aunque ya hemos avanzado un poco más.
> Los mensajes que aparecen ahí son horrorosos, tanto los mensajes rápidos como
> los mensajes entre eras.»
>
> «los botones de tiempo son provisionales, evidentemente. El líder no va a ser
> así. Y los iconos de estadísticas también son muy pobres.»

«Los mensajes entre eras» son las cartelas de hito de U-02. **Y aquí hay que
recordar una regla antes de tocar nada: las edades tecnológicas no existen en
este motor y no se inventan** (`design.md` §11, U-02); lo que se celebra son
hitos con fecha real. Si lo que falla es que suenan a hito de otro juego, se
arregla la voz, no se inventa una progresión.

### Más modelos

> «debemos seguir implementando también modelos en 3D. Son muy escasos: las
> construcciones, los aldeanos, objetos que pueda haber por el mapa, como
> herramientas.»

Hay 39 recursos publicados. Lo que falta por D.8: el campo y el camino como
terreno con geometría, la familia de defensa completa, y **objetos sueltos por
el mapa**, que no estaban en ningún brief y son nuevos.

### Lo que se ha hecho de esta lista, y lo que destapó

| Ronda | Qué cerró |
|---|---|
| **G-13** | La cámara gira, se levanta, dos toques vuelven, tocar el suelo deselecciona, y arrastrar el mapa ya no abre la crónica encima |
| **G-13b** | Al alejarse el valle **llena la pantalla** (del 25 % al 85 % de alto): el tope encajaba la caja entera y en vertical eso deja el mundo como un sello. Y la sierra tenía un agujero por el que se veía el fondo |
| **G-14** | A ×64 el valle **pintaba otro año** que la cabecera. El color de la estación pasa a salir del reloj vivo |
| **G-15** | Almiares, leña y carretas por el valle: los trece edificios ya tenían recurso, lo que no había era nada entre una casa y la siguiente |
| **G-16** | Los mensajes: la pancarta a sangre pasa a tarjeta, «in year 0» y «No of them left the fields» |

**Y cuatro cosas que salieron de mirar capturas, y son de quien siga:**

1. **La noche es casi negra y a ×64 parpadea cada quince segundos.** Medido con
   la herramienta nueva: brillo medio del día 0,458, atardecer 0,392, noche
   0,208. No es un fallo —la noche es de noche— pero un ciclo día/noche cada
   quince segundos de reloj de pared es un estrobo, y a esa velocidad el jugador
   no está mirando a nadie en particular. Es la misma decisión que la de abajo.

2. **A ×64 la gente y las casas siguen siendo de hasta 64 semanas atrás**, y
   arreglarlo es un fork de diseño con tres salidas, ninguna gratis:
   - la jornada escénica sigue a la velocidad **entera** (D.6.1 la puso a la
     raíz a propósito, porque si no la gente corre a saltos);
   - a velocidad alta **no se dibujan los individuos** — y entonces no hay salto
     que ver, que es el principio del anochecer llevado al final;
   - o se engancha el rebaño a la capa de vida, donde un cuerpo no se
     teletransporta porque no evalúa una fórmula.

   Lo que **no** vale es relevar el estado más a menudo: medido, el rebaño salta
   5,096 celdas contra un techo de 0,4, porque un relevo sólo es invisible
   cuando el bicho no está en pantalla.

3. **Un hueco de reparto llega a la pantalla:** «{B} was given the forge in year
   26», semilla 23. El arreglo cabe en tres líneas y mueve la trayectoria de
   todas las semillas, así que va con el carril del ritmo de decisión. Declarado
   con `it.fails`.

4. **La cartela de hito habla en pasado y con fecha** —«The first house went up
   in the spring of year 3»— mientras el jugador está viendo el año 3. Se lee
   como una página de libro de historia sobre algo que está pasando ahora. **Y
   es deliberado**: U-02 decidió que un hito es «una etiqueta en una página de
   la crónica, no un título ni una celebración», y §9.3 gobierna la voz. Si lo
   que chirría es eso, es una **decisión de voz y no un arreglo**, y hay que
   tomarla antes de reescribir cincuenta plantillas.

### El orden que sale de esto

1. ~~**La cámara**~~ — **hecha, G-13.** Gira con dos dedos o con mayúsculas, se
   levanta la vista, dos toques vuelven al principio, tocar el suelo
   deselecciona, y arrastrar el mapa ya no abre la crónica encima. Informe en
   `docs/graphics-rounds/G-13.md`, con tres capturas desde tres ángulos.

   **Y mirarlas destapó tres cosas que nadie había apuntado:**
   - **Una cuña marrón enorme sobre el río** en la vista de reposo, con el color
     del suelo pisado, tapando el agua. Geometría del suelo o del cuenco de V-14
     saliendo donde no debe. **Va con el mapa grande**, que rehace el terreno.
   - **Doce de veinte aldeanos llevan nube de diálogo a la vez.** §11.1.1 la puso
     para «quien está viviendo algo»; con el 60 % de la aldea marcada no señala
     nada. Es parte de «los mensajes son horrorosos» y es barato.
   - **El mapa se ve entero desde el reposo**, con borde de prado vacío
     alrededor. Confirma la queja: no hay nada que descubrir moviéndose.
2. **El reloj a ×4 y ×64.** Separar los dos síntomas y medir.
3. **El mapa grande, con más generación.** V-15 + V-16, ampliadas. **Brief
   medido al final de este documento**, porque no es una constante.
4. **Los textos y los iconos.** Es voz y dibujo, no arquitectura.
5. **Más modelos**, que va en paralelo si hay Blender.

Y lo que ya estaba y no se cae de la lista: **V-11** (las reuniones no ocurren) y
**el ritmo de decisión** (siete a doce decisiones en cuarenta años).

---

## Los carriles

| Carril | Rondas | Modelo | Por qué ese modelo |
|---|---|---|---|
| **A · La vida** | **V-11** → el enganche del rebaño | Sonnet (`Tier: construir`) | Brief con contrato literal en E.8; la causa está medida |
| **B · El ritmo** | `wolf_winter` → relajar → plantillas nuevas | **La sesión, sin delegar** | Es balance y cada paso cambia la partida entera |
| **C · La reja visual** | Los siete recorridos declarados | Sonnet, **con capturas a la vista** | Pide juicio sobre lo que se ve, no ajustar números |
| **D · Medida** | Tras cada entrega de A | Haiku (`Tier: medir`) | No escribe código: corre la sonda y escribe la tabla |
| **E · Auditoría** | Tras cada entrega de A o C | Sonnet, con `docs/agents.md` §«Cómo se audita» | Primera pasada barata; la sesión cara sólo revisa lo que marque |

A y C no se pisan: A vive en `src/render3d/life/`, C en `tools/*.shots.ts`.
B toca `src/engine/` y **no corre a la vez que nada**, porque mueve la
trayectoria de todas las semillas y deja sin sentido cualquier medición
simultánea.

**Antes de lanzar cualquiera, dos cosas que ya han costado tiempo:**

1. **El worktree ancla mal a menudo** (cuatro veces de seis). El brief tiene que
   exigir comprobar que existe un fichero **reciente** — hoy sirven
   `src/derive/README.md`, `tests/fast/life-staging.test.ts` o
   `vitest.journeys.config.ts`. Y tiene que decir **cómo** corregirlo:
   `git merge --ff-only <hash de la punta>` sobre un árbol limpio. `git reset
   --hard` está denegado por el candado a propósito.
2. **Una jornada sola es ruido**, igual que una semilla sola. Cada jornada de la
   capa de vida tiene su propia semilla (`seedOfDay`), así que medir el día 0 de
   seis semillas son seis muestras y no seis aldeas. Todo brief de la capa de
   vida tiene que pedir varias jornadas.

---

## Carril A · La vida

### V-11 · Lo que el motor manda — **y una regresión que saldar**

**Esto no es una fase pendiente cualquiera: es una regresión del juego.** Las
reuniones de §11.8 —veinticinco de las cincuenta y seis opciones del catálogo
convocan a la aldea— dejaron de ocurrir el 14 sep, cuando G-12 puso la capa de
vida por defecto. Sólo existían en `actorsFor`. Nadie lo vio porque la prueba que
las vigilaba llamaba a `actorsFor` directamente y siguió verde sobre un camino
que el juego ya no recorría; V-12 borró ese camino y lo dejó a la vista.

**Medido** (`tests/fast/life-staging.test.ts`): con una reunión convocada, a
media jornada el más lejano está a **12,4 celdas** del sitio. `life/` no conoce
la palabra `gather`. El `?render=canvas` sí las sigue enseñando, lo que confirma
que el motor hace su parte.

**Lectura obligatoria.** E.2 (la consecuencia aceptada: la vida no escribe en el
motor), E.4 (el mundo ofrece, el agente elige), §7.9, §11.8, y el brief de V-11
en E.8, que trae el contrato literal.

**El contrato, de E.8, y es literal:**

```ts
export type Order =
  | { kind: 'quarrel'; a: VillagerId; b: VillagerId; blows: boolean }
  | { kind: 'gather'; at: Point; days: number }
  | { kind: 'mourn'; who: VillagerId };
export function ordersOf(state: GameState, since: number): Order[];
export function stage(order: Order, life: Village, seed: number): void;
```

**Ficheros.** Nuevo `src/render3d/life/staging.ts`; toca `life/village.ts`.
`gatheringsAt` y `encountersAmong` viven ahora en `src/derive/`, y de ahí se
leen: son funciones puras del estado y las lee también el Canvas.

**Reglas.** Las órdenes **bajan**, nunca suben. Una riña que el motor decidió se
convierte en escena `brawl` con sus papeles y su sitio, a la hora que la vida
decida dentro de la jornada. Una reunión es un `Place` temporal con aforo alto y
hora fija. Nadie de `life/` importa de `engine/` salvo tipos y funciones de
lectura, y `module-graph.test.ts` lo vigila.

**Terminado cuando.** Se quita el `.fails` de «la aldea se junta donde la
decisión dijo» y pasa; se borra la tercera prueba, la que mide la dispersión de
hoy, porque su única razón de existir era tener contra qué comparar; toda riña de
la crónica de la jornada se ve como escena; y **hay captura de una reunión**
(`npm run shot`). Medido en varias jornadas y varias semillas, no en el día 0.

### El enganche del rebaño

**Después de V-11, y es pequeño.** Los animales que se ven se calculan del estado
(`effects/fauna.ts`, función de la hora) mientras la gente a su lado son cuerpos
que andan. V-08 ya partió la clase en dos para esto y dejó
`life/beasts.ts` dando animales con cuerpo; el enganche no se hizo porque no
estaba en su alcance.

**Lo que resuelve, además de la coherencia:** con animales-`Dweller` desaparece
`ashore` —la corrección que devuelve al rebaño a tierra cuando la geometría lo
deja en el agua—, porque un cuerpo colisiona con el río y no llega a pisarlo.
Esa función tiene una deuda declarada de 0,326 celdas y arreglarla por geometría
pediría un A* por tierra, desproporcionado para una vía que esto borra.

**Ficheros.** `src/render3d/renderer.ts` (quién alimenta a `Fauna`),
`src/render3d/effects/fauna.ts` (la mitad de `paint`, que ya existe).
**Terminado cuando.** Los animales del valle son los de `life/beasts.ts`, la
prueba de `ashore` con techo 0,4 se borra por innecesaria, y hay captura.

---

## Carril B · El ritmo de decisión — lo que decide si hay juego

**No lo hace un agente.** Es la pregunta de diseño central: *¿cada cuánto quiere
el juego que decidas?* La decisión está tomada (`docs/roadmap.md`, 14 sep): las
tres cosas —arreglar los fallos, relajar condiciones y escribir plantillas de
menor peso—, en ese orden y **remidiendo cada paso**, porque relajar y añadir a
la vez hace imposible saber cuál de los dos movió qué.

Un tope que hay que vigilar: **un idle que interrumpe cada dos minutos deja de
ser un idle.** Se apunta a seis u ocho decisiones por década, no a treinta.

### Paso 1 · `wolf_winter`, que está hecho y sin fusionar

**En la rama `worktree-agent-afdfba3b92d4bb7ee`** (commit `40708c7`). Baja el
umbral de `forestLeft` de 0,25 a 0,15 en `crossroads/catalog/forest.ts`, que es
lo correcto: la condición era imposible por construcción, la misma errata que
`forest_cut` tuvo con su 0,3 y se corrigió así en v2.47. Trae además
`tests/fast/crossroads-reachability.test.ts`, que vigila que ninguna plantilla
tenga una condición inalcanzable — la prueba que habría cazado esto el día que se
escribió.

**Por qué no se fusionó:** hacerlo elegible mete veintiuna encrucijadas nuevas en
la ventana medida, y eso cambia la trayectoria de cada partida. **Trece pruebas
calibradas sobre semillas concretas pasan a fallar**, comprobado con y sin el
cambio en los mismos ficheros (5 fallos con, 24 de 24 sin). No es ruido de carga,
aunque lo parezca: el informe del agente lo dio por flakiness y no lo es.

**Lo que cuesta retomarlo es una ronda entera, no un commit:**

1. Fusionar y correr `npm run test:all` para tener la lista exacta de las trece.
   **Ojo:** varias de ellas viven ahora en `tests/journeys/`, así que sin
   `test:all` no salen.
2. Para cada una, **remedir y recalibrar, no subir el número hasta que pase**.
   Varias son de la capa de vida y miden propiedades sobre semillas concretas
   (`life-props`, `marks`, `daylife`, `life-scenes`, `trade`); dos están en el
   borde de su umbral por coma flotante y se arreglan solas con la aldea nueva,
   pero hay que mirarlas una a una.
3. Volver a pasar `npm run eligibility` y anotar el ritmo nuevo: antes 3,2
   encrucijadas por década.

### Pasos 2 y 3 · relajar, y luego escribir

Con el ritmo remedido, y no antes. `npm run eligibility` dice **plantilla a
plantilla cuántos ticks es elegible y qué regla falla cuando no lo es**, que es
lo que convierte «medio catálogo no sale» en una lista de causas.

Y una señal de haberse pasado: **si la suite de balance de §12.9 empeora.** Hoy
falla doce pruebas y ya fallaba antes; el número a vigilar es la distancia entre
jugar bien y jugar mal, que el diseño pide en veinte puntos y está en cinco.

---

## Carril C · La reja visual, que estaba roja

**Siete recorridos de `npm run test:shots` están declarados** —cuatro con
`test.fail()` y tres con `fixme`— y la cabecera de cada fichero dice por qué.
Ocho de trece fallaban en el commit `1f8abd8`, medido, y llevaban así todo el
programa de interfaz.

**Esta ronda pide capturas a la vista y no se cierra sin ellas.** Cada uno de los
cuatro de interfaz fija una constante de diseño o un tick exacto que las rondas
movieron:

| Recorrido | Qué falla | La vía |
|---|---|---|
| el parte de letargo | fija `rgb(18,17,14)` y U-01 lo pasó a `rgb(26,21,17)` | Comprobar la propiedad: que el velo tapa y sale de la paleta, no un rgb |
| la encrucijada | la semilla 7 ya no planta a los 58 s; v3.60 y v3.61 movieron la trayectoria | **Esperar a que el motor plante una**, en vez de fijar un número |
| el epitafio | `#valley` no da caja al refundar | Hace falta mirar la página para saber por qué |
| el aviso de §11.6 | convive ahora con la cartela de U-02 y la píldora de U-07 | Decidir qué voz manda cuando hay dos, y comprobar eso |

**Y los tres de animales no se recalibran: se sustituyen.** Fotografían el
Canvas, y la cabaña la pinta hoy `render3d/effects/fauna.ts`. Lo que se debe es
una captura de los animales **en 3D**, que además es lo que valida el enganche
del carril A.

**Terminado cuando.** Ni un `test.fail()` ni un `fixme` en `tools/*.shots.ts`, o
los que queden con su medición nueva escrita y el motivo. Y una captura por cada
recorrido tocado, mirada.

### Y lo que la reja visual no cubre: el 3D

No hay ni un recorrido automático que fotografíe el valle en 3D. Hoy se mira a
mano con `npm run shot`, que funciona sin red y pide WebGL por software.
Automatizarlo es una ronda propia, y el criterio de qué se compara —¿píxeles?,
¿una hoja de contactos que alguien mira?— es una decisión de diseño, porque una
comparación de píxeles sobre WebGL por software es una fuente de falsos rojos.

---

## Carril D · Medir (Haiku)

Tras cada entrega de A. **La sonda que comparaba producción y descarte se fue con
V-12** (`probe-models.ts` importaba el descarte), así que lo que queda es la
suite de recorridos y las tablas de `docs/life-rounds/`. Si hace falta una sonda
nueva, se escribe contra `life/` sola y se dice qué compara.

## Carril E · Auditar (Sonnet)

Tras cada entrega de A o C, un agente con `docs/agents.md` §«Cómo se audita lo
que entrega un agente» delante: ancla del worktree, diff entero, pruebas con
desconfianza, remedir. Escribe su informe en `docs/life-rounds/<ronda>-audit.md`
y **no fusiona**: marca lo que hay que mirar.

---

## Lo que no puede hacer ningún agente, y bloquea más que todo lo de arriba

1. **Un teléfono.** Todo lo medido de rendimiento es de un portátil. Desde la
   migración esto no es una deuda, es lo que decide si el 3D se sostiene, y va
   **antes** de borrar `src/render/`. La demo se arma con `npm run shot` y cabe
   en una sola página sin servidor.
2. **La lectura del hito 0 por un tercero.** `npm run reader:packet`, tres
   crónicas, y una pregunta: *«¿en qué se diferencian estas tres aldeas?»*. Ni
   quien diseñó ni quien programó sirven. **El hito 6 está igual.**
3. **Decidir la escala.** En el encuadre de reposo una persona mide **seis
   píxeles**, medido. A esa escala no se ve una charla, ni un encaro, ni a quién
   mira nadie: toda la capa de vida es invisible por defecto. Es D.6.2 y no
   interfaz, y es una sesión de diez minutos mirando la demo.

---

## El mapa grande · brief, con la trampa medida

**Lo que se pidió:** *«el mapa sigue siendo muy pequeño, dijimos que iba a ser
mucho más grande. Vamos a meter más generación: bosques, montañas, lago. El
valle es el centro del mapa pero debe ser más amplio, para que podamos extender
y hacer más cosas.»*

**Lo primero, porque cambia el plan: crecer el mapa NO es cambiar dos
constantes.** El Anexo E lo daba por «dos constantes y un tipo literal», y eso
es verdad de la geometría y falso de la economía. Medido al auditar:

```
mapgen.ts:  const forestCount = Math.round(CELLS * fraction);
```

**El bosque es una fracción del mapa entero.** Con un mapa cuatro veces mayor
hay cuatro veces más bosque, o sea cuatro veces más madera en pie
(`WOOD_PER_FOREST_TILE`), y la madera deja de ser escasa para siempre: se cae
`forest_cut`, se cae `wolf_winter`, y §5.4 —media economía del valle— deja de
apretar. Ésa es la recalibración que tenía la fase aparcada, dicha con el número.

**La vía que no rompe la economía**, y es además lo que el encargo pide:

1. **El bosque, la roca y la marisma pasan a ser cantidades absolutas**, no
   fracciones. Mismo número de celdas productivas que hoy —entre 363 y 605 de
   bosque, que es 0,18–0,30 × 2 016— concentradas alrededor de la fundación. La
   economía no se entera: mismos árboles, misma madera, mismas condiciones.
2. **Lo que llena el resto es terreno nuevo y no productivo.** Dos códigos de
   `TERRAIN_CODE` nuevos —`mountain` y `lake`— que no dan madera, ni forraje, ni
   solar, y que A* no cruza. Eso responde a «bosques, montañas, lago» sin tocar
   una sola constante de balance, y de paso mete la sierra **dentro** del mapa,
   donde hoy es decorado fuera de él (V-14).
3. **`MAX_FIELDS` y `MAX_HOUSES` son topes absolutos y no escalan**, así que la
   aldea no se desparrama: sigue siendo el centro de algo más ancho, que es
   literalmente lo que se pidió.

**El radio de explosión, contado:** 20 ficheros de `src/` miran `TERRAIN_CODE` y
26 sitios usan `WORLD.WIDTH/HEIGHT`. Sube `SCHEMA_VERSION` a 4 y **rompe las
partidas guardadas** — aceptable ahora y no cuando haya un móvil con una partida
de varios días encima, así que si se hace, se hace **antes** del hito 6.

**Orden, y cada paso con su medida:**

1. Los dos códigos de terreno nuevos, con el mapa **al tamaño de hoy**: nada de
   ellos generado todavía, sólo el tipo, el coste de A*, la prohibición de
   construir, el color en las dos paletas y la altura en `RELIEF`. La suite
   entera tiene que quedar idéntica: si algo se mueve, es que un módulo daba por
   hecho que los códigos eran seis.
2. El bosque, la roca y la marisma a cantidades absolutas, **también al tamaño
   de hoy**. Aquí la suite de balance tiene que dar lo mismo que ahora: es una
   reescritura sin cambio de comportamiento y se comprueba así.
3. Y entonces el tamaño, con la montaña y el lago llenando lo nuevo. Pasada
   completa de balance (18 min) y los números de §12.9 comparados contra los de
   antes, uno a uno.

**Lo que falsaría el paso 3:** que la madera en pie por habitante cambie, que la
cadencia de encrucijadas se mueva, o que el coste de un tick a ×64 pase de los
234 ms medidos — una ruta que cruza el valle cuesta 0,09 ms y con un mapa cuatro
veces mayor son unos 0,4; con cincuenta rutas por tick, 20 ms.
