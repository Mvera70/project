# The Valley — instrucciones para agentes

Simulación idle de una aldea medieval para móvil. TypeScript, Three.js, PWA.

**La especificación completa es `docs/design.md`.** Este fichero es solo lo que
hay que tener en la cabeza siempre. Cuando algo no esté aquí, está allí.

---

## Antes de tocar nada

1. Lee `docs/design.md` §1–4 (decisiones, convenciones, modelo de dominio, tick).
   Son quince minutos y evitan reescrituras.
2. Localiza tu módulo en `docs/design.md` §17 y lee **tu brief**. Define los
   ficheros que tocas, el contrato de API literal, los tests exigidos y el
   criterio de terminado. Los del render están en el Anexo D §D.12, y los de la
   vida del valle en el Anexo E §E.8.
3. Trabaja solo en los ficheros que tu brief lista. Si necesitas cambiar uno
   ajeno, dilo en el PR; no lo hagas.

---

## Innegociables

**El motor no sabe que existe una pantalla.** En `src/engine/` está prohibido
`Math.random`, `Date`, `performance.now`, `document`, `window`, e importar de
`src/render/`, `src/render3d/`, `src/derive/` o `src/ui/`. ESLint lo verifica.

**Todo determinista.** Misma semilla y mismas decisiones → misma partida, byte a
byte. La aleatoriedad viene de flujos con nombre (`weather`, `births`,
`crossroads`…), nunca compartidos. Añadir una tirada en el render jamás puede
desplazar la simulación. **Con una frontera, escrita en §1b (18 sep 2026): el
asedio.** La meta del juego es una villa cerrada que cae o aguanta, y el asalto
se resuelve **en físico** —flechas, choques, un portón que se rompe— y no es
determinista por decisión del dueño («que dos jugadores con la misma semilla
tengan finales distintos no importa, esa es la gracia»). Su resultado entra al
motor como datos por la puerta de `PlayerAct`, igual que lo que hace el
jugador: el motor sigue siendo determinista dadas sus entradas.

**Ningún número se inventa.** Todas las constantes del juego viven en
`src/engine/balance.ts` y salen de `docs/design.md` §12. Si necesitas una que no
existe, añádela ahí con `// TUNE:` y menciónalo en el PR.

**El orden del tick es normativo.** Los 17 pasos de `docs/design.md` §4.2, en
ese orden, con los comentarios numerados. Cambiarlo cambia el balance y rompe
las partidas guardadas.

**Toda opción de encrucijada cambia algo en pantalla.** `visible.length >= 1`,
siempre. Hay un test que lo comprueba. Es el principio 1 del juego convertido en
aserto.

**El estado es plano y serializable.** Sin clases, sin `Map`, sin `Set`, sin
referencias circulares. Objetos, arrays y referencias por `id`.

**Nada de texto en el código.** Todo lo que lee el jugador va en inglés y sale
del banco de plantillas de `src/engine/chronicle/bank.en.ts`. Los sistemas
empujan claves y parámetros, no frases.

**Las cuatro capas, y las flechas van en un solo sentido.** Cada frontera tiene
prueba, y saltársela es lo que costó la auditoría del 15 sep 2026:

| Capa | Qué manda | No conoce |
|---|---|---|
| `src/engine/` | La partida: quién nace, quién muere, cuánto grano | Nada de lo de abajo |
| `src/derive/` | Lo que el estado dice, antes de pintarlo. Puro | Ningún render, ninguna pantalla, Three |
| `src/render3d/life/` | Dónde está cada cuerpo **ahora**, a paso fijo. Efímero | El motor, salvo para leerlo |
| `src/render3d/` · `src/ui/` | La tinta y las pantallas | — |

---

## Idiomas

| Qué | Idioma |
|---|---|
| Identificadores, tipos, ficheros | Inglés |
| Comentarios del código | Español, y es deliberado (§2.2) |
| Contenido del juego (crónica, UI, nombres) | Inglés |
| Documentación y conversación | Español |

---

## Comandos

```bash
npm run dev          # servidor con recarga en caliente
npm run typecheck    # tsc --noEmit
npm test             # suite rápida — **y rápida de verdad**: las cuatro partidas
                     # largas del motor viven en las jornadas (ver abajo)
npm run test:journeys # jornadas y siglos en varias semillas — menos de 5 min, mide 221 s
npm run test:all     # las dos de arriba
npm run test:balance # siglos en sesenta semillas — minutos, se lanza aparte
npm run lint
npm run shot         # empaqueta el juego y lo fotografía, sin red
node tools/graphics/shot.mjs --seed 11 --year 50   # **abre el valle en ese año**: el menú
                     # lo hace desde U-10b, así que ya no hay que falsear el reloj
node tools/graphics/film.mjs --seed 11 --year 50 --seconds 10 --fps 6 --out artifacts/graphics/film/x
python tools/graphics/film-sheet.py artifacts/graphics/film/x
                     # **rodar el valle y leerlo**: fotogramas seguidos + la traza de
                     # cada cuerpo en cada uno (`window.__valleyLife`), y de ahí una
                     # tira de contactos y un informe de anomalías. Es la única forma
                     # de medir la capa de vida **como la ejecuta el navegador**: el
                     # informe de fuera (`tools/life-report.ts`) no vio nunca que una
                     # de cada cinco muestras era alguien de pie creyendo que iba a
                     # algún sitio (IA-9)
npm run test:shots   # recorridos de interfaz en Canvas (Playwright)
npm run test:pwa     # instalable y sin conexión, sobre el build real
npm run chronicle -- --seed 7 --years 60   # runner del hito 0
npm run eligibility  # por qué medio catálogo no sale nunca
```

**La puerta de un módulo:** `npm run typecheck && npm run test:all && npm run lint`.

**Y una regla del dueño del diseño, del 16 sep 2026, que manda sobre todo lo de
arriba:** «hay que evitar a toda costa estar separado más de media hora haciendo
pruebas; si las pruebas no son posibles, hay que cambiar cómo las hacemos».
Durante una ronda de trabajo la verificación es **typecheck, lint y los ficheros
que se tocan**, y nada más; la suite entera se deja para el cierre de una tanda.
Y si una prueba no cabe en la suite rápida, **se muda a las jornadas** —donde los
minutos están permitidos por diseño— en vez de dejar que la suite rápida deje de
serlo: las cuatro partidas largas del motor (un siglo de bosque, cien años de
riñas, la crónica de una vida, el desgaste del suelo) se comían cuarenta y cinco
segundos y viven desde entonces en `tests/journeys/engine-long.test.ts`, con el
mismo cuerpo y el mismo umbral.

---

## Estado del proyecto

**El motor está completo. El juego es el 3D** (`src/render3d/`) desde G-12, y la
vida del valle (`src/render3d/life/`) es cómo se mueve la aldea: no hay banderas
y no hay camino de vuelta salvo `?render=canvas`. **Y el juego ya se ha abierto
en un móvil de verdad: el dueño del diseño lo probó en su iPad y su iPhone el 15
sep 2026 y funciona.** Lo que sigue sin existir es una medida de fotogramas en
dispositivo —todo lo medido de rendimiento es de un portátil, G-09 quedó parcial
por no haber dispositivo—, pero eso es un dato que falta y no un riesgo: el 3D
se sostiene. La puerta de vuelta se queda por si acaso, no porque haga falta.

**Cerrado:** el motor (M-01 a M-39), el render (G-00 a G-12), la interfaz (U-01 a
U-14), la vida del valle (V-00 a V-10, V-12, V-13, V-14).

**Y la versión 2.0, del 15 sep 2026, entregada** (`docs/plan-juego.md`, con sus
medidas en `docs/handover.md` §2.1). El juego tiene un verbo: tres palancas de
órdenes permanentes —cuánto se siembra, dónde van las manos que sobran, qué se
levanta antes—, la aldea contesta cuando no puede obedecer, cada cifra dice
hacia dónde va, y cada valle saca dos rasgos de cuatro. Con ellas: el reloj a
velocidad entera (ocho semanas por jornada a cualquier velocidad), los tres
defectos de los mensajes, **el mapa grande** —72 × 112, con el corazón
productivo de 36 × 56 en el centro, montañas, lago— y **el vado, que se cruza**:
A* no cruzaba el agua, así que nadie cruzaba el río nunca y media aldea se
quedaba sin ruta.

**Y la trampa que esa ronda dejó escrita, porque costó media página de
conclusiones falsas: un informe que avanza el mundo con `tick` en un bucle no
mide este juego.** Nadie contesta las encrucijadas, la primera planteada se
queda pendiente para siempre —§8.6 no plantea dos— y con ella se van sus
consecuencias, sus semillas y las obras que conceden. Así medí «de 0,3 a 0,5
obras al año, la piedra nunca, 1,04 sucesos por sesión» y estuve a un paso de
relajar A.16 por eso. Jugada con `run` y la política prudente: **67 a 99 obras
en sesenta años, piedra en los años 42 a 45, 1,45 sucesos por sesión.** Está
contado en `docs/handover.md` §2.1.

**Y desde v3.69 la aldea la fundan dos** —un hombre y una mujer— y crece con
los que llegan (§12.2, §5.7). Es decisión del dueño del diseño, con la premisa
del juego dicha por él: **un idle bonito de mirar de fondo, cuya esencia es que
cada valle salga distinto.** Lo que no se puede olvidar: `foundGame(seed)` es
la pareja; las pruebas que reparten oficios o miden la subsistencia de una
aldea hecha usan `foundTwenty` (`tests/helpers/founding.ts`), y lo que la
pareja promete lo guarda `tests/journeys/founding.test.ts`. Detrás vienen, en
este orden y pedidos por él: el menú de inicio (U-10, hecho: `screens/title.ts`,
sólo se configura el número del valle), el inicio guiado desde lo alto (U-11,
hecho: `flyIn` en el renderer y dos pistas en `app.ts`), el reloj con horas
(U-12, hecho) y las tormentas con rayos (U-13, hecho: §10.7). **Los cinco
están entregados**; lo que queda por delante está en `docs/next-plan.md`,
sección «Para quien siga».

**Y con el reloj, el tick cambió de duración: una semana son catorce minutos a
×1** (v3.72, §12.1). No es un ajuste de gusto: es lo que hace que una jornada de
sol sea un día y que la cabecera pueda decir la hora. Lo que hay que saber antes
de medir nada: **lo que antes pasaba a ×1 pasa ahora a ×64**, así que un informe
o una prueba que hable de «una sesión de cinco minutos» tiene que decir a qué
velocidad; la identidad `REAL_MS_PER_TICK = DAYS_PER_WEEK · SCENIC_DAY_SECONDS`
la vigila `tests/fast/clock.test.ts` y romperla devuelve el juego a ocho
amaneceres por semana.

**V-11 cerrada (15 sep 2026), y con ella el Anexo E entero.** Las reuniones de
§11.8 habían dejado de ocurrir el día de G-12 —sólo existían en el camino
viejo— y nadie lo vio porque la prueba que las vigilaba llamaba a `actorsFor`
directamente. `life/staging.ts` baja las órdenes del motor a la jornada: del
77 % al 100 % de la aldea va donde la decisión dijo. Lo que **no** se sirve es
la riña de §7.9, y por una razón medida: la crónica guarda los **nombres** de
los dos, no sus `id`, y `quarrelOf` no se puede llamar desde `life/` porque
consume azar del motor. Servirla es un cambio del motor. **Desde R-1 hay un
atajo:** la riña de la plaza (`quarrel_in_the_square`) guarda los `id` de los
dos en `state.happenings[n].who`, y `staging.ts` puede leerlos sin tocar el
motor (`docs/rework.md` §4, R-2).

**Lo que decide si hay juego no es gráfico.** El jugador toma entre siete y doce
decisiones en cuarenta años y diez de las veinte plantillas del catálogo no
salieron ni una vez en cinco partidas (`docs/findings-drama.md`). **La medida
sigue valiendo; el plan de arreglarla, no** (ver arriba: el rework).

**Reglas que cuestan tiempo cada vez que se olvidan:**

- **Un umbral que decide *cuándo* pasa algo se mira en horas de reloj, no en
  años de juego.** `npx tsx tools/pace-report.ts` imprime la escalera del juego
  en horas a ×1, que es la velocidad por omisión y la unidad en la que el dueño
  del diseño pone los objetivos («la edad de piedra en 60/70 horas»). A catorce
  minutos por semana, **una hora real es un mes de juego**. Medirlo en años es
  lo que dejó pasar tres días que v3.72 había multiplicado la semana por 56 sin
  que nadie remidiera el §12: cuatro constantes decían una cosa y significaban
  otra, y una de ellas lo llevaba escrito en su propio comentario («30 minutos
  reales a ×1») sin que nadie cambiara el número (B-1, §12.1).
- **En la capa de vida, un umbral no se fija con una jornada, igual que no se
  fija con una semilla.** Cada jornada tiene su propia semilla (`seedOfDay`), así
  que el día 0 de seis semillas son seis muestras, no seis aldeas.
- **Una prueba que llama a una función directamente no sabe si el juego la
  llama.** Treinta pruebas verdes vigilaban el camino muerto mientras el vivo no
  tenía ninguna. Cuando un camino se vuelve opcional, sus pruebas se mudan al
  camino vivo **el mismo día**.
- **Un recorrido de navegador tiene que decir contra qué render corre.** Los dos
  que había pasaban por no tener WebGL: el relevo a 3D fallaba en silencio, que
  es lo correcto para el jugador y desastroso para una prueba.
- **Una migración sin su documentación no está hecha, está escondida.** G-12
  activó el 3D y dejó la especificación describiendo el juego anterior; de ese
  día salieron cuatro regresiones invisibles.
- **Ninguna ronda de interfaz se cierra sin captura**, y ahora se puede:
  `npm run shot`.

**La meta del proyecto está en `docs/design.md` §1b (18 sep 2026): una villa
cerrada que cae o aguanta.** Cuatro fases —caserío, aldea, villa cerrada,
asedio—, las dos primeras hechas y medidas en horas de reloj (B-1), la tercera a
medias y la cuarta por hacer. Se cae por las decisiones, no por un rayo; la
defensa se construye *dando* (armas, portón, atalaya) y el «tower defense» es
literal —aldeanos en la muralla disparando— pero nada se coloca con el dedo.
Toda ronda nueva se ordena contra esa tabla.

**Los hitos humanos 0 y 6 se descartan** (dueño del diseño, 15 sep 2026). Eran
la deuda más antigua del proyecto —una lectura de tres crónicas por un tercero y
el parte de bienvenida leído por quien no lo escribió— y dejan de bloquear: no
se validan y no se sustituyen por pruebas. Siguen descritos en `docs/design.md`
§9.5 y §15.1 como el criterio con el que se construyó el motor.

**`docs/task-log.md` es el cuaderno de tareas: dónde está el rework, qué está en
vuelo, qué cifras mandan y qué está abierto.** Se lee antes que nada y se
actualiza antes de cerrar cualquier ronda — existe porque sin él cada sesión
reconstruía el estado leyendo commits. `docs/rework.md` dice el plan;
`task-log.md` dice el punto exacto.

**El rework está en marcha, y `docs/rework.md` es el plan que manda.** El
dueño lo pidió el 15 sep («mucho más aleatorio y con mucha más vida … cargárselo
casi entero») y la primera fase está en `main`: **R-1, los sucesos del valle**
(v3.75; §7.10, §12.10, paso 2b de §4.2). Cada semana el motor tira en el flujo
`fate` contra doce sucesos —rayo, riada, lobos, boda, buhonero, pesca, tejado
bajo la nieve, fiesta de la cosecha, riña en la plaza, oso, niño perdido,
forastero— y el que sale cambia el estado, se cuenta y se ve. Medido: trece al
año, rencores donde antes no había ninguno. **Lo siguiente es la IA de animales
y personas** («atraviesan paredes, dan vueltas sobre sí mismos»: `rework.md`
§3, con diagnóstico, medida y orden de arreglo), después R-2/R-5 (gente
distinta, escenas) y R-3 (diez rasgos de valle). Las encrucijadas se quedan y
**no se afinan**.

**Y desde el 17 sep 2026, la parada de las mecánicas: el juego de los
medios.** El dueño lo dijo sin rodeos —«ahora mismo no es nada divertido; lo
único bonito es mirar cómo avanza el pueblo»— y `docs/plan-medios.md` lo mide:
las tres palancas de órdenes de v2.0 **son una trampa** (sólo vive la postura
de fábrica; `timber` a 0,2 mata 11 aldeas de 16), las encrucijadas pesan (42
personas contra 6) pero no se sienten, y la aldea prospera sola porque §1 lo
manda. Lo que sustituye a todo eso, con sus palabras: «le das una pala o un
martillo y hacen cosas distintas; tú no les dices qué hacer». **El jugador
mete cosas en el valle —un arado, unos cerdos, un barril— pagándolas con lo
del valle, y la aldea decide qué hace con ellas.** Piedra y plata entran como
existencias, el ánimo se enseña como cara, las palancas se retiran, nada se
coloca con el dedo, y el mundo sólo rompe lo que el jugador cargó. **Los
briefs están en `docs/rework.md` §4b (M-0 a M-4) y van antes que R-2, R-5 y
R-3.** La medida que decide si el patrón vale es la de M-2.

Tres cosas del dueño que mandan sobre cualquier otra regla de este fichero:
**el caos es el juego** («que haya partidas que se rompan es la idea»: las dos
puertas del rayo que R-1 puso hay que quitarlas, `rework.md` §2.6); **los planes
de prueba y el nivelado van después**, la puerta es la suite rápida y las
jornadas y nada más; y **nueve jornadas están rojas por la trayectoria nueva**
(`rework.md` §2.8, cada una con su causa), sin tocar porque pidió parar y
documentar. **Y desde v3.75 la aldea de veinte años de cualquier semilla ya no
es la de antes** (16 personas en la semilla 7): un cambio del motor mueve todas
las pruebas que midan una aldea hecha, y cada listón movido lleva su causa
escrita (`rework.md` §2.7).

---

## Dónde está cada cosa

| Qué necesitas saber | Dónde |
|---|---|
| **Dónde está el rework ahora mismo, y qué toca** | **`docs/task-log.md` — se lee primero y se actualiza al cerrar cada ronda** |
| Las reglas vigentes | `docs/design.md` — §1–4 primero |
| Cómo se llegó a ellas | `docs/changelog.md` — el motivo de cada revisión |
| En qué estado exacto está todo, y qué trampas ya costaron tiempo | `docs/handover.md` |
| Qué se hace ahora, con briefs listos para agentes | `docs/next-plan.md` |
| El plan que sacó al proyecto del atasco, y qué entregó | `docs/plan-juego.md` |
| **El plan hacia la meta: puntos, fases, prioridad, dificultad y a qué agente** | **`docs/plan-meta.md`** |
| **Lo que hace falta de Blender y 3D** — se apunta **en la misma ronda** que se descubre | **`docs/encargos-3d.md`** |
| Qué falta en total, y qué no puede hacer ningún agente | `docs/roadmap.md` |
| Cómo se delega y se audita | `docs/agents.md` |
| Por qué el catálogo no sale | `docs/findings-drama.md` |
| Informes de ronda | `docs/graphics-rounds/`, `docs/life-rounds/` |
| Quién es dueño de qué, si hay dos sesiones | `docs/dos-sesiones.md` |

**Antes de tocar `life/`, lee E.1, E.3, E.6 y E.7 del Anexo E** — el diagnóstico,
los seis innegociables, por qué la demo era peor que el descarte, y las trampas
que ya han costado una tarde cada una. Después, el brief de tu fase en E.8.

---

## Cómo se escriben los tests

Describen **propiedades del diseño**, no detalles de implementación. Nada de
comprobar que una función llama a otra, y nada de congelar una lista literal que
crece: una prueba de frontera que comparaba los imports de un fichero contra una
copia congelada se rompía al añadir un tipo, sin que nada de lo que guardaba
hubiera cambiado.

Los umbrales nunca se fijan con una sola semilla: dos partidas divergen desde el
primer tick y una sola es ruido. Suma varias.

Y cuando algo no llega, **se escribe lo que se midió y se deja la prueba como
`it.fails` con la propiedad del brief intacta**, en vez de bajar el listón. Está
hecho así en `life-props.test.ts`, en `life-staging.test.ts` y en los recorridos
de `valley.shots.ts`, y es el patrón a repetir.

---

La ruta original del motor, ya recorrida:

```
M-01 rng/time → M-02 state/balance → M-03 people → M-04 demography
                                   → M-05 opinions
                                   → M-06 subsistence
                                   → M-09 chronicle
                                   → M-07 crossroads → M-08 catalog
                                                     → M-10 sim + CLI  ← HITO 0
```
