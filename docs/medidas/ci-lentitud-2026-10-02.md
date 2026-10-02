# Por qué la CI se volvió lenta — diagnóstico del 2 oct 2026

**En una línea:** el camino crítico de la CI era `npm test` (36 min). No es el
servidor ni el reparto. **Un tick del motor cuesta hoy unas diez veces lo que
costaba el 16 sep**, y en el mismo periodo **las pruebas de la suite rápida que
juegan décadas pasaron de 15 a 58**. Las dos causas se multiplican. La PR #38
(v5.56) arregla la segunda; la primera sigue abierta y aquí va su parche,
propuesto y sin aplicar (§6).

## 1 · Dónde se va el tiempo (CI, vuelta 36943479458, `main` del 1 oct)

| Trabajo | Paso lento | Duración |
|---|---|---|
| `fast` | `npm test` | **36 min** (2173 s de reloj; 5819 s de prueba sumada; 523 s de recogida; 240 ficheros) |
| `journeys (1/2/3)` | `test:journeys` | 11 / 19 / 19 min, en paralelo |
| `browser` | `test:shots` + `test:pwa` | 7 + 1 min |

Instalar, compilar, lint y typecheck suman menos de un minuto. La CI tarda lo
que tarda `npm test`.

En `main`, `npm test` tardaba 29 min el 29 sep, 29 min el 30 sep y 36 min el
1 oct. Del 25 al 29 sep todas las vueltas de `main` salen «cancelled»: ya
pasaba del tope de 10 min que había entonces.

Los diez ficheros más caros en CI: `ledger` 689 s, `life-body` 287,
`life-needs` 251, `crossroads-reachability` 240, `chronicle` 214,
`life-trade` 199, `animals` 198, `density` 183, `save` 171 y
`sim-endings` 169.

## 2 · El servidor no es «cinco veces más lento»

Lo dice un comentario de `ci.yml`, y no es cierto. Con `tests/fast/ledger.test.ts`,
el fichero más pesado:

- en CI: **689 s**
- en local (un hilo, Node 22): **666 s**

Por núcleo, el servidor va igual que local. La diferencia de reloj es sólo de
hilos: 4 en local y unos 2,7 efectivos en CI (5819 s de prueba en 2173 s). Subir
topes no toca la causa.

## 3 · Causa 1: el tick se ha encarecido

**El banco.** `foundGame(seed)` y 40 años jugados con `run(…, 'prudent')` en
las semillas 7, 23 y 41, en un hilo, medido en milisegundos por semana de
juego. El guion está en §7.

| Commit de `main` | ms/semana | Vivos al final |
|---|---|---|
| 16 sep `812dc69` | 0,78 | 80, 4, 45 (una aldea muere) |
| 22 sep `817fea6` | 6,36 | 173, 170, 158 |
| 26 sep `bab933c` | 4,27 | 156, 138, 183 |
| 29 sep `7c3f133` | 8,39 | 185, 216, 190 |
| 1 oct `c42570d` | 8,27 | 170, 241, 202 |

El coste crece con la población, porque hay más rutas, así que dos puntos sólo
se comparan con aldeas del mismo tamaño. **El escalón está en un commit, con
aldeas iguales:**

| | ms/semana | Vivos |
|---|---|---|
| `6fa7fda1~1` (21 sep) | **2,82** | 171, 182, 170 |
| `6fa7fda1` «organic village layout and spatial recovery» | **6,61** | 173, 170, 158 |

Es ×2,3 en un solo commit. La carretera del valle (`df212987`, 28 sep), que el
perfil también nombra, **no** es la causa: pasa de 5,30 a 4,84 ms, con aldeas
algo menores. El resto de la subida entre el 26 y el 29 sep va con la
población.

### Qué hace `6fa7fda1`

Añade `walkingGround()` en `src/engine/world/paths.ts`. Su clave es una cadena
con **todos los edificios en pie y todas las obras en curso**. Cuando la clave
cambia, llama a `invalidateRoutes()`, que sube la versión del suelo (`GROUND`).
Con un `GROUND` nuevo, las cachés de rutas por pareja (`PAIRS`) y por persona
(`CACHE`) dejan de valer enteras, y **se lanza A\* otra vez para todos** sobre
el mapa de 72 × 112. Abrir o terminar una obra pasa cada pocas semanas, así que
una invalidación pensada para «cuando cambie el mapa» (§7.6) se dispara casi
siempre.

**Los contadores**, puestos en una copia del árbol (15 años, 3 semillas, 2160
semanas):

| Qué | Veces | Por semana |
|---|---|---|
| Suelo invalidado (`GROUND`) | 817 | **0,38** |
| … por un cambio de edificios u obras (`walkingGround`) | 518 | 0,24 |
| … por caminos mejorados (`upgradePaths`) | 299 | 0,14 |
| Búsquedas A\* | 20 582 | **9,5** |

**Los cronómetros**, puestos dentro de `paths.ts` y medidos **bajo vitest**, que
es lo que corre la CI (25 años, 3 semillas):

| Función | Parte del tick |
|---|---|
| `routesFor` (todo el paso 14 de rutas) | **68 %** |
| `routeBetween` (A\* y sus extremos) | **54 %** |
| `walkingGround` | 7 % |
| `destinations` | 7 % |
| `banksOf` | 4 % |

Bajo `tsx` el reparto engaña. `banksOf` sale al 25 %, pero es porque tsx envuelve
en `__name()` cada uno de los 8064 cierres `near` que crea por escaneo, y en
vitest eso no pasa. **Un perfil del motor se toma bajo vitest**, o se le quita
`keepNames` a tsx; si no, señala lo que no es.

## 4 · Causa 2: la suite «rápida» juega partidas largas

Ficheros de `tests/fast/`, y cuántos tienen un bucle de años
(`WEEKS_PER_YEAR *`, `years = NN` o `run(state, NNN…)`):

| Fecha | Ficheros | Con partidas largas |
|---|---|---|
| 12 sep | 50 | 13 |
| 16 sep | 88 | 15 |
| 22 sep | 149 | 32 |
| 26 sep | 193 | 44 |
| 29 sep | 223 | 51 |
| 1 oct | 240 | 58 |

`vitest.config.ts` sigue diciendo «debe tardar menos de 20 s», y nada lo
comprueba.

**Además, trabajo repetido.** `ledger.test.ts` llama a `played(seed)` —80 años
con `foundTwenty`— **dentro de cada `it`**, con las mismas tres semillas y sin
caché. Son las mismas tres partidas jugadas cinco veces, 666 s en total.

## 5 · Qué cubre la PR #38 y qué no

| Causa | ¿La cubre #38? |
|---|---|
| Pruebas que juegan años dentro de `tests/fast/` | **Sí.** Muda 31 ficheros enteros y lo lento de otros 43; `npm test` baja a 262 s en local y a 2 min 39 s en CI, según su sesión |
| Reparto desigual de las jornadas (`threat`, 1994 s en un hilo) | **Sí**: seis trozos por peso |
| Tick ×10 desde el 16 sep (`6fa7fda1` y la población) | **No.** Las mismas partidas siguen jugándose, ahora en las jornadas (13–19 min por trozo) y en el banco de balance |
| Partidas repetidas en cada `it` (`ledger`, 677 s en `shard-weights.ts`) | **No**: se muda con el mismo cuerpo, como manda su regla |
| Recogida de la suite rápida (523 s en CI; ~380 s en local según su sesión) | **No.** Importar Three y Rapier en cada fichero pesa ya tanto como las pruebas. Queda abierto |
| El comentario de `ci.yml` sobre el servidor «cinco veces más lento» | **No** |

## 6 · La propuesta (sin aplicar)

### 6.1 · Que una obra no tire todas las rutas

Se separa «cambió el coste del suelo» (`GROUND`: un camino mejorado) de «se
movió una casa o una obra» (`BLOCKS`). Con un `BLOCKS` nuevo, una ruta guardada
**sigue valiendo si ninguna de sus celdas ha quedado debajo**; si alguna sí, se
recalcula. Es la misma decisión que §7.6 ya tomó para el bosque
(`invalidateForest`): la ruta vieja sigue siendo una ruta aunque ya no sea la
más corta. La lista de árboles y orillas cercanos sí se rehace con `BLOCKS`,
porque una obra puede tapar un árbol.

Medido en una copia de `main` (`5726bb3`), 40 años en las semillas 7, 23 y 41:

| | ms/semana |
|---|---|
| `main` | 9,84 |
| con el parche | **6,83 (−31 %)** |

**Mueve algo de la trayectoria, poco**, comprobado con un hash de cada parte
del estado a los 40 años:

| Semilla | Crónica | Gente | Edificios | `map.traffic` |
|---|---|---|---|---|
| 7 | igual | igual | igual | distinto |
| 23 | igual | igual | igual | distinto |
| 41 | igual | igual | igual | igual |

Es determinista, pero toca el motor. Por eso, antes de una PR: la suite rápida
entera en local (CLAUDE.md), las jornadas que miden caminos (`paths`, `road`,
`life-places`) y el visto bueno de Vera, porque el desgaste sale en pantalla.

```diff
--- a/src/engine/world/paths.ts
+++ b/src/engine/world/paths.ts
@@ interface CachedRoute {
   from: number;
   to: number;
   ground: number;
+  blocks: number;
   cells: number[];
 }
@@
-const PAIRS = new WeakMap<GameState, Map<string, { ground: number; cells: number[] }>>();
+const PAIRS = new WeakMap<GameState, Map<string, { ground: number; blocks: number; cells: number[] }>>();
@@ function walkingGround(state: GameState): { map: ValleyMap; blocked: Uint8Array
   WALKING.set(state, next);
-  invalidateRoutes(state);
+  BLOCKS.set(state, (BLOCKS.get(state) ?? 0) + 1);
   return next;
 }
@@ function routeBetween(state: GameState, from: number, to: number, ground: number): number[] {
-    pairs = new Map<string, { ground: number; cells: number[] }>();
+    pairs = new Map<string, { ground: number; blocks: number; cells: number[] }>();
@@
   const known = pairs.get(key);
-  if (known !== undefined && known.ground === ground) return known.cells;
-
   const walking = WALKING.get(state) ?? walkingGround(state);
+  const blocks = BLOCKS.get(state) ?? 0;
+  if (known !== undefined && known.ground === ground) {
+    if (known.blocks === blocks) return known.cells;
+    // Sólo se movieron casas u obras: la ruta vale si ninguna celda suya quedó debajo.
+    if (known.cells.length > 0 && known.cells.every((c) => walking.blocked[c] === 0)) {
+      known.blocks = blocks;
+      return known.cells;
+    }
+  }
@@
-  pairs.set(key, { ground, cells });
+  pairs.set(key, { ground, blocks, cells });
   return cells;
 }
 const GROUND = new WeakMap<GameState, number>();
+// Cambios de edificios u obras: una ruta guardada sigue valiendo si no pisa celdas que ahora bloquean.
+const BLOCKS = new WeakMap<GameState, number>();
@@ function destinations(
-  const groundVersion = GROUND.get(state) ?? 0;
+  // Una obra puede tapar un árbol o una orilla: la lista de cercanos depende también de BLOCKS.
+  const groundVersion = (GROUND.get(state) ?? 0) + (BLOCKS.get(state) ?? 0) * 100_003;
@@
   mix(GROUND.get(state) ?? 0);
+  mix(BLOCKS.get(state) ?? 0);
@@ export function routesFor(state: GameState): Map<VillagerId, number[]> {
-    if (known !== undefined && known.from === from && known.to === to && known.ground === ground) {
+    if (known !== undefined && known.from === from && known.to === to && known.ground === ground
+      && known.blocks === (BLOCKS.get(state) ?? 0)) {
@@
-    cache.set(id, { from, to, ground, cells });
+    cache.set(id, { from, to, ground, blocks: BLOCKS.get(state) ?? 0, cells });
```

**Lo que queda después del parche:** la población. Con 240 vivos hay más rutas
distintas y no hay caché que lo evite. Si hace falta más, el siguiente paso es
un A\* que reutilice el árbol de búsqueda desde cada casa (una búsqueda por
origen, no por pareja), y eso ya es un brief, no un parche.

### 6.2 · Jugar cada partida una vez por fichero

En `tests/journeys/ledger.test.ts`, y en todos los que llaman a `played()`
dentro de un `it`, se guardan las partidas por semilla en el ámbito del
fichero. **No cambia ningún aserto ni ningún umbral**, y no toca el motor:

```diff
-function played(seed: number, years = 80): GameState {
+const PLAYED = new Map<string, GameState>();
+function played(seed: number, years = 80): GameState {
+  const key = `${seed}/${years}`;
+  const known = PLAYED.get(key);
+  if (known !== undefined) return known;
   const state = foundTwenty(seed);
   for (let week = 0; week < TIME.WEEKS_PER_YEAR * years && state.ended === null; week += 1) {
     run(state, 1, 'prudent', CATALOG);
   }
+  PLAYED.set(key, state);
   return state;
 }
```

Sólo vale si ninguna prueba muta la partida que recibe. En `ledger` se archiva
(`archiveGame`), así que hay que mirar si esa prueba copia o modifica el estado
antes de compartirlo. Ahorro estimado: de 677 s a unos 140 s, porque cuatro de
las cinco pruebas dejarían de jugar. Es tarea del carril de pruebas, después
de #38.

### 6.3 · El comentario de `ci.yml`

Hay que quitar «en el servidor todo va unas cinco veces más lento que en local»
y poner la medida de §2. Mientras siga escrito, la respuesta natural a una
vuelta lenta es subir el tope.

## 7 · La regla que se propone (para CLAUDE.md y `tools/README.md`, sin aplicar)

> **Ningún fichero de `tests/fast/` pasa de 10 s.** Una prueba que juega años
> va en `tests/journeys/` desde el primer día, no cuando la CI ya tarda media
> hora. Lo comprueba la propia suite: un reportero de vitest que suma la
> duración de cada fichero (pruebas **y recogida**, porque `ui-milestones`
> juega 189 s en el cuerpo del `describe` y eso no sale en el tiempo por
> fichero) y falla nombrando el fichero si pasa de 10 s × `VALLEY_TIMING_SCALE`.
>
> **Y un cambio del motor que toque `paths.ts`, `placement.ts` o `works.ts`
> mide el tick antes y después** con el banco de §7: 40 años, semillas 7, 23 y
> 41, en ms por semana y con los vivos al final. Una subida de más del 20 %
> con aldeas del mismo tamaño se explica en el PR o no se fusiona. `6fa7fda1`
> multiplicó el tick por 2,3 y nadie lo vio en nueve días, porque lo que se
> notaba era «la CI tarda», no «el motor es más lento».

## 8 · Cómo se reproduce

```bash
# El banco: copiarlo a la raíz de un árbol del commit que se quiera medir.
cat > bench.ts <<'EOF'
import { TIME } from './src/engine/balance';
import { CATALOG } from './src/engine/crossroads/catalog';
import { foundGame } from './src/engine/found';
import { run } from './src/engine/sim';
const YEARS = Number(process.env.YEARS ?? 40);
let weeks = 0; const t0 = Date.now(); const alive: number[] = [];
for (const seed of [7, 23, 41]) {
  const s: any = foundGame(seed);
  for (let w = 0; w < TIME.WEEKS_PER_YEAR * YEARS && s.ended === null; w++) { run(s, 1, 'prudent', CATALOG); weeks++; }
  alive.push(s.people.villagers.filter((v: any) => v.alive ?? v.deathTick == null).length);
}
console.log((Date.now() - t0) / weeks, 'ms/semana', alive);
EOF
npx tsx bench.ts

# Comparar dos commits sin tocar el árbol de trabajo:
git worktree add --detach /tmp/antes <commit>
ln -s "$PWD/node_modules" /tmp/antes/node_modules
cp bench.ts /tmp/antes/ && (cd /tmp/antes && npx tsx bench.ts)
```

Los cronómetros por función de §3 se ponen envolviendo en `paths.ts` las
funciones `routesFor`, `routeBetween`, `destinations`, `walkingGround` y
`banksOf` con `performance.now()`, y en `sim.ts` la función `tick`. Esas
mediciones se hacen en una prueba de vitest, no con tsx (ver §3).
