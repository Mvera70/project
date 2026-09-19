# IA-5 · Fauna silvestre y render

**16 sep 2026.** Séptima y última fase de la tanda de
`docs/life-ai-implementation-prompt.md`. Implementada por una sesión de Sonnet
sobre `640f6c3`. Cierra la tanda de IA: IA-0 a IA-6 hechas.

---

## 1. Lo que se entrega, y lo que se decide no entregar

**El lobo migra. El cuervo y el pez se quedan como están, con el motivo
escrito.** Era el criterio que le di —«prefiero una especie bien hecha que dos a
medias, y un encargo de arte documentado a una pose fingida»— y lo aplicó:

- **El lobo** tiene cuerpo vivo en `src/render3d/life/wildlife.ts` (nuevo), y
  **sólo aparece la semana real del suceso**: `staging.wolfRaidToday()` lee
  `wolves_at_the_coop` de `state.happenings`, en vez de cualquier noche de
  invierno, que es lo que hacía el decorado de fórmula. Navega con el mismo A*
  que el resto de la capa (`Router`/`pathTo`), no en línea recta, y con un aviso
  de progreso del estilo de `noProgress()` para no atascarse en un mínimo local
  de `seek()` contra `avoid()` cerca de una esquina.
- **El cuervo** no se migra: **no hay hecho real detrás**, es decorado sin
  mecanismo, y migrarlo no aporta nada observable.
- **El pez** no se toca, como pedía el brief.
- **Ningún encargo de arte pendiente:** la malla `wolf` ya estaba en el catálogo
  de `FAUNA` (`renderer.ts`), sin tocar.

**Una sola fuente de posiciones en 3D, y Canvas entero.** Era la trampa que el
brief marcaba en rojo. `Fauna.update()` descarta `'wolf'` de la fórmula vieja
**incondicionalmente** y pinta el que le pasa `renderer.ts`. `derive/animals.ts`
**no se ha tocado ni una línea**: `wildlifePositions` sigue dando el lobo
decorativo, y el renderer de Canvas lo sigue llamando directamente sin pasar por
`Fauna`. Dos pruebas nuevas lo vigilan (`describe('IA-5 · el lobo tiene una sola
fuente en 3D')`).

**La gallina reacciona con el reflejo que ya existía.** `stepBeasts()` gana un
`threat: Point | null` opcional; si el lobo está a menos de
`WOLF_ALARM_RADIUS` (3,5 celdas), la gallina huye con la misma `flee()` que ya
usaba para una persona. **Sin registro de compromisos**, porque huir no es un
compromiso — el mismo criterio que la consolidación de IA-4 fijó.

**Y el lobo no decide nada del censo.** Si el suceso dice que se llevó gallinas,
`state.herd.hens` ya viene descontado por el motor antes de que la vida vea el
estado del día. El lobo **lo enseña**, no lo causa.

---

## 2. Lo medido

**Amenaza, reacción, recuperación** (`tests/journeys/life-wildlife.test.ts`,
cinco semillas de `foundTwenty`, cuarenta años):

| | resultado |
|---|---|
| aparece en la jornada del suceso | 5 de 5 |
| se recupera sola | 5 de 5 |
| **se queda colgada** | **0 de 5** |
| se llega a notar de verdad, con gallinas cerca | 3 de 5 |

El 3 de 5 es un límite real y está escrito como tal, no un umbral bajado: con
ruta de A* el lobo casi nunca se cuelga, pero `seek()` y `avoid()` a veces se
cancelan cerca de una esquina y la visita se da por plantada algo más lejos del
corral de lo que hace falta para que una gallina la note. Es el mismo tipo de
límite que `IA-6.md` acepta para la riña.

**Las cuatro cifras de movimiento: idénticas.** `tools/reports/life-report.ts 7 23 97
--days 2`, medido con sus cinco ficheros en HEAD y con sus cambios aplicados:
**el mismo resultado en los dos casos** (centro en muro 0, círculo 0,07 %, giros
0,38 %, parados 0,09 %). Cero regresión medible.

---

## 3. Los tres errores de esta fase, y los tres son de método

Los escribo porque los tres cuestan tiempo y los tres se repiten:

1. **Un `vitest` en segundo plano con la salida redirigida parece colgado y no
   lo está.** En este entorno el stdout se queda en el búfer hasta que el
   proceso termina. Su run de verificación llevaba **una hora y seis minutos**
   así, con **29 procesos** vivos —un trabajador por núcleo, la máquina tiene
   28— saturando la máquina. Lo maté yo. Y de rebote explicó el otro misterio de
   la sesión: el punto 4 de C-1 encontró que las caídas de «Worker exited
   unexpectedly» no eran de ninguna prueba, era **contención por runs
   huérfanos**.
2. **Una prueba que crece un valle a cuarenta años y le vive una jornada entera
   no cabe en la suite rápida.** `life-wildlife.test.ts` tardaba **63 segundos**
   ella sola. La movió entera a `tests/journeys/`, conservando cuerpo y umbral,
   que es la regla que se escribió unas horas antes en `CLAUDE.md`. Allí tarda
   44 s, dentro del presupuesto.
3. **Y lo mejor que hizo: no aceptar la culpa de cuatro rojas que no eran
   suyas.** Yo le mandé cuatro fallos de `graphics-effects.test.ts` como si
   fueran de su migración, incluido uno —`expected 0 to be greater than 0` sobre
   la fauna— que encajaba tan bien con el riesgo de la doble fuente que yo daba
   por hecho que era eso. Lo comprobó tres veces, revirtiendo sus cinco ficheros
   y hasta los del agente de Blender, y demostró que fallan **con el árbol
   limpio en HEAD**. **Lo verifiqué yo después con `git stash`: tenía razón.**
   Son mías, de una ronda anterior, y van como punto aparte de C-1.

---

## 4. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
graphics-effects, life-motion, life-beasts, animals, graphics-world,
  module-graph   → 124 de 128 verdes
tests/journeys/life-wildlife.test.ts  → 9 de 9 verdes, 44 s
```

Las cuatro rojas son las de §3.3, **preexistentes y comprobadas como tales por
los dos**, y no de esta fase.

---

## 5. Sin captura, y el hallazgo vale más que la captura

No hay secuencia del lobo, y el motivo es un hallazgo que ahorra horas a quien
retome cualquier captura de un suceso concreto:

- **La partida jugada sin contestar encrucijadas diverge de la jugada con
  política `'prudent'`.** Buscar la semana de un suceso con un guion offline y
  luego pedirle a `shot.mjs --advance N` esa misma semana **no funciona** pasado
  el primer cruce de caminos: son dos trayectorias distintas del mismo azar.
  Esto es la misma trampa que `CLAUDE.md` ya documenta para los informes, vista
  desde otro lado.
- **`.valley-doing` no es la crónica**: es el estado de obra. El aviso real está
  en **`.valley-notice`**.
- **Los avisos se suprimen mientras el juego está recuperando tiempo**
  (`catchingUp`), así que con saltos de reloj falso no se ven ni mirando el DOM.
- La vía que sí debería funcionar: fundar sin `--advance` o con muy poco, dejar
  correr tiempo real a ×64 con `--speed`, y mirar `.valley-notice`.

---

## 6. Qué observación refutaría esta fase

Un lobo pintado en 3D fuera de la semana de `wolves_at_the_coop`. Una gallina
que no reacciona nunca a él. Un lobo o una gallina atravesando una pared.
`Fauna` pintando el lobo dos veces a la vez, de fórmula y vivo. Canvas dejando
de mostrar su lobo decorativo. Reconstruir el mismo día con la misma semilla y
ver otra trayectoria.
