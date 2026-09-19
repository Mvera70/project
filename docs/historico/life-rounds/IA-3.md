# IA-3 · Aldeanos con hábitos

**16 sep 2026.** Cuarta fase de `docs/life-ai-implementation-prompt.md`.
Implementada por una sesión de Sonnet sobre el commit `9e22079`, en paralelo
con IA-4 (animales) trabajando sobre `beasts.ts` al mismo tiempo — de ahí la
nota de método en §5.

---

## 0. Lo que ya estaba, y no había que rehacer

Antes de tocar nada se comprobó `needs.ts` y `decide.ts` contra lo que el
brief daba por supuesto («hoy sólo `hardy` y `frail` sobre `rest` y
`thirst`»). **Era falso**: V-04 y V-06 (14 sep 2026, antes de esta ronda) ya
habían construido `TEMPER` (quince rasgos con sesgo sobre los seis impulsos) y
`LEANING` (catorce rasgos con sesgo sobre las ofertas), y `scenes.ts` ya
graduaba las ganas de hablar por rasgo (`TALK_LEAN`). Repetir eso habría sido
la trampa que `CLAUDE.md` avisa: inventar un número que ya existe. Lo que
faltaba de verdad, comprobado fichero a fichero contra la lista del brief:

| Punto del brief | Ya existía (V-04/V-06/V-07) | Faltaba |
|---|---|---|
| `kind`/`generous`: compañía y ayuda | Sí (`TEMPER.company`, `LEANING.gossip`, `TALK_LEAN`) | — |
| `secretive`: bordes del corro, encuentros breves | Esquiva el corro (`LEANING.gossip: 0.3`) | El **dónde** (borde) y el **cuánto dura** |
| `hot_tempered`/`spiteful`: tensión rápida sin peleas constantes | Irritación ×3/×1,8; umbral en `scenes.ts` ya acota la frecuencia | Nada que impida encadenar dos seguidos |
| `devout`: capilla alcanzable | `LEANING.pray: 2.2`, plano | El radio de búsqueda no se estiraba para ella |
| `ambitious`/`stubborn`/`loyal`: persistencia en trabajo | `LEANING.work` (eligen más) | Nada que los hiciera **soltarlo menos** |
| `frail`/`hardy`: pausas y ritmo distintos | `TEMPER.rest`/`thirst`, `LEANING.work`/`sit` | `pauseHere()` no sabía de rasgos |
| Niños cerca de casa, mayores con pausas próximas | Nada | Todo: no existía ni la edad en la capa |

---

## 1. Qué se cambió en cada fichero

### `src/render3d/life/decide.ts`

- **`falloff(away, reach = LOOK)`** y **`worth(offer, needs, traits, from, reach = LOOK)`** ganan un quinto parámetro opcional, con el valor de siempre por defecto — las dos llamadas existentes en `tests/journeys/life-decide.test.ts` (cuatro argumentos) siguen compilando y dando lo mismo.
- **`AGE_LEANING`**: tabla `child`/`elder` → oferta → sesgo, leída por `ageLeanOf()`. Aplica **igual que `LEANING`**, multiplicando la puntuación.
- **`CHILD_RANGE_SCALE = 0.6`, `ELDER_RANGE_SCALE = 0.7`**: el radio de búsqueda (`LOOK`) se encoge para niños y mayores — a igualdad de necesidad, se conforman con lo de al lado. Una necesidad urgente sigue ganando: la escala pesa la distancia, no anula el valor.
- **`DEVOUT_REACH_MULT = 3`**: un `devout` busca una capilla al triple de lejos que una oferta corriente (el doble de lejos que ahora, y menos que el 4 de una oferta con hora punta). Es la «preferencia contextual por capilla alcanzable»: el radio se estira, pero `route === null` en el bucle de `TRY` sigue descartando la que de verdad no se puede pisar.
- **`HOME_RANGE = 9`, `homePull()`**: un tirón extra hacia la puerta de casa, sólo para niños. Es una segunda distancia (de la oferta a casa, no de la oferta a donde el niño está ahora), así que un crío que ha salido a jugar prefiere quedarse por el barrio.
- **`WORK_STICKY_TRAITS`, `WORK_STICKY_BONUS = 1.5`, `sticksToWork()`**: encima de `STICKY` (1,35), `ambitious`/`stubborn`/`loyal` reciben otro ×1,5 si la oferta ya en marcha es `work`. Es «lo sueltan menos», no «lo eligen más» —eso último ya lo hacía `LEANING.work` desde V-04.
- **`SECRETIVE_EDGE_POWER = 2.4`**: al elegir plaza libre, el dado se eleva a esa potencia para un `secretive`, empujándolo hacia la plaza de más número — y `seatsOn()` (`offers.ts`) ya construye `spots` de dentro a fuera, así que la de más número es el borde del corro.
- **`SECRETIVE_SHORT = 0.6`**: la duración elegida se acorta un 40 % para un `secretive`, sólo si la oferta da compañía (`gives.company !== undefined`) — beber o rezar no se acortan, no son encuentros con nadie.
- **`pauseHere(..., traits: readonly Trait[] = [])`**: séptimo argumento opcional al final, así que `beasts.ts` (que la llama con seis) sigue compilando y comportándose igual. `pauseSpan()` escala `[4, 9]` s a ×0,7 para `hardy` y ×1,4 para `frail`.
- **`Chooser`** gana `ageGroup?: 'child' | 'elder' | undefined` y `home?: Point | undefined`, los dos opcionales para no romper `beasts.ts` ni ningún test que construya un `Chooser` a mano.

### `src/render3d/life/village.ts`

- Importa `DAY` (además de `FOOD`) de `@engine/balance`, `ageOf` de `@engine/people/villagers`, y `doorOf` de `./offers`.
- **`Dweller`** gana `ageGroup?` y `home?`, los dos opcionales por el mismo motivo que IA-1 dejó `ProgressState` fuera de `Dweller`: `tests/journeys/life-scenes.test.ts` construye uno a mano y no está en los ficheros autorizados de esta fase.
- En `alive.forEach(...)`, una vez por persona y por jornada: `ageOf(villager, state.tick)` contra `DAY.CHILD_UNDER`/`DAY.ELDER_OVER` (los mismos umbrales que ya usaba el camino que G-12 apagó, no un número nuevo) da `ageGroup`; `villager.homeId` → `state.buildings.find(...)` → `doorOf()` da `home`.
- La llamada a `decide()` pasa `ageGroup`/`home`; la llamada a `pauseHere()` pasa `dweller.traits`.
- **`fieryCooldown()`** y el cambio en `closeScene()`: tras un `shove`/`brawl` (nunca un `chat`), `hot_tempered`/`spiteful` reciben `SCENE_COOLDOWN × 1,6` en vez de `× 1` antes de volver a poder pararse con nadie. Es lo que hace mío y medible «sin peleas constantes» — el umbral de `scenes.ts` (fuera de mi alcance, IA-2) ya lo acotaba, pero no impedía encadenar dos encontronazos seguidos.

### `src/render3d/life/needs.ts`, `src/render3d/life/offers.ts`

Sin cambios. `TEMPER`/`LEANING` ya cubrían lo que el brief pedía de ellos
(§0); tocarlos sin una medida que lo pidiera habría sido la séptima regla de
E.3 («no se ajusta una constante a ciegas más de dos veces seguidas»)
incumplida a la primera.

### `tests/fast/life-needs.test.ts`

Cuatro pruebas nuevas en `describe('IA-3 · aldeanos con hábitos', ...)`:

1. `pauseHere` con `hardy`/`frail`/sin rasgo, comparando `until - since` —
   pura, sin simulación, instantánea.
2. `worth()` con un `pray` a la misma distancia, `devout` contra nadie —
   pura, instantánea.
3. y 4. comparten una sola pasada de simulación (`habitSample()`, memoizada):
   dos semillas, un día cada una, `life.step()` la jornada entera. Guardan
   «el devoto reza al menos el doble que el resto, sin apagar una necesidad
   urgente» y «`hot_tempered`/`spiteful` se enzarzan más que `kind`/`generous`,
   pero menos del 60 % de sus jornadas». Compartir la pasada evita pagar dos
   veces el coste de simular: de forma separada costaban 7,3 s cada una: juntas,
   la única simulación cuesta 2,8 s.

`tools/reports/life-traits-report.ts` (nuevo, fuera de los ficheros autorizados de
`life/`: es una herramienta de medida, como `tools/reports/life-report.ts` de IA-1, no
un cambio de comportamiento) sale de la misma disciplina que
`tools/reports/life-report.ts`: nunca `tick` en un bucle, siempre `foundTwenty` +
`run`, varias semillas y varios días.

---

## 2. La tabla de rasgo × actividad

`npx tsx tools/reports/life-traits-report.ts 7 23 41 67 79 97 --days 3 --years 30`
— 6 semillas × 3 jornadas × 30 años, 87 480 cuerpo-segundos de personas
(nunca bestias: los rasgos son de gente, §6.1).

| Rasgo | andando | gather | work | sit | pray | gossip | otros |
|---|---|---|---|---|---|---|---|
| **devout** | 83,0 % | 5,7 % | 6,0 % | 0,7 % | **0,9 %** | 0,5 % | resto |
| ambitious | 83,2 % | 7,3 % | 5,2 % | 0,7 % | 0,2 % | 0,1 % | |
| craven | 84,0 % | 5,9 % | 4,4 % | 1,1 % | 0,4 % | 0,2 % | |
| cunning | 81,8 % | 8,5 % | 4,3 % | 1,0 % | 0,3 % | 0,1 % | |
| frail | 84,8 % | 6,2 % | 4,0 % | **2,0 %** | 0,3 % | 0,2 % | |
| generous | 83,9 % | 4,6 % | 6,4 % | 0,7 % | 0,3 % | 0,7 % | |
| greedy | 82,4 % | 5,3 % | 6,8 % | 1,3 % | 0,5 % | 0,6 % | |
| hardy | 83,7 % | 4,3 % | **6,7 %** | **0,2 %** | 0,4 % | 0,4 % | |
| hot_tempered | 84,4 % | 7,4 % | 3,9 % | 0,3 % | 0,4 % | 0,0 % | |
| kind | 86,7 % | 4,9 % | 4,3 % | 0,4 % | 0,1 % | 0,3 % | |
| loyal | 83,6 % | 5,6 % | 6,0 % | 0,7 % | 0,5 % | 0,1 % | |
| proud | 84,9 % | 5,8 % | 4,1 % | 1,0 % | 0,3 % | 0,1 % | |
| **secretive** | 85,4 % | 7,0 % | 3,8 % | 0,3 % | 0,2 % | **0,0 %** | |
| spiteful | 83,0 % | 6,4 % | 5,3 % | 1,1 % | 0,6 % | 0,2 % | |
| stubborn | 82,6 % | 5,0 % | **7,3 %** | 1,1 % | 0,2 % | 0,5 % | |
| edad:child | 86,5 % | 4,2 % | 3,8 % | 1,2 % | 0,3 % | 0,1 % | |
| edad:elder (1 080 cs) | 76,9 % | 10,7 % | 3,4 % | **3,1 %** | — | — | |

Tabla completa (las trece actividades, no seis) en la salida del comando —
está en el histórico de esta sesión, no repetida aquí por espacio.

**Lo que la tabla enseña, leída con las dos preguntas del brief:**

1. **Los perfiles difieren.** El devoto reza casi el triple que la media del
   resto (0,9 % contra ≈0,3 %, y varios rasgos como `hot_tempered` o
   `stubborn` no llegan siquiera a la tabla con `gossip` en algunas muestras
   pequeñas). El `secretive` no cotillea nunca (0,0 %) frente al 0,4-0,7 % de
   `kind`/`generous`. El `frail` se sienta diez veces más que el `hardy`
   (2,0 % contra 0,2 %) y trabaja menos (4,0 % contra 6,7 %). Los mayores
   pasan el triple de tiempo sentados que los niños (3,1 % contra 1,2 %) y
   andan menos (76,9 % contra 86,5 %).
2. **La misma persona no cambia de carácter a cada decisión** (§3, abajo).

## 3. Estabilidad

Mismo comando, sección «Estabilidad»:

```
cambios de actividad por persona y jornada: media 2,31 sobre 729 persona-jornadas
cambios/jornada con ambitious/stubborn/loyal: media 2,35 (n=414) · el resto: media 2,24 (n=315)
duración de una tanda seguida en el tajo: ambitious/stubborn/loyal 4,4 s (n=695) · el resto 3,6 s (n=420)
duración de un encuentro social (sin `gather`): secretive 1,9 s (n=89) · el resto 2,4 s (n=334)
similitud del reparto diario (coseno): consigo misma en otro día 0,982 (n=729) · contra otra persona el mismo día 0,973 (n=729)
```

- **≈2,3 cambios de actividad por jornada** (de 3 600 pasos): nadie tiembla
  entre ofertas — es del orden de un cambio cada cincuenta segundos
  escénicos, coherente con `STICKY`/`RETHINK`.
- **La cuenta de cambios por sí sola no separa bien** a `ambitious`/
  `stubborn`/`loyal` del resto (2,35 contra 2,24: casi nada) — cambian de
  actividad tantas veces como cualquiera, porque el día tiene sed, hambre y
  aburrimiento igual para todos. **La duración de la tanda de trabajo sí**:
  una vez dentro, se quedan un 22 % más (4,4 s contra 3,6 s de media por
  tanda) — que es justo lo que `WORK_STICKY_BONUS` mueve y la cuenta de
  cambios no ve. Queda anotado: «persistencia» se mide en cuánto dura lo que
  ya se hace, no en cuántas veces al día se decide.
- **El `secretive` corta un encuentro social un 21 % antes** (1,9 s contra
  2,4 s) una vez excluida `gather` (la reunión que convoca el motor, §V-11:
  mezclarla ahogaba la diferencia bajo el peso de un suceso que le pasa a
  toda la aldea por igual, no una elección personal).
- **El reparto de un día se parece más a sí mismo que al de cualquier otro**
  (0,982 contra 0,973): la propiedad se sostiene, aunque el margen es corto
  —una aldea con un catálogo de trece ofertas y un patrón diario compartido
  (todos beben, todos duermen, todos trabajan) tiene un techo de similitud
  alto para cualquiera con cualquiera. **Se deja anotado y no forzado**: no
  se ha tocado ningún número para ensanchar este margen, porque hacerlo sin
  medir qué se rompe habría sido la regla séptima de E.3 saltada.

Cuatro pruebas rápidas (`tests/fast/life-needs.test.ts`) guardan las dos
primeras propiedades sobre una muestra más pequeña (dos semillas, un día);
las cuatro pasan.

## 4. Las cuatro cifras de IA-2, antes y después

**Complicación de método, resuelta**: `beasts.ts` estuvo bajo edición activa
de otro agente (IA-4) mientras se medía esta fase, así que un
`npx tsx tools/reports/life-report.ts` suelto medía una `beasts.ts` distinta cada vez
que se ejecutaba y las comparaciones intermedias no servían — dos llamadas
idénticas dieron 89 y 7 970 «parados con impulso ≥ 0,9» entre sí, sin que
`life/` se hubiera vuelto no determinista (§5). IA-4 cerró su ronda y
`d7cac67` la comitió antes de terminar ésta, así que las cifras de abajo son
las definitivas, contra `beasts.ts` ya estable: sólo se sustituyen
`decide.ts`/`village.ts` por su versión de HEAD para el «antes» (nunca
`beasts.ts`, que no es mío y no se toca).

`npx tsx tools/reports/life-report.ts 7 23 97 --days 2` (26 880 cuerpo-segundos):

| | antes (HEAD) | después (IA-3) |
|---|---|---|
| centro en muro | 0 | 0 |
| círculo en muro | 18 · 0,07 % | 21 · 0,08 % |
| giros > π/2 parado | 85 · 0,32 % | 83 · 0,31 % |
| parados con impulso ≥ 0,9 | 3 · 0,01 % | 4 · 0,01 % |

Muestra grande, `3 7 11 23 41 97 --days 4` (92 160 cuerpo-segundos):

| | antes (HEAD) | después (IA-3) |
|---|---|---|
| centro en muro | 0 | 0 |
| círculo en muro | 79 · 0,09 % | 89 · 0,10 % |
| giros > π/2 parado | 355 · 0,39 % | **312 · 0,34 %** |
| parados con impulso ≥ 0,9 | 13 · 0,01 % | **8 · 0,01 %** |

**Ninguna de las cuatro empeora de forma que importe**: centro en muro sigue
en cero (el invariante duro); círculo en muro se mueve una décima de punto,
del mismo orden que el ruido que las propias rondas anteriores documentan
(IA-1 §2: giros pasó de 0,38 % a 0,43 % y volvió a 0,31 % en dos versiones
seguidas del mismo trabajo); giros y parados **mejoran** en la muestra
grande, que es la que manda por tener más cuerpo-segundos. No se afina nada
para forzar que las dos muestras coincidan en dirección: se deja escrito tal
cual sale.

## 5. Una trampa nueva, para el registro

**Un `git stash` de todo el árbol no es seguro con dos agentes escribiendo a
la vez.** La primera comparación antes/después de esta ronda se hizo con
`git stash` / `git stash pop` sobre el árbol entero, que revierte y restaura
también los ficheros que **otro agente** tiene abiertos en ese instante
(`beasts.ts`, IA-4). Se cazó a tiempo —ninguna de las dos idas y vueltas
perdió nada, comprobado con `git status --short` y un recuento de líneas—
pero es la clase de acción irreversible que el propio entorno bloqueó después
(«Irreversible Local Destruction») al intentar un `git checkout HEAD --` con
el mismo riesgo. **La forma segura de comparar «con y sin mis cambios» cuando
otro agente edita ficheros ajenos al lado**: `git show HEAD:<mi fichero> >
tmp` y sustituir con `cp` sólo los ficheros propios, nunca `git stash`/
`git checkout` sobre el árbol entero. Queda anotado en el registro de
`docs/agents.md` si alguien lo actualiza; aquí sólo se deja escrito para que
la próxima sesión con dos agentes no lo repita.

**Y una segunda, de medición**: la primera versión de `tools/reports/life-report.ts`
ejecutada dos veces seguidas dio cifras muy distintas (89 → 7970 «parados con
impulso ≥0,9» entre dos llamadas idénticas) porque `beasts.ts` cambió de
contenido entre medias por el trabajo concurrente de IA-4 — no porque nada de
`life/` se haya vuelto no determinista. `createVillage`/`life.step()` sigue
siendo determinista dentro de una jornada congelada (las pruebas de
`life-staging.test.ts` y `daylife.test.ts` lo comprueban y siguen en verde);
lo que no es estable es el binario que se ejecuta cuando dos sesiones editan
el mismo checkout a la vez. Cualquier medida tomada en una sesión compartida
tiene que fijar (o anotar) qué versión de los ficheros ajenos estaba en el
disco en ese instante.

## 6. Lo que no llegó, con su medida

1. **La estabilidad día-a-día tiene un margen corto** (0,982 contra 0,973,
   §3). La propiedad se sostiene en la dirección correcta con una `n` grande
   (729 pares), pero un umbral fijo tipo «al menos un 5 % de diferencia» no
   se cumple. Se deja **escrito, no forzado**: no toca una constante más para
   ensancharlo sin saber qué se rompe.
2. **«Los niños juegan cerca de casa»** se implementa con la puerta real de
   la casa (`Villager.homeId` → `state.buildings` → `doorOf`), no con una
   aproximación — pero no hay una medida de cuánto se queda un niño en su
   calle frente a un adulto con el mismo día, porque el catálogo actual no
   tiene una oferta de «jugar en el patio» distinta de `play`/`chase`, que ya
   comparten con adultos y bestias. La tabla §2 muestra que los niños andan
   más (86,5 %) y trabajan menos (3,8 %) que la media, que es consistente con
   quedarse por el barrio, pero no es una medida directa de distancia a casa.
3. **`GREET_ODDS` (IA-2) sigue sin medir**, no es de esta fase y no se ha
   tocado.
4. **La deuda de `ProgressState` fuera de `Dweller`** (IA-1 §4.2) sigue
   igual: esta fase añadió dos campos opcionales más (`ageGroup`, `home`) por
   el mismo motivo, así que la lista de «lo que vive fuera de `Dweller` por
   no poder tocar `life-scenes.test.ts`» ha crecido. Quien toque `Dweller` la
   próxima vez tiene ahora tres cosas que subir, no una.

## 7. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
npx vitest run tests/fast/life-needs.test.ts tests/fast/life-motion.test.ts \
  tests/fast/life-orders.test.ts tests/fast/life-staging.test.ts tests/fast/daylife.test.ts
  → 5 ficheros, 47 pruebas, todas verdes (43 previas + 4 nuevas de IA-3).
    Ningún it.fails hizo falta: todas las propiedades medidas se sostienen,
    aunque una (estabilidad día-a-día) con un margen corto anotado en §6.
```

No se lanzó la suite entera ni `test:journeys`, por la misma orden del dueño
que citan IA-1 e IA-2.

## 8. Captura

```
node tools/graphics/serve.mjs --port 8135
npx tsx tools/graphics/bundle-game.ts
npx tsx tools/graphics/shot.mjs --page "http://127.0.0.1:8135/valley.html" \
  --seed 11 --settle 12 --advance 900 --zoom 6 --sequence 5 --every 1.4 \
  --out artifacts/graphics/IA/habitos/day2zoom.png
```

Backend 3D real, semilla 11, año 19, invierno día 1, 17:00, ×1. En
`artifacts/graphics/IA/habitos/day2zoom-04.png`: nieve en el suelo, y la
aldea **no** haciendo todos lo mismo — una figura sola junto al henil arriba a
la derecha, otra sola en la plataforma de la izquierda, y un grupo de tres o
cuatro con dos burbujas de charla en el centro. Es la propiedad que esta fase
persigue vista desde arriba: no una coreografía, gente repartida haciendo
cosas distintas.

**Lo que la captura no aísla**, y queda anotado como en IA-1/IA-2: a la
distancia de la aldea entera no se distingue un `devout` rezando de un
`hardy` trabajando por la pose — eso depende del clip de animación por
oferta (Anexo D), no de esta fase. `artifacts/graphics/IA/habitos/gente-02.png`
(semilla 11, año 19, otoño, el mismo `quarrel_in_the_square` que ya
documentó `evidencia-capturas.md`) confirma que el mecanismo de charla de
IA-2 sigue intacto bajo los cambios de esta ronda: las mismas tres burbujas,
el mismo aviso de crónica.

El zoom (`--zoom`) tiene un efecto visual menor de lo esperado sobre esta
cámara — probado hasta `--zoom 25` sin cambio apreciable de encuadre más allá
de un punto; documentado por si a alguien más le hace falta acercar la
cámara y se encuentra con lo mismo.

## 9. Qué observación en pantalla refutaría esta fase

Toda la aldea rezando o descansando a la vez, sea cual sea su rasgo. Un
`secretive` siempre en el mismo punto exacto del corro (en vez de en el
borde, variando). Un `hot_tempered` encadenando empujón tras empujón sin
respiro visible. Alguien con la sed al máximo sentado tranquilamente en vez
de yendo a beber. Un niño cruzando medio valle para jugar solo, lejos de
cualquier casa, con una casa más cerca disponible. Reconstruir el mismo día
—misma semilla, mismo número de pasos— y ver un reparto de actividades
distinto para la misma persona.
