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
