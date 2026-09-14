# El plan siguiente: qué falta, en qué orden, y quién lo hace

**Fecha:** 14 sep 2026, al cierre de la sesión que puso en pie la vida del valle
(V-00 a V-09) y la primera piel de la interfaz (U-01 a U-04). Este documento es
para **delegar**: cada ronda de abajo lleva su brief listo para pegar en un
agente, con el carril del router (`docs/agents.md`) y el criterio de terminado.

**Lo que manda por encima de todo esto:** `CLAUDE.md`, `docs/design.md` (Anexo E
para la vida, §11 para la interfaz), `docs/agents.md` para cómo se delega y cómo
se audita. Y la regla que más veces ha ahorrado una tarde: **medir antes de
tocar, y nunca con una sola semilla.**

## El estado, en cuatro frases

- **La aldea anda como el descarte** (75 % del día, 0 % sin nada que hacer),
  la gente se para a hablar en la proporción correcta (medio rechazo por charla)
  y los animales son agentes. Los trastos existen pero casi nadie juega
  (V-09.md): dos causas medidas y ninguna es un número.
- **La interfaz está cerrada de U-01 a U-09** y el diagnóstico de «se ve muy
  pobre» está atendido: ya se ve qué se puede hacer (barra de destinos), la
  cabecera dice la estación y reacciona, la decisión pendiente es una píldora y
  no una mota, hay pantalla de gente, y el valle suena. **Y buena parte del
  problema no era la interfaz**: el valle abría pintado de invierno y estaba
  sobreexpuesto, las dos cosas corregidas.
- **Los hitos se celebran** con una cartela sobria (U-02) y el arranque dice
  quién llegó y cuándo (U-04). Verificado en captura.
- **Ahora se puede mirar:** `tools/graphics/shot.mjs` hace capturas del juego
  montado con los navegadores que ya hay en la máquina. **Ninguna ronda de
  interfaz se cierra sin captura.**

## Los carriles

| Carril | Rondas | Modelo | Por qué ese modelo |
|---|---|---|---|
| **A · Interfaz** | U-05 ✓ U-06 ✓ U-07 ✓ U-08 ✓ U-09 ✓ — **cerrado** | Sonnet (`Tier: construir`) | Construye contra una dirección ya escrita, con captura obligatoria |
| **B · Vida** | V-09b ✓ → **V-11** → V-12 (la mitad que borra) | Sonnet (`Tier: construir`) | Porta del descarte y engancha; la causa está diagnosticada |
| **C · Medida** | Sonda tras cada ronda de B | Haiku (`Tier: medir`) | No escribe código: corre la sonda y escribe la tabla |
| **D · Auditoría** | Tras cada entrega de A o B | Sonnet, con `docs/agents.md` §«Cómo se audita» | Primera pasada barata; la sesión cara sólo revisa lo que la auditoría marque |

A y B no se pisan: A vive en `src/ui/` e `index.html`; B en `src/render3d/`.
Pueden correr a la vez. C y D van detrás de cada entrega.

**Antes de lanzar cualquiera, dos cosas que ya han costado tiempo:**

1. **El worktree ancla mal a menudo** (cuatro veces de seis). El brief tiene que
   exigir comprobar que existe un fichero **reciente** — hoy sirven
   `src/ui/milestones.ts`, `src/render3d/life/props.ts` o
   `src/render3d/world/props.ts`; `notice.ts` existe desde hace meses y no
   discrimina. Y tiene que decir **cómo** corregirlo: `git merge --ff-only
   <hash de la punta>` sobre un árbol limpio. `git reset --hard` está denegado
   por el candado a propósito, y los dos agentes que se toparon con él
   encontraron esta vía en vez de rodear la intención — pero decírselo de
   antemano les ahorra el rodeo.
2. **Una jornada sola es ruido**, igual que una semilla sola. Cada jornada de
   la capa de vida tiene su propia semilla (`seedOfDay`), así que medir el día 0
   de seis semillas son seis muestras y no seis aldeas. V-09b concluyó que su
   propio trabajo no servía por medir así; remedido en diez jornadas, sí
   servía. Todo brief de la capa de vida tiene que pedir varias jornadas.

---

## Carril A · La interfaz de un juego de verdad

La dirección, escrita aquí para no repetirla en cada brief. Los tokens de U-01
(`index.html`, `:root`) son la paleta y no se cambian: pergamino, tinta, latón.
La voz es la serifa; los datos van en la llana con numerales tabulares. **Nada
de fuentes de red** (la demo abre sin servidor). **§11.4**: nada que anime sobre
el reloj del navegador salvo lo que responda al dedo o se retire solo con
estado definido. **§11.1 sigue en pie**: el valle es el HUD; lo que se añade es
*navegación visible* y *reacción*, no paneles de estadísticas.

### U-05 · La barra de abajo: que se vea a dónde se puede ir

**Problema.** La crónica y las fichas se abren con gestos que nadie descubre.
Un juego de móvil enseña sus destinos.

**Qué.** Una barra inferior de tres destinos, `Valley · Chronicle · People`,
con icono dibujado (SVG inline, como `VITAL_ICONS` en `src/ui/icons.ts`) y
etiqueta corta en `UI_BANK`. Estado activo con tinta sobre pergamino, igual que
la regleta de velocidad. La regleta de velocidad sube y se queda a la derecha,
encima de la barra. `Chronicle` abre `openChronicle`; `People` abre la pantalla
de U-08 (mientras no exista, abre la ficha del último nombrado tocado o nada, y
queda escrito). 44 px mínimos. `safe-area-inset-bottom`.

**Ficheros.** `src/ui/app.ts` (montaje), `src/ui/icons.ts` (tres iconos),
`index.html` (estilo), `src/engine/chronicle/bank.en.ts` (`UI_BANK`: tres
etiquetas). No toca `screens/`.

**Terminado cuando.** Captura de arranque con la barra; captura con la crónica
abierta desde la barra; `npm run typecheck && npm test && npm run lint`.

### U-06 · La cabecera reacciona

**Qué.** Bajo `ANNO III`, una segunda línea en versalitas: la estación
(`seasonOf`, texto de `UI_BANK`) y, si el estado lo tiene, el tiempo. Y las
cuatro cifras **reaccionan**: cuando una cambia, su celda hace un «bump» de
150 ms (transform, en reloj de pared, con estado definido: acabado o no
empezado; con `prefers-reduced-motion` no hay bump). La comida por debajo de
cuatro semanas ya va en `alarm`: que además el icono lo diga (trazo más grueso).

**Ficheros.** `src/ui/app.ts`, `index.html`, `bank.en.ts` (`UI_BANK`).

**Terminado cuando.** Captura tras 30 s a 64× con la estación visible; una
prueba en `tests/fast/ui.test.ts` de que la línea de estación sale de
`seasonOf` y no de un literal.

### U-07 · La decisión pendiente se ve

**Qué.** El punto rojo de `.crossroad-marker` pasa a ser una píldora de
pergamino con filete de latón arriba a la derecha: «A decision waits» (texto en
`UI_BANK`), 44 px, que al tocarla abre la encrucijada. Si hay más de una en
cola, el número.

**Ficheros.** `src/ui/screens/crossroad.ts`, `bank.en.ts`.

**Terminado cuando.** Captura con la píldora visible tras deslizar para cerrar
una encrucijada (`shot.mjs --wait crossroad` y luego swipe).

### U-08 · La gente

**Qué.** La pantalla `People`: la lista de los nombrados vivos con nombre, edad,
oficio si lo hay y rasgos **como palabras** (del banco, no del identificador),
y al tocar uno, su ficha de §11.2 (`panelFor` en `src/ui/inspect.ts` ya la
compone). Misma piel que la crónica (`screens/chronicle.ts` es el modelo).

**Ficheros.** Nuevo `src/ui/screens/people.ts`, `bank.en.ts` (etiquetas de
rasgos si faltan), `src/ui/app.ts` (enganche desde la barra).

**Terminado cuando.** Captura de la lista y de una ficha; prueba de que toda
clave de rasgo mostrada existe en el banco.

### Pendiente de decisión del dueño, no de un agente

**La escala.** En el encuadre de reposo una persona mide seis píxeles (medido).
A esa escala ninguna vida se ve, por buena que sea. Se decidió dejar la cámara
como está para juzgar con números; si la interfaz se sigue viendo pobre con
U-05–U-08 hechas, lo siguiente que hay que mirar es esto y es D.6.2, no
interfaz.

---

## Carril B · La vida

### V-09b · Que se juegue de verdad

**Problema, medido** (`docs/life-rounds/V-09.md`): jugar sólo vale más que lo
que uno hace el 6 % de las veces, y un pase muere porque el receptor tiene que
volver a ganar un concurso de utilidad para recoger la pelota. En el descarte
ninguna de las dos cosas era una decisión.

**Qué.**
1. **Recibir un pase es una reacción, no una elección.** Cuando una pelota
   lanzada a alguien (`Prop.for`, nuevo: id de cuerpo) se para a menos de dos
   celdas de ese alguien, y ese alguien no está en una escena ni lleva nada, la
   coge directamente (`take`) y entra en `play` sin pasar por `decide`. Como
   una escena de V-07: es una interacción entre dos, no una oferta que nombre a
   nadie (E.4 sigue en pie: `propPlaces` no cambia).
2. **`PLAYED_OUT` = [11, 26] s, portado del descarte**: tras tirar, uno no coge
   ni elige `play` hasta que pase. Sin esto el descarte daba 58 pases por
   persona.
3. **Pintar los trastos** en `src/render3d/`: una esfera para la pelota y un
   cilindro para lo demás, con `propsOf` (`cast.ts`), hasta que haya modelos
   por la vía de D.4. Lo que se lleva en la mano va a la altura de la mano.
4. Quitar el `.fails` de la prueba «se juega de verdad en todas las semillas»
   cuando pase, y apretar su cota a lo medido.

**Terminado cuando.** ≥ 0,3 pases por persona y jornada en la mediana de seis
semillas (el descarte en el valle real), ninguna en cero, y **una cadena**: dos
personas que se pasan la pelota tres veces seguidas, medida. Y captura con una
pelota en el aire (`shot.mjs --run`).

### V-11 · Lo que el motor manda

El brief está en E.8. Depende de V-07, V-08, V-09 y V-10: ya se puede. Las
riñas de §7.9 y las reuniones de §11.8 pasan a ser escenas de la capa de vida
en vez de coreografía de `actors/`.

---

## Carril C · Medir (Haiku)

Tras cada entrega de B: `npx tsx tools/graphics/probe-models.ts <semilla>` en
las ocho semillas de `docs/life-rounds/sonda-linea-base.md` y una tabla nueva al
final de ese fichero, con fecha y commit. **No escribe código.** El brief de la
primera pasada está en el historial (`3faacac`) y vale tal cual.

## Carril D · Auditar (Sonnet)

Tras cada entrega de A o B, un agente con `docs/agents.md` §«Cómo se audita lo
que entrega un agente» delante: ancla del worktree, diff entero, pruebas con
desconfianza, remedir. Escribe su informe en `docs/life-rounds/<ronda>-audit.md`
y **no fusiona**: marca lo que hay que mirar. La sesión cara sólo lee eso.


---

## Lo primero al retomar: el recalibrado de `wolf_winter`

**Está hecho y sin fusionar, en la rama `worktree-agent-afdfba3b92d4bb7ee`**
(commit `40708c7`). Baja el umbral de `forestLeft` de 0,25 a 0,15 en
`src/engine/crossroads/catalog/forest.ts`, que es lo correcto: la condición era
imposible por construcción y es la misma errata que `forest_cut` tuvo con su 0,3
y se corrigió así en v2.47. Trae además una prueba nueva
(`tests/fast/crossroads-reachability.test.ts`) que vigila que ninguna plantilla
del catálogo tenga una condición inalcanzable — la prueba que habría cazado esto
el día que se escribió.

**Por qué no se fusionó:** hacerlo elegible mete veintiuna encrucijadas nuevas
en la ventana medida, y eso cambia la trayectoria de cada partida. **Trece
pruebas calibradas sobre semillas concretas pasan a fallar**, comprobado con y
sin el cambio en los mismos ficheros seguidos (5 fallos con, 24 de 24 sin). No
es ruido de carga, aunque lo parezca: el informe del agente lo dio por
flakiness y no lo es.

**Lo que cuesta retomarlo**, y es una ronda entera, no un commit:

1. Fusionar la rama y correr la suite para tener la lista exacta de las trece.
2. Para cada una, **remedir y recalibrar, no subir el número hasta que pase**.
   Varias son de la capa de vida y miden propiedades sobre semillas concretas
   (`life-props`, `marks`, `daylife`, `graphics-actors`, `life-spike`, `trade`);
   dos están justo en el borde de su umbral por coma flotante y se arreglan
   solas con la aldea nueva, pero hay que mirarlas una a una.
3. Volver a pasar `tools/eligibility-report.ts` y anotar el ritmo nuevo: antes
   3,2 encrucijadas por década, y con `wolf_winter` viva habrá que ver.

Y la lección que deja, que es la que ordena el resto del carril del ritmo:
**tocar la elegibilidad de una sola plantilla mueve el balance entero.** Las
otras dos vías decididas —relajar condiciones y escribir plantillas nuevas— van
a costar lo mismo o más, y por eso el orden escrito en `docs/roadmap.md` dice
*un paso, remedir, siguiente paso*.
