---
name: battle-sandbox
description: Cómo funciona, se usa, se comprueba y se amplía el banco de batallas de The Valley (`?sandbox=battle`): una villa amurallada real con un asalto que llega hoy, mandos (defensores, arma, asaltantes, tiempo) y métricas en directo de batalla y rendimiento, en ordenador y en móvil. Úsala al tocar el combate (src/render3d/life/raiders.ts, archery.ts, melee.ts, physics.ts, ragdoll.ts, sack.ts, garrison), al añadir al banco una métrica, un mando o algo nuevo que probar del combate, o cuando Vera pida probar o medir una batalla.
---

# El banco de batallas

Lo pidió Vera el 27 sep 2026: «un sandbox muy simple donde se puedan ver batallas y
métricas en directo … yo mismo quiero ver y probar cómo se reproduce el combate para
corregirlo: físicas, animaciones, gore». **En el futuro se le irán integrando más
cosas del combate para probarlas**: esta skill es cómo hacerlo sin romper lo que hay.

## Qué es, en una frase

`?sandbox=battle` abre **el combate del juego, no una copia**: la villa amurallada de
la semilla 7 en el verano del año 60 (la escena de referencia del adarve, E3b), con
armas y arcos dados y un asalto que llega hoy, la interfaz escondida y un panel con
mandos y cifras. Lo único que el banco cambia es **cuántos cuerpos hay a cada lado**,
y lo cambia en la capa de vida: el motor no sabe nada.

## Cómo se abre

| Dónde | Dirección |
|---|---|
| La demo publicada (también en el móvil) | `https://mvera70.github.io/project/?sandbox=battle` |
| En local | `npm run dev` y `http://localhost:5173/?sandbox=battle` |
| El juego empaquetado | `npx tsx tools/graphics/bundle-game.ts --out <carpeta>` y `valley.html?sandbox=battle` |

Parámetros (todos opcionales, con tope):

| Parámetro | Por omisión | Rango | Qué hace |
|---|---|---|---|
| `defenders` | 6 | 0–60 | Manos en el cerco. **Sin el tope de §12** (`defenders()` del motor da como mucho unas siete). No puede haber más que puestos: portones, torres y tramos de muralla |
| `arm` | `bow` | `bow` · `spear` | Arma de torres y muralla. **El portón se sujeta siempre con lanza** (regla de `postsOf`) |
| `raiders` | 12 | 1–80 | Asaltantes. **Sin el tope de `BAND_SHOWN` (12)** del juego |
| `seed`, `year` | 7, 60 | — | La villa. Tiene que tener cerco cerrado con portón; la 7/60 lo tiene |

El asalto es siempre **asalto** (van a por el portón), no saqueo.

**No guarda nunca.** `boot(…, { ephemeral: true })` anula `persist`: en el móvil el banco
comparte navegador con la partida de Vera, y la pisaría. Si tocas `boot` o `persist`,
esto no se puede perder (hay que mantener la guarda en `app.ts`).

## El panel

- **Batalla**: defensores, arma, asaltantes. «Lanzar asalto» recarga con esos números
  (una partida limpia cada vez); «Reiniciar» repite la misma.
- **Tiempo**: Pausa, ×¼ (cámara lenta), ×1, ×4. La cámara lenta frena **el tiempo real
  que entra al bucle** (`startLoop(…, scale)` en `src/ui/loop.ts`), así que se frena
  todo a la vez —cuerpos, animaciones, hora— porque todo cuelga del tick y su fracción.
- **En directo** (cada 250 ms): estado (esperando · peleando · aguantaron · entraron),
  duración en segundos reales, defensores y asaltantes en pie, bajas de cada lado,
  flechas y aciertos (%), golpes al portón (de 60), roto y dentro; FPS, ms del paso de
  Rapier (último y media), cuerpos físicos, ragdolls activos (**tope 24**), cascotes,
  llamadas de dibujo y triángulos.
- **Copiar métricas**: JSON del resumen (`BattleSummary`) al portapapeles, para
  comparar batallas. Si el navegador no deja, lo enseña en un cuadro para copiarlo a mano.
- En pantallas de ≤600 px empieza **plegado**, con un resumen de una línea.

**La batalla no es determinista, y es a propósito** (§1b, decisión de Vera): dos asaltos
iguales acaban distinto. Para comparar, se repite varias veces y se miran medias.

## Cómo está hecho (ficheros y ganchos)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Entrada | `src/main.ts` | `?sandbox=battle` → `openBattleSandbox(root)`, antes que cualquier otra ruta |
| Banco | `src/ui/sandbox.ts` | Lee la dirección (`battleSetupFrom`, `battleUrl`), monta la partida (`stateAt`, `giveNow`, `raidNow`), la arranca efímera, esconde la interfaz (clase `bare`), monta el panel y lee las cifras. `battleOutcome` decide el estado |
| Guarnición a medida | `src/derive/garrison.ts` · `garrisonAs(state, hands, arm)` | Los puestos del juego y en su orden (`postsOf`), con las manos y el arma pedidas. Pura |
| La jornada | `src/render3d/life/village.ts` · opción `battle: { raiders, garrison }` | Sustituye el número de asaltantes y la guarnición **sólo si hay asalto hoy** |
| Puestos | `src/render3d/life/garrison.ts` · `garrisonPlaces(…, chosen)` | Usa la guarnición dada en vez de `garrisonOf` |
| Ganchos del renderer | `src/render3d/renderer.ts` | `window.__valleyBattle(choice \| null)` fija la batalla y rehace la jornada; `window.__valleyBattleStats()` devuelve `BattleStats` (ligero, sin posiciones de pantalla) |
| Ganchos de la app | `src/ui/app.ts` | `__valleySpeed(0\|1\|4)`, `__valleyTimeScale(0.05–1)`, `__valleyLook(x, y)` |
| Física | `src/render3d/life/physics.ts` | `stats.stepMs` y `stats.stepMsAverage` (media móvil 0,95) alrededor de `world.step()` |
| Sin navegador | `tools/reports/battle-report.ts` | La misma batalla paso a paso con Rapier, impresa |
| Pruebas | `tests/fast/battle-sandbox.test.ts` | Dirección y topes, `garrisonAs`, la jornada con más cuerpos que el juego sin tocar el motor, y `battleOutcome` |

De dónde sale cada cifra: la defensa es `life.defence` (`village.ts`, el mismo parte que
lee el motor por B4); las fases, `life.raiders[].phase`; la física, `life.physics.stats`
(`null` **hasta que llegan**: Rapier se crea la primera vez que hay asaltantes cerca);
el dibujo, `renderer.info.render`.

## Comprobar un cambio del combate

1. **Sin navegador, primero** (segundos):
   `npx tsx tools/reports/battle-report.ts --defenders 10 --raiders 24` — y varias
   configuraciones (`--arm spear`, `--defenders 0`, `--raiders 60`). Mira que lleguen,
   que se dispare, que el portón reciba golpes y que la batalla acabe.
2. **Las pruebas**: `npx vitest run tests/fast/battle-sandbox.test.ts` y las del combate
   que toques (`archery`, `raiders`, `melee-without-archers`, `combat-clips`,
   `life-garrison-elevated`…).
3. **En el navegador**, para ver cómo se ve: `npm run dev` y abrir el banco. **Ojo con el
   navegador sin GPU** (Playwright con SwiftShader): va a ~1 fps, cada fotograma sólo
   avanza un trozo de escena y la semana del motor se acaba antes de que lleguen. Ahí la
   batalla no se ve entera; no es un fallo del banco. En un portátil o un móvil normal,
   una batalla de 6 contra 12 dura ~50 s de escena.

## Añadir algo al banco

- **Una métrica**: añádela a `BattleStats` y a `__valleyBattleStats` en `renderer.ts`
  (léela de la capa de vida o del render, **nunca calcules combate ahí**), una fila en
  `rows` de `src/ui/sandbox.ts`, y si vale para comparar, a `BattleSummary`. Si sale de
  la capa de vida, expónla en `life.defence` o un getter de `village.ts`.
- **Un mando** (p. ej. otra arma, muros de piedra o estacas, gore sí/no): parámetro en
  `battleSetupFrom` **y** `battleUrl` (con tope), control en el panel, y aplicarlo
  - al montar la partida en `openBattleSandbox` si es del estado (lo que el juego ya
    lee: medios con `giveNow`, rasgos, edificios), o
  - en `choice` de `__valleyBattle` → opción `battle` de `createVillage` si es de la
    capa de vida.
  Añade su caso a `tests/fast/battle-sandbox.test.ts`.
- **Una escena distinta** (otro valle, una villa con bastiones): `seed`/`year` ya existen;
  si hace falta una escena fija, igual que la de E3b (`walkwayNow` en `src/ui/debug.ts`).

## Lo que no se hace

- **No toques el motor para el banco.** Todo cambio va en `src/ui/`, `src/derive/` o la
  capa de vida, detrás de la opción `battle` o de un gancho. El juego sin `?sandbox`
  tiene que comportarse igual (la prueba lo comprueba con los doce de siempre).
- **No hagas que el banco guarde.** Nunca.
- **No lo presentes como el juego**: el banco levanta topes (manos, asaltantes) que el
  juego tiene por diseño. Una batalla de 60 contra 80 dice cómo aguanta el render y la
  física, no cómo es una partida.
- El texto del panel es de taller y va en español; **no** pasa por el banco de
  plantillas (`bank.en.ts`), que es para lo que lee el jugador.

## Límites conocidos

- Ragdolls: tope 24 (`MAX_RAGDOLLS`, `physics.ts`); por encima, la caída es la animada de
  respaldo. El panel lo enseña («de N (tope 24)»).
- Los asaltantes vienen por el camino de la villa y tardan en llegar; la duración
  empieza a contar cuando llega el primero.
- Los puestos son los que tiene el cerco: con 60 defensores y 30 puestos, suben 30.
- Una batalla que no acaba antes de que cambie la jornada se rehace al día siguiente
  (la capa de vida monta el asalto cada jornada de la semana del asalto).
