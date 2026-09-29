# La matriz de animación — AN-0 a AN-4 (29 sep 2026)

**Qué es.** Una fila por clip humano y por clip de especie, con su origen, dónde
lo produce el juego, la evidencia con la que se juzga, el defecto concreto, la
gravedad, el coste de arreglarlo y la decisión. Se abre en AN-0 y **se cierra
fila a fila en AN-4** con un veredicto. El plan y los briefs están en
`docs/plan-animacion-integral-movil-2026-09-29.md`.

**Cómo se lee la evidencia.** `partida` es una toma del observatorio sobre el
juego empaquetado (`tools/graphics/observe-life.mjs`, 390×844, SwiftShader);
`preview` es una hoja de gestos sin partida (`gesture-sheet.mjs` para
personas, `animal-gestures-bench.mjs` para animales). Un clip que sólo se ha
visto en `preview` **no cuenta como integrado**. Las cifras de cadencia y
apoyo salen de `npx tsx tools/reports/gait-report.ts` (sin navegador, sobre
el GLB publicado): *cadencia* es ciclos de patas por segundo al paso que la
vida da a ese cuerpo (`paso / zancada`), *apoyo* la fracción del ciclo con el
pie en el suelo y *plantado* cuánto retrocede el pie apoyado respecto a lo que
avanza el cuerpo (1,00× es sin patinar). **Gravedad**: alta = se ve a tamaño
de móvil o contradice el hecho; media = se ve de cerca; baja = sólo con zoom
o en preview. **Coste**: S (una tarde en código), M (código y prueba con
medida), L (recurso: receta o GLB).

Todo lo de esta página se generó con:

```
export VALLEY_CHROMIUM=/opt/pw-browsers/chromium
npx tsx tools/graphics/bundle-game.ts
node tools/graphics/gesture-sheet.mjs <clip> --model villager --frames 12 --out artifacts/graphics/AN-0/gestures
node tools/graphics/animal-gestures-bench.mjs --kind <especie> --actions <clips> --frame <encuadre>
node tools/graphics/observe-life.mjs --seed 11 --year 21 --lead 20 --seconds 20 --fps 2 --viewport 390x844 --out artifacts/graphics/AN-0/baseline/wide-seed11-y21
node tools/graphics/observe-life.mjs --seed 11 --year 21 --lead 20 --seconds 6 --fps 15 --follow 13 --zoom 0.18 --viewport 390x844 --out artifacts/graphics/AN-0/baseline/walk-seed11-y21-follow13
npx tsx tools/reports/gait-report.ts
node tools/graphics/performance/gl-probe.mjs artifacts/graphics/G-10/game/valley.html "debug=1&seed=7&year=60&season=summer&live=1" 40
```

---

## 1 · Inventario verificado

**Clips humanos (24).** Los 17 modelos de aldeano (`villager`, los siete
oficios, `child`, `elder`, `stranger`, `neighbor`, `farmer`, `woodcutter`,
`mason`, `shepherd`, `fisher`) comparten rig y clips; `world/cast.ts` toma los
clips del `villager` base para todos. Cuatro vienen del GLB
(`art/recipes/villager/villager.json`, exportados por Blender, medidos por
`animation-audit.ts`) y veinte se **fabrican** sobre el `idle` del GLB en
`src/render3d/action-clips.ts` (`ACTION_CLIPS`), con su ritmo en
`src/render3d/clips.ts`. `tests/fast/graphics-clock.test.ts` vigila que la tabla
y el catálogo cuadren y que ningún fabricado ande.

**Especies (15)**, `src/derive/animals.ts`: hen, pig, cow, crow, wolf, fish,
partridge, rabbit, deer, boar, bear, dog, fox, duck, mule. Todas tienen un
clip de desplazamiento (`walk` o `hop`), así que todas pasan por
`effects/animal-motion.ts` (nunca por la vía de instancias estáticas de
`fauna.ts`). Nueve son recetas del generador G-23 (`tools/art/lots/animals-g23.mjs`:
cow, pig, hen, crow, fish, fox, duck) o recetas propias (rabbit, deer, con
`plant-gait.cjs`); cinco son modelos de nodos rígidos de Vera con clips de
`tools/art/rigid-clips.mjs` (wolf, bear, boar, dog, mule, partridge). Los
gestos del perro (`run`, `bark`, `play`) se fabrican en
`effects/animal-gestures.ts`. La golondrina ambiental (`bird.glb`, Astra) bate
en `effects/ambience.ts` sin clip: dos alas giradas entre −55° y +35°.

**Qué acción produce la vida por especie** (lo único que puede verse en
partida; lo demás es `preview-only`):

| Especie | Quién la mueve | Acciones que emite | Clips en el GLB |
|---|---|---|---|
| hen, pig, cow | `life/beasts.ts` (via `village.ts`) | ninguna: `AnimalMotion` mezcla `walk` por velocidad | idle, walk |
| dog | `life/companions.ts` | walk, run, bark, play | idle, walk (+ run/bark/play fabricados) |
| fox | `life/companions.ts` | walk, flee (sin clip: cae a walk por velocidad) | idle, walk |
| duck | `life/companions.ts` | walk | idle, walk |
| deer | `life/deer.ts` | walk (también al huir, a 1,35) | idle, walk |
| bear | `life/bear.ts`, caza | attack (aviso), charge, flee, down (caza) | idle, walk, attack |
| rabbit | `life/rabbits.ts`, caza | walk (=hop), flee, down (caza) | idle, hop, flee |
| partridge | caza (`wild-prey.ts`) | takeoff, flight, down | idle, walk, takeoff, flight |
| boar | caza (`wild-prey.ts`) | charge, down | idle, walk, charge, attack |
| wolf | `life/wildlife.ts` (corral), `world/mountain-wolves.ts` | ninguna (anda) | idle, walk, attack |
| mule | `life/visitors.ts` | walk (por velocidad) | idle, walk |
| crow, fish | `derive/animals.ts` (ambiental) | ninguna (anda/nada por velocidad) | idle, walk |

**No se encontró nada fuera del inventario del encargo**, salvo dos cosas que
se anotan: el `attack` del lobo y del jabalí existen en el GLB pero **ningún
sistema del juego los emite** (el lobo del corral merodea, el jabalí de la
caza embiste), y `flee` del zorro es una acción sin clip que cae a `walk`.

---

## 2 · Línea de base medida (AN-0)

### 2.1 Cadencia y apoyo de los clips de desplazamiento

`npx tsx tools/reports/gait-report.ts`, 29 sep 2026, sobre los GLB publicados:

| Cuerpo · clip | Zancada (celdas) | Ciclo (s) | Paso de la vida (celdas/s) | **Cadencia (Hz)** | Apoyo | Plantado |
|---|---|---|---|---|---|---|
| villager · walk | 0,317 | 1,33 | 1,05–1,65 | **3,3–5,2** | 26–32 % | 0,79–0,90× |
| villager · carry_walk | 0,260 | 1,33 | 0,84–1,32 | **3,2–5,1** | 23–27 % | 0,80–0,95× |
| villager · flee (fabricado) | 0,44 | 0,80 | 1,63–2,56 | 3,7–5,8 | — | — |
| niño (talla 0,55) · walk | 0,174 | 1,33 | 1,05–1,65 | **6,0–9,5** | — | — |
| clan vecino · walk | 0,317 | 1,33 | 1,40 | 4,4 | — | — |
| cow · walk | 0,210 | 2,71 | 0,32 | 1,5 | 56 % | 0,95–0,99× |
| pig · walk | 0,115 | 2,71 | 0,40 | 3,5 | 55 % | 0,94–0,98× |
| hen · walk | 0,075 | 2,71 | 0,55 | **7,3** | 71 % | 0,68–0,72× |
| duck · walk | 0,075 | 2,71 | 0,35 | 4,7 | 71 % | 0,68–0,72× |
| crow · walk | 0,080 | 2,71 | 0,30 | 3,8 | 62 % | 0,74× |
| fox · walk | 0,130 | 2,71 | 0,95 | **7,3** | 45 % | 0,94–0,97× |
| fish · walk | 0,130 | 2,71 | 0,20 | 1,5 | — | — |
| deer · walk | 0,333 | 2,04 | 0,72 / 1,35 | 2,2 / 4,1 | 66 % | 0,93× |
| dog · walk | 0,345 | 1,20 | 1,25 | 3,6 | (nodos rígidos) | — |
| dog · run (fabricado, ×1,6) | 0,552 | 1,20 | 1,63 | 2,9 | — | — |
| mule · walk | 0,449 | 1,20 | 1,43 | 3,2 | (nodos rígidos) | — |
| wolf · walk | 0,358 | 1,20 | 0,75 | 2,1 | (nodos rígidos) | — |
| bear · walk | 0,444 | 1,20 | 0,56 | 1,3 | (nodos rígidos) | — |
| boar · walk | 0,342 | 1,20 | 0,85 | 2,5 | (nodos rígidos) | — |
| boar · charge | 0,513 | 0,80 | 1,20 | 2,3 si fuera por distancia; **hoy va por reloj, 1,25 Hz, y patina 0,96 celdas por ciclo contra 0,51** | — | — |
| rabbit · hop | 0,150 | 1,38 | 0,80 | 5,3 | 28–48 % | (salto) |
| rabbit · flee | 0,260 | 0,88 | 2,40 | **hoy por reloj, 1,1 Hz: 2,1 celdas por ciclo contra 0,26 (patina)**; por distancia serían 9,2 Hz | — | (salto) |
| partridge · walk | 0,064 | 0,60 | 1,50 | **23** | 29 % | — |

Para los modelos de nodos rígidos el «plantado» del informe no es fiable (el
pie no es un hueso, y el vértice más bajo de la pata cambia al girar);
`tests/fast/graphics-animal-motion.test.ts` los mide con otro criterio y pasa.

**Lo que esta tabla dice, en dos frases.** Los clips G-23 y el ciervo están
bien plantados; lo que falla es el **ritmo**: el aldeano anda a 3–5 ciclos por
segundo (un paseo humano es ~1), el niño a 6–9, la gallina y el zorro a 7, la
perdiz a 23; y dos clips de carrera (`charge`, `flee` del conejo) van por reloj
y patinan de lleno. La causa del ritmo humano está escrita en `design.md`
D.6.1–D.6.2: el paso de la vida (1,05–1,65 celdas/s) se fijó para que la
jornada cupiera en ciento veinte segundos, y la zancada del clip (0,32
celdas, 0,95 m) es la de un paseo.

### 2.2 Coste de referencia (`gl-probe`, SwiftShader, no son FPS de móvil)

Se rellena con `artifacts/graphics/AN-0/perf/*.txt` al cerrar AN-0 y se
compara en AN-4.

| Escena | Llamadas | Triángulos | Programas | JS mediana / p90 (ms) |
|---|---|---|---|---|
| Villa 7/60 (antes) | 503 | 826,018 | 42 | 1.6 / 5503 (no comparable: SwiftShader dibuja dentro del callback; 7 fotogramas en 53 s) |
| Aldea 11/21 (antes) | 441 | 695,243 | 43 | 281.2 / 358.3 (no comparable: SwiftShader dibuja dentro del callback; 21 fotogramas en 43 s) |

**Lo comparable aquí son las llamadas, los triángulos y los programas.** En esta máquina (4 núcleos, sin GPU) SwiftShader rasteriza dentro del `requestAnimationFrame`, así que el «JS por fotograma» de la sonda incluye el dibujo por software y no dice nada del JavaScript del juego; el coste de la capa de animación se compara en AN-4 con un banco de Node sobre `Cast` y `Fauna` (`tools/reports/animation-cost.ts`), que es el mismo código que corre el teléfono.

### 2.3 Tomas de referencia (mismo estado para el después)

| Toma | Semilla · año · `lead` | Cámara | Qué enseña | Carpeta |
|---|---|---|---|---|
| Aldea a 320×568 (AN-4) | 11 · 21 · 20 s, 2 fps × 10 s | **320×568**, encuadre de reposo | La misma aldea en pantalla estrecha: la gente mide 10 px y la plaza sigue leyéndose (`AN-4/after/wide-seed11-y21-320/middle.png`) | `artifacts/graphics/AN-4/after/wide-seed11-y21-320/` |
| Aldea, plano general | 11 · 21 · 20 s, 2 fps × 20 s | 390×844, encuadre de reposo | 48 personas, 9 gallinas, 2 ciervos, perro, 3 patos, lluvia (`shelter`) | `artifacts/graphics/AN-0/baseline/wide-seed11-y21/` |
| Adulto andando | 11 · 21 · 20 s, 15 fps × 6 s | `--follow 13 --zoom 0.18` | La marcha del aldeano en el juego | `…/walk-seed11-y21-follow13/` (`strip-30-45.png`) |
| Niño andando | 11 · 21 · 20 s, 15 fps × 6 s | `--follow 54 --zoom 0.18` | La marcha a talla 0,55 | `…/walk-seed11-y21-child54/` |
| Villa, plano general | 7 · 60 · 20 s, 2 fps × 20 s | **331×717** (la ventana no llegó a 390×844 en esa toma; AN-4 la repite a 390×844 con la página «antes» en `AN-1/before/wide-seed7-y60/`) | Sesenta personas (32 adultos, 27 niños, 1 mayor; la guarnición sólo sube al cerco con un asalto) | `…/wide-seed7-y60/` |
| Gallinas, patos | 11 · 21 · 20 s, 15 fps × 6 s | `--look 31.5,48.6` / `--look 36.5,54`, `--zoom 0.18` | Reposo y picoteo del corral; los patos a la deriva en el agua | `…/hens-seed11-y21/`, `…/ducks-seed11-y21/` (`strip-0-16.png`) |
| Niño andando, villa (AN-1) | 7 · 60 · 20 s, 15 fps × 6 s | `--follow 242 --zoom 0.18` | La marcha a talla 0,64 antes (GLB de G-17, `--page artifacts/graphics/AN-1/game-before/valley.html`) y después (AN-1a), mismo estado | `artifacts/graphics/AN-1/before/walk-seed7-y60-child242/`, `…/after/walk-seed7-y60-child242/` (`strip-30-45.png`) |
| Adulto andando, villa (AN-1) | 7 · 60 · 20 s, 15 fps × 6 s | `--follow 114` → **bajo la copa del bosque, no sirve**; se repite con `--follow 208 --zoom 0.18` | El par antes/después del adulto en la villa: en los mismos 16 fotogramas (1,07 s) el «después» abre la pierna adelante y da menos pasos; el «antes» va con las piernas juntas | `…/AN-1/before/walk-seed7-y60-follow208/strip-30-45.png`, `…/after/walk-seed7-y60-follow208/strip-30-45.png` |
| Asalto tras el portón (AN-3) | 11 · 21 · 20 s, 10 fps × 12 s | 390×844, `--raid 12 --assault` | Portón ya roto, 43 vecinos huyendo | `artifacts/graphics/AN-3/assault-seed11-y21/` (`strip-flee.png`) |
| El portón (AN-3) | 11 · 21 · 8 s, 10 fps × 14 s | 390×844, `--raid 12 --assault` | Los golpes al portón (uno por segundo) con la carga entre golpes | `artifacts/graphics/AN-3/gate-seed11-y21/` (`strip-gate.png`, `zoom-gate-9005.png`) |
| Villa, plano general «antes» (AN-4) | 7 · 60 · 20 s, 2 fps × 20 s | 390×844 pedido, **331×717 capturado** (la adaptativa del empaquetado antiguo baja la resolución bajo SwiftShader), `--page` antigua | La villa con el GLB de G-17 para el par de la plaza (`AN-4/compare/plaza-seed7-*`, reescalado y dicho) | `artifacts/graphics/AN-1/before/wide-seed7-y60/` |
| Villa, asalto (AN-3) | 7 · 60 · 8 s, 6 fps × 26 s, `--raid 24 --assault` | 390×844 | **No cargó**: tiempo de carga agotado dos veces (sesenta personas, muralla, 24 hombres y Rapier bajo SwiftShader) | — |
| Ciervo | 11 · 21 · 20 s, 15 fps × 6 s | `--look 21.4,37.7` | **Tapado por la copa del bosque desde la cámara del juego**: el ciervo vive en la linde y el encuadre de reposo lo pierde; su evidencia en partida se toma en la caza (AN-3), donde el bosque se atenúa | `…/deer-seed11-y21/` |

**La traza (AN-1).** En las seis tomas de seguimiento a 15 fps —semillas 11 y
7, antes y después— ningún cuerpo salta de sitio: **0 saltos en 30 240
muestras**, desplazamiento máximo por fotograma 0,143 celdas (menos de un
paso), medido sobre `trace.json` de cada toma. `film.mjs` + `film-sheet.py`
no sirve para esta medida bajo SwiftShader: rueda en tiempo real y aquí tarda
8 s por fotograma, así que su informe cuenta el reloj como saltos (38 «saltos»
y 37 «giros» en la semilla 11 que la traza del observatorio no tiene).

### 2.4 Después de AN-1 (29 sep 2026, mismas herramientas)

Lo que AN-1 cambió y cómo se midió. Las cifras de cadencia salen del mismo
`gait-report` sobre el GLB publicado
(`artifacts/graphics/AN-1/gait-report-after.txt`); las de orientación, mezcla
y parada, de propiedades sobre el controlador real
(`tests/fast/graphics-animal-motion.test.ts`, `tests/fast/cast-stops.test.ts`).

| Cuerpo · clip | Antes | Después | Cómo |
|---|---|---|---|
| villager · walk | zancada 0,317; **3,3–5,2 Hz**; apoyo 26–32 %; plantado 0,79–0,90× | zancada 0,423; **2,5–3,9 Hz**; apoyo 44–48 %; plantado 0,97–1,03× | `art/recipes/villager/plant-gait.mjs` + `tools/art/bake-clips.mjs` (brief §6 del plan, AN-1a). En partida: `artifacts/graphics/AN-1/after/walk-seed11-y21-follow13/strip-30-45.png` contra la misma tira de AN-0, y el par de la semilla 7 (§2.3) |
| villager · carry_walk | 0,260; 3,2–5,1 Hz; 23–27 %; 0,80–0,95× | 0,339; 3,1–4,9 Hz; 45–49 %; 0,97–1,02× | ídem; hoja `artifacts/graphics/AN-1/gestures/carry_walk-villager-sheet.png` |
| niño (talla 0,55) · walk | 6,0–9,5 Hz | 4,5–7,1 Hz | cálculo: la misma zancada escalada por talla; el par del niño 242 en la semilla 7 (§2.3). Sigue alto: ver «lo que queda» |
| clan vecino · walk | 4,4 Hz | 3,3 Hz | cálculo (paso 1,40) |
| villager · parada | fundido de 0,22 s con la zancada congelada donde el suelo la dejó: un pie colgado que se derretía en diagonal hacia el reposo | el clip que se apaga sigue su ciclo mientras se funde: el pie en vuelo adelanta y baja, y el fundido acaba en `idle` igual que antes | `world/cast.ts` (AN-1c), propiedad en `tests/fast/cast-stops.test.ts` |
| fox · walk | 7,3 Hz (paso 0,95) | 4,6 Hz (paso 0,60, `FOX_PACE`) | cálculo sobre la zancada medida 0,13; la huida (2,2) no cambia |
| boar · charge | por reloj: 1,25 Hz, patinaba 0,96 celdas por ciclo | por suelo recorrido con la zancada del catálogo (0,513): 2,3 Hz a 1,2 celdas/s | propiedad: la pata no se mueve quieto y se mueve al avanzar |
| rabbit · flee | por reloj: 1,1 Hz, patinaba 2,1 celdas por ciclo | por suelo recorrido: 0,26 × 2,2 (`FLEE_HOP`, TUNE: cuánto vuela cada brinco) = 0,57 celdas por brinco, 4,2 Hz a 2,4 celdas/s | ídem |
| todas · orientación | giro hacia el desplazamiento de píxel entre fotogramas (umbral 0,00001): oscilaba contra vallas y vecinos; el perro ladraba hacia donde iba | el rumbo de la vida (`Animal.facing`, con la histéresis de `body.ts`); sin rumbo, el avance neto ≥ 0,05 celdas; giro suavizado a 12 s⁻¹ | propiedades: un ruido de ±0,0005 no mueve la cara; `facing` π/2 → rotación π |
| dog · bark/play, bear · attack, partridge · takeoff/flight, boar · charge, rabbit · flee | entraban y salían a peso 1 de golpe | fundido de 0,08 s (gesto), 0,10 s (marcha), 0,14 s (caer) | propiedad: el primer fotograma de `bark` pesa < 0,6 |
| boar/rabbit/bear · down | tumbado en un fotograma (rotación −π/2 de golpe) | cae con constante de 0,14 s | propiedad: tras un fotograma > −π/4, tras 1 s ≈ −π/2 |

**Lo que AN-1 deja escrito y no toca.**

- **La gallina a 7,3 Hz.** `PACE.hen` (0,55 celdas/s, `life/beasts.ts`) es una
  decisión del corral («picotea a saltos y por eso es la más rápida»); a
  390×844 la gallina mide 4–6 px y el ritmo de las patas no se lee, sólo su
  velocidad de suelo. Se conserva con el límite dicho; bajarla a 0,4 daría
  5,3 Hz y es un TUNE de una línea si de cerca molesta.
- **El niño a 4,5–7,1 Hz.** La zancada se escala por talla y el paso de la
  vida no: un niño da más pasos por la misma distancia, que es lo que hace un
  niño. Un paso propio para la talla es un cambio de `village.ts` que AN-1 no
  hace porque a 6 px el niño se lee bien en la toma (`walk-seed11-y21-child54`).
- **Un trote humano (1,8–2,8 Hz) es decisión de Vera:** exige o bajar el paso
  de la vida (la jornada de D.6.1 deja de caber en sus segundos) o un clip de
  trote que cambia el carácter del aldeano. Anotado en `docs/encargos-3d.md`.
- **La perdiz anda a 23 Hz, pero no anda:** en la caza se queda en casa hasta
  huir (`wild-prey.ts`, `target = home`), así que `walk` es `preview-only`.
- **El ciervo huye con `walk` a 4,1 Hz:** su GLB no trae carrera. Anotado.
- **`attack` del lobo y del jabalí no lo emite nadie** (cabeza 4°, cuello 9°):
  `preview-only`, anotado en `docs/encargos-3d.md`.

---

### 2.5 Después de AN-2 (29 sep 2026)

Los gestos cotidianos, medidos sobre el rig publicado con el `Cast` real
(`tests/fast/work-gestures.test.ts`, «AN-2 · los gestos cotidianos se leen a
veinte píxeles») y en las hojas de `artifacts/graphics/AN-2/gestures/`. En
partida: `artifacts/graphics/AN-2/after/` (plano general de la semilla 11,
el herrero 27 con sus chispas —`hammer-seed11-y21-follow27/strip-30-53.png`—,
el niño 60 sentado a la comida —`sit-seed11-y21-follow60/`—). La toma que
buscaba un lanzamiento (niño 224, semilla 7) no lo encontró: en ese valle no
hay pelota y los niños brincan en su sitio de juego; `throw` queda con la
hoja y la propiedad, y una toma de integración pendiente de un valle con
pelota.

| Gesto | Antes | Después | Medida |
|---|---|---|---|
| sit | cadera a 0,31 m en el aire, muslos en ángulo recto: un banco que no existe | en el suelo: cadera a 0,25 m, rodillas alzadas, pies a ras, manos en las rodillas, un balanceo leve | pies a +0,016 / +0,001 celdas del suelo |
| talk | antebrazo derecho ±0,25 rad y cabeza ±0,06: sólo se leía la burbuja | la mano derecha sube al pecho dos veces por ciclo, la izquierda contesta, la cabeza asiente (3 por ciclo) y se vuelve ±8° | mano derecha: 0,33 → 0,45 celdas (+0,12) |
| pray | manos juntas y cabeza gacha, quietas 5 s | una inclinación por ciclo desde la cintura (26°), las manos suben al mentón, la cabeza baja a 48° | cabeza 0,26 → 0,83 rad de inclinación |
| hammer | seno del brazo sin instante de golpe; nada salía | carga sobre el hombro (mano a 0,63, sobre la cabeza), golpe en 0,55 por debajo de la cintura (0,28) y rebote; la izquierda sujeta delante; chispas (`spark`, fragua) o astillas (`wood`, obra) desde la mano | baja 0,35 celdas en 0,15 del ciclo |
| sort | vaivén de manos delante del pecho | coger (tronco a 72°, manos a la cintura), levantar al pecho, dejar a la derecha (giro 31°) | cabeza baja 0,048 celdas al coger |
| drink | la taza a la boca con un vaivén de 0,12 rad | la taza sube (0–0,3), la cabeza atrás 23° con la taza en la boca (0,45–0,6), todo baja | mano a 0,515 de alto, 0,12 delante de la boca |
| play (sin pelota) | balanceo de brazos abiertos por reloj, que a veinte píxeles era estar de pie | brinca: dos saltos por ciclo (cadera +0,12 m) con la rodilla que sube alterna, brazos abiertos, tronco que se vuelve. Es lo que un niño hace casi todo su día de juego: el `play` de `day.ts` se ofrece sin trasto, y en las tomas de las semillas 7 y 11 **no hay pelota** (`props: []`) | cadera +0,04 celdas y rodilla 0,07 más alta que la otra en lo alto del brinco |
| throw (con pelota) | no existía: la pelota salía de la nada | de una vez, 1,0 s, fechado por el final de la oferta (`throwSeconds`): pelota sujeta con las dos manos, carga atrás y arriba (0,6), giro y barrido hasta la suelta al final; `world/cast.ts` funde a `idle` después | mano en la suelta a 0,22 celdas del punto de salida de `fling` (0, 0,53, 0,4); **sin toma en partida**: en las dos semillas de las tomas no hay pelota, la evidencia es la hoja y la propiedad |
| dog · bark/play | entraban de golpe | fundido de 0,08 s (AN-1b); los gestos (dos tirones de cabeza; la reverencia) se conservan | banco de AN-0 |
| golondrina | «sin planeo» en AN-0 | la fila estaba mal: bate y planea a ratos; se conserva | `ambience.ts`, `gliding` |
| shelter, chop, mine, work_hoe, spread | correctos en AN-0 | se conservan | — |
| sow, douse | sólo en preview | se conservan; verificación en partida pendiente de una toma en siembra y de un fuego (AN-4) | — |

**Lo que AN-2 deja escrito (en `docs/encargos-3d.md`).** Un banco o un tronco
donde la aldea se sienta (hoy, en el suelo); la pelota colgada de la mano
mientras se lleva (`world/props.ts` la pinta 0,38 por delante a 0,45 de alto);
un martillo publicado (hoy el respaldo de `hand-tools.ts`).

### 2.6 Después de AN-3 (29 sep 2026)

Los gestos fechados se revisaron sobre las hojas de AN-0 y el código que los
fecha (`melee.ts`, `archery.ts`, `raiders.ts`: sin tocar). Tres cambios, todos
del lado de la pantalla, y la evidencia en partida en `artifacts/graphics/AN-3/`.

| Gesto | Antes | Después | Medida |
|---|---|---|---|
| gate_strike | 0,6 s: contacto en t=0, retirada, y los brazos caídos hasta el golpe siguiente (un asaltante que golpea sin levantar el arma) | 1,0 s, lo que tarda el golpe siguiente (`BLOW_STEPS` = 30 pasos): contacto en t=0, retirada (0–0,3), carga con los dos brazos por encima de la cabeza y el tronco atrás (0,3–0,85), y espera cargado hasta que el hecho siguiente lo devuelve al contacto | manos a 0,236 delante y 0,37 de alto en el contacto; a 0,65 (sobre la cabeza, 0,49) en la carga; `combat-clips.test.ts`. En partida: `artifacts/graphics/AN-3/gate-seed11-y21/zoom-gate-9005.png` (asalto de 12 en la semilla 11, `--lead 8`): los golpes del portón suben en los fotogramas 41 y 51 (uno por segundo, `BLOW_STEPS`), el asaltante −9005 retira los brazos en 42–44 y los carga sobre la cabeza en 45–49; `strip-gate.png` con el grupo entero |
| flee | zancada 0,44 a 1,6–2,6 celdas/s: 3,7–5,8 ciclos por segundo, casi el paso de andar con las piernas abiertas; los pies flotaban 10 cm en cada apoyo | zancada 0,7 (2,3–3,7 Hz), piernas a ±46°, la de atrás casi recta y la de delante con la rodilla alta; la cadera sigue a la pierna que apoya (baja hasta 0,10 m) y sube 0,03 m en el cruce | pierna delantera a ras (pie ≤ 0,075), la de atrás 0,04 celdas más alta, cadera 0,038 celdas más baja al abrirse; `combat-clips.test.ts`. En partida: `artifacts/graphics/AN-3/assault-seed11-y21/strip-flee.png` (asalto en la semilla 11, 43 vecinos huyendo tras caer el portón; el 72 corre a 1,70 celdas/s, 2,4 ciclos por segundo, a escala nativa ×2) |
| bear · attack (aviso) | el aviso duraba 1,55 s y el clip 3 s: el oso se cortaba a media subida y se iba andando | el aviso dura lo que el clip: 3 s (brief AN-3a, `bear.ts`) | `life-bear.test.ts` adaptada (a los dos segundos todavía amenaza; después se va). **Sin toma en partida:** el observatorio no tiene vía para la visita del oso (`--beast` sólo actúa con `--aftermath`, y `--happening bear_in_the_wood` no hizo aparecer al oso en 56 s de jornada en la semilla 11); la evidencia del gesto es el banco de AN-0 (`AN-0/animals/bear-gestures.png`: se alza en el primer segundo y medio) y la constante. Apuntado en `encargos-3d.md` como ruta de observación pendiente |
| bow_draw, bow_loose, spear_thrust, hit_take, fall | correctos en la hoja de AN-0: tensado sostenible con la mano en la mejilla, suelta que se separa en t=0, estocada con el contacto en t=0 y recuperación, retroceso del torso, caída de espaldas que termina tendida | se conservan; contacto en t=0 y daño intactos (`combat-clips`, `melee`, `archery`, `ragdoll-physics` en verde) | hojas en `artifacts/graphics/AN-0/gestures/` |
| boar · charge, rabbit · flee, partridge · takeoff/flight | por reloj o de golpe (AN-0) | por suelo recorrido y con fundido (AN-1b); `attack` de jabalí y lobo `preview-only` | `graphics-animal-motion.test.ts` |

## 3 · La matriz: clips humanos

| Clip | Origen | Situación en partida | Evidencia | Defecto concreto | Gravedad | Coste | Decisión |
|---|---|---|---|---|---|---|---|
| idle | GLB | parado sin oferta; visitantes | partida (wide-11), preview | Respira y gira la cabeza cada 4 s con desfase por persona: correcto. Al parar, la mezcla de 0,22 s desde `walk` corta la zancada a media pierna | baja | S | **AN-1c hecho**: la parada con la pierna que baja (§2.4) |
| walk | GLB | todo trayecto; 669 de 1 968 muestras de actor en wide-11 | partida (follow13), preview | **Cadencia 3,3–5,2 Hz** (§2.1): «hormigas». Plantado 0,79–0,90× | **alta** | L (receta + GLB) | **AN-1a hecho**: zancada 0,423, plantado 0,97–1,03×, 2,5–3,9 Hz (§2.4) |
| carry_walk | GLB | acarreo de leña, piedra, grano, fardos | partida (wide-11), preview | Misma cadencia; el haz cuelga bien de `hand_l` | alta (igual que walk) | L | **AN-1a hecho**: 0,339, 3,1–4,9 Hz (§2.4) |
| work_hoe | GLB | campo, fase de azada | partida (wide-11), preview | Azadona con la espalda y la azada llega al suelo. Sin defecto visto | — | — | conservar |
| flee | fabricado | huida civil (asalto, oso); `carry_walk` no | preview | Carrera legible: torso adelante, brazos doblados; 3,7–5,8 Hz | media | S | AN-3: comprobar en asalto |
| sit | fabricado | comer, hoguera, banco | partida (wide-11: 275 muestras), preview | Cadera baja 0,55 m y muslos en ángulo recto; sin banco se sienta en el aire a la altura de un banco | media | S | **AN-2 hecho**: se sienta en el suelo (cadera a 0,25 m, rodillas alzadas, pies a ras ±2 cm); un banco o un tronco es encargo (§2.5) |
| talk | fabricado | charla `peer`; pagar | partida (wide-11), preview | Antebrazo derecho y cabeza; a 6 px sólo se lee la burbuja | baja | S | **AN-2 hecho**: la mano derecha sube 0,12 celdas al pecho dos veces por ciclo, la izquierda contesta, la cabeza asiente y se vuelve (§2.5) |
| pray | fabricado | capilla, iglesia | partida (wide-11) | Manos juntas, cabeza gacha, estático 5 s | baja | S | **AN-2 hecho**: una inclinación por ciclo (tronco 26°, cabeza a 48°) (§2.5) |
| hammer | fabricado | fragua, obra | partida (wide-11) | Vaivén del brazo con martillo; sin instante de golpe (`STRIKE_AT` no lo cubre) ni astilla | media | S | **AN-2b hecho**: carga sobre el hombro, golpe en `STRIKE_AT.hammer = 0,55` por debajo de la cintura y rebote; chispas en la fragua y astillas en la obra desde la mano (§2.5) |
| chop | fabricado (IA-anim) | tala | partida (wide-11), preview | Carga, golpe y rebote con astillas; medido en IA-anim | — | — | conservar; re-verificar |
| mine | fabricado (IA-anim) | cantera | preview | Ídem; picado filmado en IA-anim (semilla 23) | — | — | conservar; re-verificar |
| sow | fabricado (IA-fields) | campo, fase de siembra | preview | Voleo con bolsa; semilla desde la mano | — | — | AN-2: verificar en partida |
| spread | fabricado (IA-fields) | campo, estiércol; 434 muestras en wide-11 | partida (wide-11), preview | Horca a dos manos; carga abajo y lanza | — | — | AN-2: verificar |
| douse | fabricado (E4) | brigada de cubos | preview | Cubo en `hand_r`; el agua sale de la mano | — | — | AN-3/AN-2: preview-only hasta filmar un fuego |
| play | fabricado | niños con pelota | preview | Brazos abiertos y balanceo; no hay gesto de lanzar ni de coger | media | S | **AN-2a hecho, en dos clips**: `play` sin pelota brinca (el día de juego de un niño, `day.ts`); `throw` con pelota es un lanzamiento de una vez fechado con el final de la oferta (`throwSeconds`), suelta a 0,22 celdas del punto de salida de `fling` (§2.5) |
| drink | fabricado | vado, pozo | partida (wide-11: 155), preview | Taza a la boca; correcto | — | — | **AN-2**: tres tiempos (la taza sube, la cabeza atrás 23°, baja): antes la taza subía y se quedaba (§2.5) |
| sort | fabricado | granero, molino, preparar, entregar, saqueo | partida (wide-11) | Manos que se mueven delante; genérico | baja | S | **AN-2 hecho**: coger (tronco a 72°, manos a la cintura), levantar y dejar a un lado (giro de 31°) (§2.5) |
| shelter | fabricado | bajo alero con lluvia | partida (wide-11: 117) | Brazos cruzados y tiritón; correcto | — | — | conservar |
| bow_draw | fabricado (E1) | arqueros de la guarnición, caza | preview | Tensado sostenible; sin dedos | — | — | AN-3: verificar en asalto |
| bow_loose | fabricado (E1) | suelta, fechada por la flecha | preview | Suelta en t=0 | — | — | AN-3 |
| gate_strike | fabricado (E1) | asalto, golpe al portón | preview | Contacto en t=0, retirada | — | — | AN-3 |
| spear_thrust | fabricado (E1) | cuerpo a cuerpo, caza con lanza | preview | Contacto en t=0 | — | — | AN-3 |
| hit_take | fabricado (E1) | recibir un golpe | preview | Retroceso del torso y brazos | — | — | AN-3 |
| fall | fabricado (E1) | caída (respaldo del ragdoll) | preview | De espaldas, termina tendido | — | — | AN-3 |

## 4 · La matriz: especies

| Especie · clip | Origen | Situación en partida | Evidencia | Defecto concreto | Gravedad | Coste | Decisión |
|---|---|---|---|---|---|---|---|
| hen · idle/walk | receta G-23 | corral, todo el día | partida (wide-11, hens-11 a 15 fps), preview | Cadencia 7,3 Hz y plantado 0,68× (§2.1) | media (de cerca) | L (receta) o S (ritmo) | conservar con límite dicho (§2.4): a 4–6 px no se lee; `PACE.hen` es un TUNE de una línea |
| pig · idle/walk | receta G-23 | corral | preview | 3,5 Hz, plantado 0,94–0,98×: correcto | baja | — | conservar |
| cow · idle/walk | receta G-23 | corral, vado | preview | 1,5 Hz, plantado 0,95–0,99×: correcto | — | — | conservar |
| crow · idle/walk | receta G-23 | campos (ambiental) | preview | 3,8 Hz, plantado 0,74× | baja | — | conservar (ambiental, lejos) |
| fish · idle/walk | receta G-23 | río (ambiental) | preview (bajo el suelo del banco) | No medible en el banco; nado a 1,5 Hz | baja | — | AN-4: mirar en la toma del vado |
| fox · idle/walk | receta G-23 | noche, gallinero; huye sin clip | preview | 7,3 Hz al paso 0,95; `flee` cae a `walk` | media | S | **AN-1b hecho**: paso 0,6 (4,6 Hz); la huida sigue con `walk` por velocidad (sin clip) |
| duck · idle/walk | receta G-23 | agua junto al pueblo | partida (ducks-11 a 15 fps), preview | 4,7 Hz, plantado 0,68× (bajo el agua no se ve) | baja | — | conservar |
| deer · idle/walk | receta propia (`plant-gait`) | linde del bosque; huye a 1,35 | preview; en partida tapado por el bosque (ver §2.3) | 2,2 Hz, plantado 0,93×: correcto; al huir 4,1 Hz con el mismo clip | baja | S | **AN-1b**: rumbo de la vida; la huida sigue con `walk` (sin clip de carrera: límite, en `encargos-3d.md`) |
| rabbit · idle/hop/flee | receta propia | linde; huye | preview | `hop` 5,3 Hz; **`flee` va por reloj y patina** (§2.1) | media | S | **AN-1b hecho**: `flee` por suelo recorrido, 0,57 celdas por brinco (§2.4) |
| partridge · idle/walk/takeoff/flight | Vera + `rigid-clips` | sólo en la caza | preview | `walk` a **23 Hz** (zancada 0,064 con paso 1,5); `takeoff` y `flight` legibles | media | S | `walk` = `preview-only`: en la caza no anda (§2.4); `takeoff`/`flight` con fundido (AN-1b) |
| boar · idle/walk/charge/attack | Vera + `rigid-clips` | caza: roam, charge, down | preview | **`charge` por reloj, patina** (§2.1); `attack` sólo mueve el cuello 9° y **nadie lo emite** | media / — | S / — | **AN-1b hecho** `charge` por suelo recorrido; `attack` = `preview-only` |
| bear · idle/walk/attack | Vera + `rigid-clips` | visita del oso (aviso), caza | preview | `attack` (se alza) legible; después del clip queda alzado hasta que acaba el aviso | media | S | AN-3: revisar el final del aviso |
| wolf · idle/walk/attack | Vera + `rigid-clips` | corral (semana del suceso), manada de la sierra | preview | `walk` bien; **`attack` sólo mueve cabeza 4° y orejas** y nadie lo emite | — | — | `attack` = preview-only; anotar en `encargos-3d.md` |
| dog · idle/walk/run/bark/play | Vera + `rigid-clips` + fabricados | casa, niños, pelota, forastero, zorro | preview | Los cinco legibles en el banco; `bark`/`play` con corte seco al cambiar (sin mezcla) | baja | S | **AN-1b hecho**: fundido de 0,08 s; AN-2 revisa el gesto |
| mule · idle/walk | Vera + `rigid-clips` | detrás del buhonero | preview | Trote a 3,2 Hz | baja | — | conservar |
| golondrina · batir | Astra + `ambience.ts` | cielo de día | partida (wide-11) | Batir de −55° a +35°; **sí hay planeo** (AN-0 lo anotó mal): `ambience.ts` alterna batir y planear (`gliding`, ala a −23°) y ladea con el vaivén | — | — | conservar; corregida la fila en AN-2 |

**Orientación de los animales (todas las especies) — hecho en AN-1b, ver §2.4.** `AnimalMotion.place`
gira el cuerpo hacia el desplazamiento de píxeles entre dos fotogramas con un
umbral de 0,00001 celdas, e ignora el `facing` que la vida ya calcula con
histéresis (`body.ts`, `TURN_MIN_SPEED`, `TURN_MIN_PROGRESS`). Un animal
apretado contra un muro o entre vecinos oscila de cara. Gravedad media, coste
S: AN-1, pasando el rumbo de la vida en `Animal`.

**Mezclas — animales hechos en AN-1b, la parada humana en AN-1c (§2.4).** Personas: fundido lineal de 0,22 s entre clips, salvo los
fechados (sin mezcla, por contrato de E1). Animales: `special` (bark, play,
flee, charge, flight) entra y sale a peso 1 de golpe. Coste S: AN-1/AN-2.

---

## 5 · Veredictos (AN-4)

Una fila por clip y por especie, cerrada con la evidencia del después y un
veredicto: **mejorado** (se cambió y se ve), **conservado** (ya cumplía y se
muestra por qué), **límite** (se mide, no se arregla en esta ronda, y se dice
por qué) o **preview-only** (sólo se ha visto en hoja o banco; no cuenta como
integrado). Las comparaciones a escala nativa están en
`artifacts/graphics/AN-4/compare/` (GIF «antes | después» a 1:1 y ×3, y tira
estática) y el índice de todas las tomas en
`docs/medidas/animacion-tomas-2026-09-29.md`. **Regla del encargo:** una
mejora que sólo se aprecia en primer plano no pasa; por eso cada fila dice
qué se ve a 390×844 y qué observación la refutaría.

### 5.1 Clips humanos

| Clip | Evidencia del después | A escala de móvil | Veredicto | Lo que lo refutaría |
|---|---|---|---|---|
| idle | plano general 11/21 antes y después (`AN-0/baseline/wide-seed11-y21`, `AN-2/after/wide-seed11-y21`); parada en `cast-stops.test.ts` | respira y gira la cabeza; al parar, el pie baja | **conservado**, con la parada mejorada (AN-1c) | un pie colgado a media zancada al pararse en `walk-seed7-y60-follow208/after` |
| walk | pares 11/13, 7/242 y 7/208 (`AN-1/before`, `AN-1/after`); GIF nativo `AN-4/compare/walk-*-native.gif`; `gait-report-after.txt` | a 12–14 px la diferencia es de **ritmo** (2,5–3,9 Hz contra 3,3–5,2: menos aleteo de piernas); la zancada abierta y el pie plantado se ven con zoom | **mejorado**; si en el GIF a escala nativa no se distingue, la mejora de forma queda para el trote (decisión de Vera) | que el GIF nativo «antes/después» no se distinga en ciego |
| carry_walk | hoja `AN-1/gestures/carry_walk-villager-sheet.png`; acarreos en el plano general 11/21 | mismo ritmo que `walk`; el haz cuelga bien | **mejorado** (0,339, 3,1–4,9 Hz) | ídem `walk` |
| work_hoe | plano general 11/21 (campo); hoja AN-0 | azadona con la espalda, la azada al suelo | **conservado** | — |
| flee | `AN-3/assault-seed11-y21/strip-flee.png` (43 huyendo; el 72 a 1,7 celdas/s); hoja `AN-3/gestures/flee-villager-sheet.png` (piernas abiertas, pie delantero a ras, tronco adelante) | corre con las piernas abiertas y la cadera baja; 2,4 Hz | **mejorado** (zancada 0,7, pisa) | pies flotando en la tira del asalto; cadencia > 4 Hz |
| sit | `AN-2/after/sit-seed11-y21-follow60/` (niño 60 a la comida), hoja `AN-2/gestures/sit-villager-sheet.png`, pies medidos en el rig del niño | sentado en el suelo, más bajo que antes (era un banco de aire) | **mejorado**; el banco es encargo | alguien sentado con los pies bajo el suelo o flotando |
| talk | hoja `AN-2/gestures/talk-villager-sheet.png`; charlas en el plano general 11/21 | la mano al pecho se ve; la cabeza, con zoom | **mejorado** (silueta) — a escala nativa manda la burbuja | que a 390×844 dos que hablan no se distingan de dos que esperan |
| pray | hoja `AN-2/gestures/pray-villager-sheet.png`; capilla en el plano general 11/21 (58, 71, 39, 32) | la inclinación se ve como silueta que se dobla | **mejorado** | un rezo que se lea como estar de pie |
| hammer | `AN-2/after/hammer-seed11-y21-follow27/strip-30-53.png` (carga, golpe, chispas); hoja | carga sobre la cabeza y chispas; a escala nativa se ven las chispas | **mejorado** (AN-2b) | chispas antes del golpe; golpe sin bajar el brazo |
| chop | plano general 11/21 (tala); hojas AN-0; `work-contact` de IA-anim | carga y astillas | **conservado** | — |
| mine | hoja AN-0; filmado en IA-anim (semilla 23) | ídem | **conservado** (sin cantera en las tomas de esta ronda) | — |
| sow | hoja AN-0 | voleo con bolsa | **conservado · preview-only esta ronda** (sin toma en siembra) | — |
| spread | plano general 11/21 (434 muestras); hoja AN-0 | horca a dos manos | **conservado** | — |
| douse | hoja AN-0 (sin cubo en el banco) | — | **conservado · preview-only** (sin fuego en las tomas) | — |
| play | hoja `AN-3/gestures/play-villager-sheet.png` (el giro del tronco y la rodilla se ven; el salto de 0,12 m son 7 px en la hoja y lo guarda la propiedad: cadera 0,287 → 0,321 a 0,2 s, medido también sobre el GLB con el mezclador a secas); plano general 7/60 «después» (`AN-4/after/wide-seed7-y60`): los niños 224, 243 y 240 en `play` 29, 26 y 23 de 41 fotogramas, `strip-play.png` (el 224 en la linde, tapado a medias por las copas) | brinca: cadera +0,12 m y rodilla alta; en el plano general el niño mide 10 px y el brinco es un salto de 2 px: se ve que se mueve, no la rodilla | **mejorado** (era un balanceo que parecía estar de pie); la lectura fina es con zoom | niños quietos de pie en sus sitios de juego en el plano general 7/60 |
| throw | hoja `AN-3/gestures/throw-villager-sheet.png` (pelota sujeta, carga atrás con giro, barrido adelante); `life-play-throw.test.ts`, `work-gestures.test.ts` | — | **preview-only**: en las semillas de las tomas no hay pelota; queda la toma de integración pendiente | — |
| drink | hoja `AN-2/gestures/drink-villager-sheet.png`; pozo y vado en el plano general 11/21 (51, 56, 10, 46) | la cabeza atrás se ve como silueta | **mejorado** | — |
| sort | hoja `AN-2/gestures/sort-villager-sheet.png`; granero en el plano general 11/21 (16) | doblarse a por la cosa se ve | **mejorado** | — |
| shelter | plano general 11/21 con lluvia (117 muestras) | brazos cruzados bajo el alero | **conservado** | — |
| bow_draw | hoja AN-0 (`bow_draw-villager-sheet.png`: brazo del arco extendido, mano en la mejilla, respiración leve); `combat-clips` (extremos idénticos, pose función del instante); el asalto de la villa 7/60 no cargó en el observatorio (sesenta personas, muralla, 24 hombres y Rapier bajo SwiftShader: tiempo de carga agotado, dos intentos) | — | **conservado · sin toma en partida esta ronda** (límite: la toma de integración queda pendiente, `encargos-3d.md`) | flechas sin brazo tensado |
| bow_loose | hoja AN-0 (la mano se separa de la mejilla en t=0); `combat-clips` («la suelta se separa del tensado inmediatamente») | — | **conservado · sin toma en partida esta ronda** | suelta después de la flecha |
| gate_strike | hoja `AN-3/gestures/gate_strike-villager-sheet.png`; portón en 11/21: `AN-3/gate-seed11-y21/zoom-gate-9005.png` (golpes en 41 y 51, carga sobre la cabeza en 45–49) | a 30 px se ve subir los brazos entre golpe y golpe | **mejorado** (carga el golpe siguiente) | brazos caídos entre golpes en la toma del portón |
| spear_thrust | hoja AN-0 (estocada con el contacto en t=0 y recuperación en 0,9 s); `melee.test.ts`, `combat-clips` | — | **conservado · sin toma en partida esta ronda** | contacto fuera de t=0 (`melee.test.ts` lo guarda) |
| hit_take | hoja AN-0 (retroceso del torso y los brazos, 0,5 s); `combat-clips`, `gore.test.ts` | — | **conservado · sin toma en partida esta ronda** | — |
| fall | hoja AN-0 (de espaldas, termina tendida); `combat-clips` («termina tendida sobre el suelo»), `ragdoll-physics.test.ts` (respaldo) | — | **conservado** | un caído que no queda tendido |

### 5.2 Especies

| Especie · clip | Evidencia del después | A escala de móvil | Veredicto | Lo que lo refutaría |
|---|---|---|---|---|
| hen · idle/walk | `AN-0/baseline/hens-seed11-y21` (15 fps); rumbo por `Animal.facing` (AN-1b) | 4–6 px: se ve la velocidad de suelo, no las patas | **límite** (7,3 Hz; `PACE.hen` es un TUNE de una línea) | gallinas que oscilan de cara contra la valla |
| pig · idle/walk | banco AN-0; corral en los planos generales | — | **conservado** (3,5 Hz, plantado 0,94–0,98×) | — |
| cow · idle/walk | banco AN-0; corral y vado en los planos generales | — | **conservado** (1,5 Hz, 0,95–0,99×) | — |
| crow · idle/walk | banco AN-0 | ambiental, lejos | **conservado** | — |
| fish · idle/walk | banco AN-0 (bajo el plano) | no visible a escala móvil | **conservado · preview-only** (ambiental) | — |
| fox · idle/walk | `graphics-animal-motion.test.ts`; `FOX_PACE` 0,6 | de noche, junto al gallinero | **mejorado** (4,6 Hz, rumbo) | — |
| duck · idle/walk | `AN-0/baseline/ducks-seed11-y21` | en el agua | **conservado** | — |
| deer · idle/walk | rumbo (AN-1b); la caza no se pudo filmar (sin señal tocable, §2.6) | tapado por el bosque en reposo | **límite**: huye con `walk` a 4,1 Hz (sin clip de carrera: encargo) | — |
| rabbit · idle/hop/flee | `graphics-animal-motion.test.ts` (flee por distancia); sin toma en partida (la caza no se pudo filmar) | — | **mejorado por propiedad · sin toma en partida** (`flee` por suelo recorrido) | un conejo que patina al huir en la caza |
| partridge · idle/walk/takeoff/flight | fundidos (AN-1b); sin toma en partida (la caza no se pudo filmar) | — | takeoff/flight **conservado con fundido · sin toma en partida**; walk **preview-only** (no anda en partida) | — |
| boar · idle/walk/charge/attack | `graphics-animal-motion.test.ts` (charge por distancia); sin toma en partida (la caza no se pudo filmar) | — | charge **mejorado por propiedad · sin toma en partida**; attack **preview-only** (nadie lo emite) | un jabalí que patina al cargar |
| bear · idle/walk/attack | banco `AN-0/animals/bear-gestures.png`; `bear.ts` aviso 3 s; sin toma en partida (el observatorio no provoca la visita: §2.6) | se alza entero (por la constante; no filmado en partida) | **mejorado · preview-only en esta ronda** (AN-3a) | un oso que se corta a media subida en una toma de la visita |
| wolf · idle/walk/attack | banco AN-0; rumbo (AN-1b) | corral y sierra | walk **conservado**; attack **preview-only** | — |
| dog · idle/walk/run/bark/play | banco AN-0; fundidos y rumbo (AN-1b); perro en los planos generales | — | **mejorado** (mira al forastero; sin cortes secos) | un perro que ladra hacia donde iba |
| mule · idle/walk | banco AN-0; buhonero en partida (IA-5) | — | **conservado** (3,2 Hz) | — |
| golondrina | plano general 11/21 (cielo) | bate y planea | **conservado** (la fila de AN-0 estaba mal) | — |

### 5.3 Coste

**Llamadas de dibujo y triángulos** (`gl-probe`, SwiftShader, reloj vivo,
`artifacts/graphics/AN-4/perf/` contra `AN-0/perf/`). No son FPS de ningún
aparato y el JS medido dentro del `requestAnimationFrame` de SwiftShader no
es comparable (el rasterizador dibuja dentro del callback); lo que se compara
es lo que la escena pide a la GPU:

| Escena | Antes (AN-0) | Después (AN-4) | Lectura |
|---|---|---|---|
| Aldea 11/21 | 441 llamadas · 695 243 tris · 43 programas | 446 llamadas · 706 440 tris · 43 programas | igual (+1 % de llamadas, +1,6 % de triángulos: lo que varía entre dos ventanas de reloj vivo) |
| Villa 7/60 | 503 · 826 018 · 42 | 474 · 778 714 · 64 | menos llamadas y triángulos en la ventana medida; **los programas no son comparables**: cuentan las variantes de sombreado compiladas hasta ese momento, y con el reloj vivo dependen de lo que entró en cuadro (lluvia, noche, fuego), no de la animación, que no añade materiales |

Ningún cambio de esta ronda añade mallas, huesos, materiales ni clips al GLB
(los clips fabricados se generan sobre el `idle`, como antes; `throw` es uno
más de la misma familia; las chispas comparten la malla y el material de las
astillas).

**JS de posar reparto y fauna por fotograma** (`tools/reports/animation-cost.ts`,
Node, sin dibujar: 100 personas —60 andando, 20 de pie, 10 talando, 10
sentadas— y 40 animales de las quince especies en círculos, 300 fotogramas;
antes en un worktree de `d82bd84`, después en la rama; dos pasadas cada uno,
seguidas, **con otras cadenas de Chromium corriendo en la misma máquina**):

| Pasada | `cast.show` mediana · p90 | `fauna.paint` mediana · p90 | Total mediana |
|---|---|---|---|
| antes 1 | 2,73 · 3,43 ms | 1,28 · 1,58 ms | 4,01 ms |
| después 1 | 2,77 · 3,73 ms | 1,41 · 2,03 ms | 4,18 ms |
| antes 2 | 2,82 · 4,51 ms | 1,37 · 2,11 ms | 4,19 ms |
| después 2 | 3,19 · 4,77 ms | 1,55 · 2,29 ms | 4,74 ms |

Lectura: 27–32 µs por persona y 32–39 µs por animal; entre dos pasadas
iguales hay 0,2–0,5 ms de ruido (la máquina estaba cargada), y el «después»
queda dentro de ese ruido en la primera pareja y 0,5 ms por encima en la
segunda. Lo que la ronda añade por fotograma es pequeño y conocido: una
pista más de cadera en `play` y `flee`, el fundido de los gestos animales y
el giro suavizado. **No hay regresión medible fuera del ruido**; la cifra
limpia (máquina sola) se remide al cerrar si queda tiempo, y en ningún caso
son fotogramas por segundo de un teléfono. Ficheros:
`artifacts/graphics/AN-4/perf/animation-cost-*.txt`.

### 5.4 Pendiente en dispositivo real

**iPhone/iPad: pendiente.** Nada de esta página es una medida en el aparato;
las tomas son de SwiftShader a 390×844 y 320×568 y el coste es JS de posar y
llamadas de dibujo, no fotogramas por segundo de un teléfono.
