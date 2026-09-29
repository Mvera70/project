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
| Aldea, plano general | 11 · 21 · 20 s, 2 fps × 20 s | 390×844, encuadre de reposo | 48 personas, 9 gallinas, 2 ciervos, perro, 3 patos, lluvia (`shelter`) | `artifacts/graphics/AN-0/baseline/wide-seed11-y21/` |
| Adulto andando | 11 · 21 · 20 s, 15 fps × 6 s | `--follow 13 --zoom 0.18` | La marcha del aldeano en el juego | `…/walk-seed11-y21-follow13/` (`strip-30-45.png`) |
| Niño andando | 11 · 21 · 20 s, 15 fps × 6 s | `--follow 54 --zoom 0.18` | La marcha a talla 0,55 | `…/walk-seed11-y21-child54/` |
| Villa, plano general | 7 · 60 · 20 s, 2 fps × 20 s | 390×844 | Cien personas, mayores, guarnición | `…/wide-seed7-y60/` |
| Gallinas, patos | 11 · 21 · 20 s, 15 fps × 6 s | `--look 31.5,48.6` / `--look 36.5,54`, `--zoom 0.18` | Reposo y picoteo del corral; los patos a la deriva en el agua | `…/hens-seed11-y21/`, `…/ducks-seed11-y21/` (`strip-0-16.png`) |
| Ciervo | 11 · 21 · 20 s, 15 fps × 6 s | `--look 21.4,37.7` | **Tapado por la copa del bosque desde la cámara del juego**: el ciervo vive en la linde y el encuadre de reposo lo pierde; su evidencia en partida se toma en la caza (AN-3), donde el bosque se atenúa | `…/deer-seed11-y21/` |

---

## 3 · La matriz: clips humanos

| Clip | Origen | Situación en partida | Evidencia | Defecto concreto | Gravedad | Coste | Decisión |
|---|---|---|---|---|---|---|---|
| idle | GLB | parado sin oferta; visitantes | partida (wide-11), preview | Respira y gira la cabeza cada 4 s con desfase por persona: correcto. Al parar, la mezcla de 0,22 s desde `walk` corta la zancada a media pierna | baja | S | AN-1: parada con la pierna que baja |
| walk | GLB | todo trayecto; 669 de 1 968 muestras de actor en wide-11 | partida (follow13), preview | **Cadencia 3,3–5,2 Hz** (§2.1): «hormigas». Plantado 0,79–0,90× | **alta** | L (receta + GLB) | AN-1: zancada más larga por brief §6 del plan |
| carry_walk | GLB | acarreo de leña, piedra, grano, fardos | partida (wide-11), preview | Misma cadencia; el haz cuelga bien de `hand_l` | alta (igual que walk) | L | AN-1: con `walk` |
| work_hoe | GLB | campo, fase de azada | partida (wide-11), preview | Azadona con la espalda y la azada llega al suelo. Sin defecto visto | — | — | conservar |
| flee | fabricado | huida civil (asalto, oso); `carry_walk` no | preview | Carrera legible: torso adelante, brazos doblados; 3,7–5,8 Hz | media | S | AN-3: comprobar en asalto |
| sit | fabricado | comer, hoguera, banco | partida (wide-11: 275 muestras), preview | Cadera baja 0,55 m y muslos en ángulo recto; sin banco se sienta en el aire a la altura de un banco | media | S | AN-2: revisar la altura sin asiento |
| talk | fabricado | charla `peer`; pagar | partida (wide-11), preview | Antebrazo derecho y cabeza; a 6 px sólo se lee la burbuja | baja | S | AN-2: amplitud |
| pray | fabricado | capilla, iglesia | partida (wide-11) | Manos juntas, cabeza gacha, estático 5 s | baja | S | AN-2: revisar |
| hammer | fabricado | fragua, obra | partida (wide-11) | Vaivén del brazo con martillo; sin instante de golpe (`STRIKE_AT` no lo cubre) ni astilla | media | S | AN-2: golpe con contacto |
| chop | fabricado (IA-anim) | tala | partida (wide-11), preview | Carga, golpe y rebote con astillas; medido en IA-anim | — | — | conservar; re-verificar |
| mine | fabricado (IA-anim) | cantera | preview | Ídem; picado filmado en IA-anim (semilla 23) | — | — | conservar; re-verificar |
| sow | fabricado (IA-fields) | campo, fase de siembra | preview | Voleo con bolsa; semilla desde la mano | — | — | AN-2: verificar en partida |
| spread | fabricado (IA-fields) | campo, estiércol; 434 muestras en wide-11 | partida (wide-11), preview | Horca a dos manos; carga abajo y lanza | — | — | AN-2: verificar |
| douse | fabricado (E4) | brigada de cubos | preview | Cubo en `hand_r`; el agua sale de la mano | — | — | AN-3/AN-2: preview-only hasta filmar un fuego |
| play | fabricado | niños con pelota | preview | Brazos abiertos y balanceo; no hay gesto de lanzar ni de coger | media | S | AN-2 |
| drink | fabricado | vado, pozo | partida (wide-11: 155), preview | Taza a la boca; correcto | — | — | conservar |
| sort | fabricado | granero, molino, preparar, entregar, saqueo | partida (wide-11) | Manos que se mueven delante; genérico | baja | S | AN-2: revisar amplitud |
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
| hen · idle/walk | receta G-23 | corral, todo el día | partida (wide-11, hens-11 a 15 fps), preview | Cadencia 7,3 Hz y plantado 0,68× (§2.1) | media (de cerca) | L (receta) o S (ritmo) | AN-1 |
| pig · idle/walk | receta G-23 | corral | preview | 3,5 Hz, plantado 0,94–0,98×: correcto | baja | — | conservar |
| cow · idle/walk | receta G-23 | corral, vado | preview | 1,5 Hz, plantado 0,95–0,99×: correcto | — | — | conservar |
| crow · idle/walk | receta G-23 | campos (ambiental) | preview | 3,8 Hz, plantado 0,74× | baja | — | conservar (ambiental, lejos) |
| fish · idle/walk | receta G-23 | río (ambiental) | preview (bajo el suelo del banco) | No medible en el banco; nado a 1,5 Hz | baja | — | AN-1: mirar en partida |
| fox · idle/walk | receta G-23 | noche, gallinero; huye sin clip | preview | 7,3 Hz al paso 0,95; `flee` cae a `walk` | media | S | AN-1: ritmo; huida por velocidad |
| duck · idle/walk | receta G-23 | agua junto al pueblo | partida (ducks-11 a 15 fps), preview | 4,7 Hz, plantado 0,68× (bajo el agua no se ve) | baja | — | conservar |
| deer · idle/walk | receta propia (`plant-gait`) | linde del bosque; huye a 1,35 | preview; en partida tapado por el bosque (ver §2.3) | 2,2 Hz, plantado 0,93×: correcto; al huir 4,1 Hz con el mismo clip | baja | S | AN-1: huida |
| rabbit · idle/hop/flee | receta propia | linde; huye | preview | `hop` 5,3 Hz; **`flee` va por reloj y patina** (§2.1) | media | S | AN-1: `flee` por distancia con zancada real |
| partridge · idle/walk/takeoff/flight | Vera + `rigid-clips` | sólo en la caza | preview | `walk` a **23 Hz** (zancada 0,064 con paso 1,5); `takeoff` y `flight` legibles | media | S | AN-1: ritmo del `walk` |
| boar · idle/walk/charge/attack | Vera + `rigid-clips` | caza: roam, charge, down | preview | **`charge` por reloj, patina** (§2.1); `attack` sólo mueve el cuello 9° y **nadie lo emite** | media / — | S / — | AN-1 `charge`; `attack` = preview-only |
| bear · idle/walk/attack | Vera + `rigid-clips` | visita del oso (aviso), caza | preview | `attack` (se alza) legible; después del clip queda alzado hasta que acaba el aviso | media | S | AN-3: revisar el final del aviso |
| wolf · idle/walk/attack | Vera + `rigid-clips` | corral (semana del suceso), manada de la sierra | preview | `walk` bien; **`attack` sólo mueve cabeza 4° y orejas** y nadie lo emite | — | — | `attack` = preview-only; anotar en `encargos-3d.md` |
| dog · idle/walk/run/bark/play | Vera + `rigid-clips` + fabricados | casa, niños, pelota, forastero, zorro | preview | Los cinco legibles en el banco; `bark`/`play` con corte seco al cambiar (sin mezcla) | baja | S | AN-2: mezcla corta |
| mule · idle/walk | Vera + `rigid-clips` | detrás del buhonero | preview | Trote a 3,2 Hz | baja | — | conservar |
| golondrina · batir | Astra + `ambience.ts` | cielo de día | partida (wide-11) | Batir de −55° a +35° a ritmo fijo; no hay planeo | baja | S | AN-2: planeo |

**Orientación de los animales (todas las especies).** `AnimalMotion.place`
gira el cuerpo hacia el desplazamiento de píxeles entre dos fotogramas con un
umbral de 0,00001 celdas, e ignora el `facing` que la vida ya calcula con
histéresis (`body.ts`, `TURN_MIN_SPEED`, `TURN_MIN_PROGRESS`). Un animal
apretado contra un muro o entre vecinos oscila de cara. Gravedad media, coste
S: AN-1, pasando el rumbo de la vida en `Animal`.

**Mezclas.** Personas: fundido lineal de 0,22 s entre clips, salvo los
fechados (sin mezcla, por contrato de E1). Animales: `special` (bark, play,
flee, charge, flight) entra y sale a peso 1 de golpe. Coste S: AN-1/AN-2.

---

## 5 · Veredictos (AN-4)

Se rellena al cerrar: fila, evidencia del después, veredicto.
