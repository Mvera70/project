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
desplazar la simulación.

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
npm test             # suite rápida — menos de 30 s, mide 23,7
npm run test:journeys # jornadas y siglos en varias semillas — menos de 5 min, mide 221 s
npm run test:all     # las dos de arriba
npm run test:balance # siglos en sesenta semillas — minutos, se lanza aparte
npm run lint
npm run shot         # empaqueta el juego y lo fotografía, sin red
npm run test:shots   # recorridos de interfaz en Canvas (Playwright)
npm run test:pwa     # instalable y sin conexión, sobre el build real
npm run chronicle -- --seed 7 --years 60   # runner del hito 0
npm run eligibility  # por qué medio catálogo no sale nunca
```

**La puerta de un módulo:** `npm run typecheck && npm run test:all && npm run lint`.

---

## Estado del proyecto

**El motor está completo. El juego es el 3D** (`src/render3d/`) desde G-12, y la
vida del valle (`src/render3d/life/`) es cómo se mueve la aldea: no hay banderas
y no hay camino de vuelta salvo `?render=canvas`, que **se queda puesto a
propósito** hasta que alguien abra el juego en un móvil de verdad, porque todo lo
medido de rendimiento es de un portátil (G-09 quedó parcial por no haber
dispositivo).

**Cerrado:** el motor (M-01 a M-39), el render (G-00 a G-12), la interfaz (U-01 a
U-09), la vida del valle (V-00 a V-10, V-12, V-13, V-14).

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

**V-11 cerrada (15 sep 2026), y con ella el Anexo E entero.** Las reuniones de
§11.8 habían dejado de ocurrir el día de G-12 —sólo existían en el camino
viejo— y nadie lo vio porque la prueba que las vigilaba llamaba a `actorsFor`
directamente. `life/staging.ts` baja las órdenes del motor a la jornada: del
77 % al 100 % de la aldea va donde la decisión dijo. Lo que **no** se sirve es
la riña de §7.9, y por una razón medida: la crónica guarda los **nombres** de
los dos, no sus `id`, y `quarrelOf` no se puede llamar desde `life/` porque
consume azar del motor. Servirla es un cambio del motor.

**Lo que decide si hay juego no es gráfico.** El jugador toma entre siete y doce
decisiones en cuarenta años y diez de las veinte plantillas del catálogo no
salieron ni una vez en cinco partidas (`docs/findings-drama.md`). La decisión
está tomada (`docs/roadmap.md`, 14 sep): arreglar los dos fallos, relajar
condiciones y escribir plantillas de menor peso, **un paso y remedir**.

**Reglas que cuestan tiempo cada vez que se olvidan:**

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

**Los hitos humanos 0 y 6 siguen sin validar**, y no se declaran superados ni se
sustituyen por pruebas automáticas. Son la deuda más antigua del proyecto.

---

## Dónde está cada cosa

| Qué necesitas saber | Dónde |
|---|---|
| Las reglas vigentes | `docs/design.md` — §1–4 primero |
| Cómo se llegó a ellas | `docs/changelog.md` — el motivo de cada revisión |
| En qué estado exacto está todo, y qué trampas ya costaron tiempo | `docs/handover.md` |
| Qué se hace ahora, con briefs listos para agentes | `docs/next-plan.md` |
| El plan que sacó al proyecto del atasco, y qué entregó | `docs/plan-juego.md` |
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
