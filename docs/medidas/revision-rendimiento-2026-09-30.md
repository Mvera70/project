# Revisión del 30 sep 2026 — lo propuesto contra lo hecho, y el rendimiento a fondo

**El pedido**, de Vera con `/goal`: «Han hecho muchos cambios últimamente. Tu
objetivo es revisarlo todo y ver que cumplimos con lo que se ha intentado
proponer. El tema de los gráficos hay que revisar el rendimiento a fondo.»

**Lo revisado**: `main` en `c611198` (PR #2 a #10: animación AN-0…AN-5 y F-0,
los animales rehechos, la profundidad visual GV, las jornadas en la CI, el
sonido de las fases 0 a 5, el plan comercial) y la PR #8, abierta, que es la
auditoría de la fusión de esas ramas y trae el arreglo GV-4a del bucle de la
villa. Cuatro revisores en paralelo (animación y física; GV, animales y
«Graphics»; sonido; innegociables y papel) y las medidas de rendimiento, que
son de esta sesión.

**Es una foto: no se actualiza.** Lo que haya que hacer está en
`docs/plan-meta.md` (§ RV) y en `docs/task-log.md`.

---

## 0 · Lo que hay que saber, en diez líneas

1. **Los animales nuevos multiplicaron las llamadas de dibujo.** Vaca, cerdo,
   gallina, pato, cuervo, ciervo y trucha pasaron de **1 malla por animal a
   16–27**: la villa 7/60 va de **500 a 964 llamadas** y la aldea 11/21 de
   **440 a 649** con la misma escena. Nadie lo midió al publicarlos (§2).
2. **El bucle de la villa no se arregla sólo con el reloj.** GV-4a (PR #8) es
   correcto, pero a ×16 cada relevo de jornada sigue congelando la villa
   **5–7 s cada 7,5 s**; a ×64 la jornada dura menos que su montaje (§3).
3. **El coste del relevo es demostrar lo imposible**: el 93 % de las
   búsquedas A* finas falla y se lleva el **99 %** del tiempo. Un prototipo
   exacto (mismas rutas, misma vida byte a byte en cuatro valles) baja
   `createVillage` de **3,2 s a 0,15–0,22 s** en 7/60 y de **8,3 s a 1,1 s** en
   3/40 (§3). La propuesta GV-4b de la PR #8 no toca la mitad del coste.
4. **«Graphics» tiene dos defectos**: un solo fotograma largo baja la
   resolución un 15 % durante 6 s, y a 90 Hz el tope de 60 pinta a 45 fps y
   hunde la resolución para siempre (§4).
5. **La cabecera consulta el carro al motor en cada fotograma** (`refusalFor`
   con `placeBuilding`): el 11 % del JS del fotograma en la aldea a ×16 (§4).
6. **El motor va un 12–17 % más lento que el 27 sep**, y el camino, que rehace
   dos A* cada semana, es el 18 % del tick: es la roja de `catchUp` en la CI
   (§5).
7. **La primera visita pesa 11,3 MB de modelos pedidos uno a uno**; el
   service worker precachea 11,75 MB diciendo 2,7; Rapier se descarga en casi
   toda sesión desde AN-5 (§6).
8. **La CI de `main` está roja en los tres trabajos**, y la suite «rápida»
   tarda **30 minutos** (§8).
9. Lo que las rondas prometieron **está hecho en casi todo** y bien
   documentado; los incumplimientos son de medida (nadie midió el coste de
   los animales ni del sonido en un aparato) y de papel (§7). Dos defectos de
   juego de peso: **la caza del jabalí —y con ella el oso— no sale en la mayoría
   de valles**, y **el trueno cercano no suena nunca**.
10. Qué haría y en qué orden, para que decidas: §9.

---

## 1 · Cómo se midió

- **Máquina**: el contenedor de los agentes, cuatro núcleos, Chromium 141 con
  SwiftShader (dibujo por software). **Ningún milisegundo ni fotograma de aquí
  es de un teléfono**: se comparan versiones entre sí, con la misma
  herramienta, la misma escena y alternando. Llamadas, triángulos y programas
  no dependen de la máquina; los tiempos sí, y durante parte de la sesión
  corrían a la vez los revisores y la suite (se dice en cada cifra).
- **Versiones**, montadas en árboles aparte y empaquetadas igual
  (`bundle-game.ts`): `a599b4c` (27 sep, v4.71, tras las dos tandas de
  rendimiento: la tabla de la skill), `da8836f` (tras AN), `b3f6b84` (tras la
  PR #3 de los animales), `9f728b4` (tras GV) y `c611198` (hoy). Y dos
  variantes de `c611198`: con el código de GV-4a de la PR #8 (`f33a43f`), y
  con GV-4a más el prototipo de §3.
- **Herramientas**: `gl-probe.mjs` (llamadas, triángulos, programas, reparto
  del fotograma), `scene-report` (mallas por grupo), `shader-churn.mjs`,
  perfiles de CPU con CDP sobre el juego sin minificar, y dos sondas nuevas
  que quedan en el repositorio: `tools/graphics/performance/relay-probe.mjs`
  (la línea de tiempo a una velocidad: relevos y bucle) y
  `tools/reports/model-draws.ts` (mallas que deja cada GLB tras cargarlo).
- **Escenas**: las dos de la skill, la villa 7/60 y la aldea 11/21; para
  `createVillage`, también 3/40 y 23/60, que el revisor de GV encontró peores.

---

## 2 · Llamadas de dibujo: la regresión de los animales

**Las cinco versiones, misma ruta** (`?debug=1&seed=…&live=1`, 1180×820, la
de la tabla de la skill; media de los veinte últimos fotogramas):

| Versión | Villa 7/60: llamadas · triángulos · programas · mallas de fauna | Aldea 11/21 |
|---|---|---|
| `a599b4c` · 27 sep, v4.71 | 429 · 602 mil · 38 · 43 | 352 · 494 mil · 39 · 51 |
| `da8836f` · tras AN | **500** · 827 mil · 42 · 27 | **440** · 695 mil · 43 · 43 |
| `b3f6b84` · tras la PR #3 | **964** · 847 mil · 42 · **491** | **649** · 705 mil · 43 · **277** |
| `9f728b4` · tras GV | 973 · 847 mil · 64¹ · 549 | 653 · 711 mil · 43 · 277 |
| `c611198` · hoy | **969** · 847 mil · 42 · **491** | **654** · 711 mil · 43 · **277** |

¹ Con dos lobos que entraron en cuadro esa pasada; hoy vuelve a 42.

**`da8836f` → `b3f6b84` es la comparación limpia**: el mismo motor, la misma
villa (59 personas) y los mismos animales (21 gallinas, 3 patos, 2 ciervos, un
cerdo). Lo único que cambia son los GLB, y la villa pasa de 500 a 964
llamadas (**+93 %**) y la aldea de 440 a 649 (**+48 %**). Entre el 27 sep y el
29 sep la villa ya había cambiado de estado (de 39 a 59 personas, el camino,
la hierba), así que esa primera fila no es una comparación de lo mismo.

**Por la portada, como juega el jugador** (`--touch --scale 1`, 390×844,
nivel Medium), hoy: villa **559 llamadas**, 579 mil triángulos, 41 programas,
583 mallas de fauna (23 gallinas × 17 + 2 ciervos × 27 + 3 patos × 19 + 2
lobos × 29 + un cerdo × 23 = 583, exacto); aldea **441**, 513 mil, 41.

**Por qué**: los animales de antes eran cuerpos con esqueleto y
`fuseSkinnedParts` (`assets.ts`, lección 10 de la skill) los dejaba en una
malla. Los facetados de la PR #3 son **nodos rígidos animados, sin
esqueleto**, y no están en `PIECED`. Y aunque lo estuvieran no serviría:
`fuseRigidPieces` sólo funde piezas que comparten material **dentro de la
misma articulación**, y aquí cada pieza cuelga de la suya (medido: la vaca,
26 → 26).

| Modelo (`model-draws.ts`) | Mallas por animal, antes → ahora | Triángulos, antes → ahora | KB, antes → ahora |
|---|---|---|---|
| vaca | 1 → **26** | 3.476 → 1.594 | 497 → 132 |
| ciervo | 1 → **27** | 2.972 → 1.600 | 423 → 132 |
| cerdo | 1 → **23** | 2.808 → 1.228 | 424 → 110 |
| pato | 1 → **19** | 816 → 1.462 | 188 → 130 |
| trucha | 4 → **19** | 700 → 1.732 | 143 → 130 |
| gallina | 1 → **17** | 874 → 1.978 | 193 → 163 |
| cuervo | 1 → **16** | 826 → 1.422 | 188 → 117 |
| zorro | 1 → 1 | 2.720 → 1.112 | 416 → 156 |
| oso (de piezas, `PIECED`) | 30 → 33 | 3.560 → 3.508 | 305 → 287 |
| jabalí · mula · lobo · perdiz (de piezas, sin cambio) | 28 · 40 · 29 · 22 | | |

**Lo que se hizo bien y lo que faltó.** Los modelos pesan la mitad y tienen
menos triángulos: es lo que la PR #3 y el papel de la fusión (PR #8) dicen
(«3–4× más ligeros»). Lo que ninguno midió es **lo que más castiga a una
tablet**, que según la propia skill son las llamadas. La regla de la skill
—«tras un cambio que pueda pesar, pasa `gl-probe` en las dos escenas y apunta
la cifra»— no se aplicó, y la prueba que vigila las piezas
(`pieced-assets.test.ts`) sólo recorre `PIECED`, así que los siete pasaron sin
que nada saltara. La skill sigue diciendo «animales 177 → 43».

**El arreglo** (dos caminos, los dos dan 1 llamada por animal):
- **En el modelo**, como el zorro: una malla con esqueleto, un hueso por
  articulación y el color en los vértices (`tools/art/rig-single-mesh.py`, con
  Blender o `pip install bpy`). `fuseSkinnedParts` ya lo funde. Es del arte y
  pide el permiso de Vera para subir modelos.
- **Al cargar**, sin tocar los GLB: convertir los nodos rígidos en una malla
  con esqueleto (cada vértice entero a su articulación, el color del material
  en el vértice), con los mismos nombres de nodo para que los clips de
  `rigid-clips.mjs` sigan moviendo lo mismo. Serviría también para oso, jabalí,
  mula, lobo y perdiz, que hoy cuestan 22–40 llamadas cada uno.

Lo recuperado se puede medir ya: `da8836f` es la misma escena con un cuerpo
por animal, **500 llamadas en la villa en vez de 964**. Y una prueba de
presupuesto («un animal publicado deja como mucho N mallas al cargar»), que
hoy fallaría en siete modelos.

---

## 3 · El bucle de la villa y el relevo de jornada (GV-4)

**El bucle sigue en `main`** (`c611198`, por la portada): villa 7/60 con
**3.180 ms por `paint`**, la vida en **0 pasos** y la fecha quieta, igual que
lo describe `docs/medidas/bucle-villa-2026-09-29.md`.

**GV-4a, el arreglo del reloj de la PR #8, es correcto**: mide el hueco
ocioso desde que acabó el pintado anterior (`clock.painted`), su prueba pasa,
y la pestaña oculta sigue siendo una ausencia. **Pero no basta**, porque el
montaje de la vida no se paga sólo al abrir: se paga **en cada relevo de
jornada** (`renderer.ts`, `lifeState !== shown`), y una jornada escénica dura
120 s a ×1, **7,5 s a ×16 y 1,9 s a ×64**.

**Villa 7/60 a ×16 durante 60 s** (`relay-probe.mjs`, escala 0,25 para que el
dibujo por software no separe los fotogramas más de un segundo):

| Variante | Fotogramas | `paint` mediano | Relevos | Pasos de vida |
|---|---|---|---|---|
| `main` | 11 | 5.425 ms | todos los fotogramas | **0** |
| + GV-4a (PR #8) | 35 | 471 ms | **5,4–7,2 s** cada 7,5 s | 1.579 |
| + GV-4a y el prototipo de abajo | **114** | **84 ms** | **0,5–0,8 s** | **5.367** |

A ×1 (60 s), GV-4a solo: mediana 20 ms, p90 135 ms, y el relevo que cae en
el minuto cuesta 3,5 s; con el prototipo, mediana 19, p90 74 y el relevo
297 ms. **En la tablet de Vera** el fotograma del bucle medía 2.264 ms: por
inferencia, con GV-4a solo la villa se congelaría unos dos segundos en cada
relevo, un 30 % del tiempo a ×16, y a ×64 no saldría nunca del bucle.

### Dónde se va el relevo

En el juego (villa, ×16, 40 s), contando dentro de `navigate.ts`:
**1.722 rutas pedidas, 1.201 búsquedas A* finas, 1.116 fallidas (93 %) y
1.130 reintentos a cuarto de celda; las fallidas se comen 32,1 de 32,4 s
(99 %)**. Una búsqueda que no encuentra el destino recorre la rejilla entera a
media celda y **vuelve a recorrerla** a cuarto de celda (`finePathTo`,
«algunos huecos junto a postes…»).

El perfil de un relevo en la villa (juego sin minificar):
`createVillage` 99 % del `paint`, repartido en **`dayPlans`→`choose` 50 %**,
`placesOf`→`commons`→`shoreOf` 30 % y `createBeasts`→`fordDrinkOf` 12 %. En
Node, 86 de los 90 fallos de `choose` eran **los mismos dos puestos de una
tala** (`felling:3341`, puestos 1 y 2) encerrados entre troncos, que cada
aldeano vuelve a intentar desde su casa. En 3/40 `dayPlans` es el 99 %.

**Lo que eso dice de GV-4b.** La PR #8 propone «guardar las rutas del común,
la orilla y el vado por plan de escena». Eso cubre el 42 % del relevo en 7/60
y casi nada en 3/40; **no toca `dayPlans`**, que es la otra mitad. El revisor
de GV probó además atajar con la ruta gruesa (`if (coarse === null) return
null`): baja mucho y en cuatro valles dio la misma huella, pero **no es
equivalente por construcción** —el A* fino pasa huecos entre postes que el
grueso descarta—, así que en otro valle podría cambiar la partida que se ve.

### El prototipo: lo que una búsqueda fallida ya demostró

Cuando el A* fino falla, ha recorrido entera la región a la que se llega desde
su salida, y esa región es **cerrada**: ningún paso permitido sale de ella. Se
guarda (por objeto de terreno, radio y resolución; el terreno se rehace al
cambiar el mundo y no se toca después) y la siguiente pregunta que salga de
dentro —su nodo y todo vecino que se ve desde el punto exacto de salida— y
cuyo destino no se alcanza desde ningún nodo de la región se contesta «no» al
momento. **Es exacto por construcción**: sólo contesta «no» cuando el A*
también lo haría; en cualquier otro caso busca como siempre. No supone que
`clearBetween` sea simétrico, y guarda la región sólo si también es cerrada
desde el nodo de salida.

| Valle | `createVillage` (Node) | 600 pasos de vida | ¿Igual? |
|---|---|---|---|
| 7/60 | 3.157–3.404 → **148–216 ms** | 3.100 → 1.636 ms | idéntico |
| 3/40 | 8.327–8.830 → **1.075–1.116 ms** | 5.222 → **594 ms** | idéntico |
| 23/60 | 3.030–3.051 → **156–218 ms** | 403 → 403 ms | idéntico |
| 11/21 | 237–458 → 88–299 ms | 701 → 557 ms | idéntico |

«Idéntico» es el JSON de los planes de jornada, las posiciones y los sitios
tras montar y tras 600 pasos, **byte a byte**. Y rutas sueltas: 1.729
consultas en 11/21 (26 sin ruta) y 2.147 en 7/60 (507 sin ruta), todas
iguales con y sin la caché. Son unas 80 líneas en `navigate.ts`, en la rama
`claude/gv-4b-regiones-cerradas` (sobre `c611198`, **sin fusionar**) con su
prueba de equivalencia (`tests/fast/navigate-closed-regions.test.ts`: un
corral cerrado y una empalizada con rendija; falla si se rompe la condición
de llegada, comprobado). No incluye GV-4a, que es de la PR #8.

Lo que **no** arregla: en la aldea el relevo cuesta 200–300 ms con y sin él
(ahí manda otra cosa, §4), y en la villa quedan 0,5–0,8 s por relevo en el
contenedor.

---

## 4 · El fotograma: la vida, la cabecera, la adaptativa y el tope

**La aldea 11/21 a ×16** (perfil del `paint`, juego sin minificar): la vida
en marcha es el **67 %** (`stepHome` 36 %; de ello **`routeAroundBodies` 31 %**,
los desvíos por atasco, que hacen un A* fino con tráfico y no pueden usar
ninguna caché); **`refusalFor` 11 %**, de lo que `placeBuilding` es el 7 %;
`rebuild` 8,5 %; el dibujo de Three, 8 %; `createVillage`, 2 %.

**La cabecera pregunta al motor en cada fotograma si se puede dar algo**
(`src/ui/redesign/hud.ts:619`, M-2 y K-5, del 17–18 sep):
`MEANS_IDS.some(id => refusalFor(state, id) === null) || crownRefusal(state)`,
y para los medios que se construyen `refusalFor` busca parcela con
`placeBuilding`. La respuesta sólo puede cambiar cuando cambia el estado —una
vez por semana de juego, o al dar algo— y cuesta el 11 % del JS del fotograma.
Con un recuerdo por `state.tick` y los actos se va entero. De paso, escribe el
`aria-label` en cada fotograma.

**La resolución adaptativa** (`renderer.ts`, `adaptResolution`; hallazgo del
revisor de GV, comprobado en el código): `sinceAdapt` sólo se reinicia cuando
la escala cambia, así que pasados los dos primeros segundos decide en cada
fotograma, y la media (0,9/0,1) cruza el umbral lento con **un solo
fotograma de ~100 ms**: la escala baja un 15 % y tarda más de 6 s en volver.
Un relevo, una recolección de basura o volver de otra pestaña bastan. Es lo
contrario de lo que `6acc645` quería.

**El tope de fotogramas** (`src/ui/loop.ts`, `frameDue`, margen 0,75; por
omisión 60): en una pantalla de **90 Hz** pinta uno de cada dos, **45 fps**, y
el hueco de 22,2 ms ya es «lento» (21,7 ms): la adaptativa baja la escala al
mínimo y no vuelve nunca. A 72–75 Hz no topa y a 144 Hz topa a 72. Muchos
Android van a 90 Hz; a 60 y 120 Hz funciona como se quería.

**Menores**: `readGraphicsSettings()` (localStorage y JSON) en cada rAF
(`app.ts:1681`); en Low, el mapa de sombras y su cadencia no hacen nada porque
no hay sombras, y ninguna cifra de Low está medida; al seguir a alguien,
`revealAssault()` corre dos veces por fotograma.

**Recompilaciones, bien** (`shader-churn.mjs`, aldea): 43 programas al
cargar, **+4 con un rayo y +0 con la fiesta** (el 27 sep: +4 y +2). La lección
12 del banco de luces sigue valiendo con todo lo nuevo.

---

## 5 · El motor: el camino rehace dos A* cada semana

`catchUp` de §13.2 (960 ticks desde `foundTwenty(7)`, tres pasadas
alternando, en esta máquina): **27 sep 1,32–1,41 s · tras AN 1,55–1,62 s ·
hoy 1,53–1,61 s**, un 12–17 % más. Entre AN y hoy el motor no cambió (sólo
constantes de sonido en `balance.ts`); lo que lo movió está entre el 27 y el
29 sep. El revisor de reglas lo encontró en el perfil: `wearValleyRoad`
(`valley-road.ts`, paso 14) **recalcula las dos rutas de las bocas a la plaza
cada semana**, 0,5–0,8 ms por llamada, el 18 % del tick (el resto de la
subida es más gente en el valle). Es lo que más pesa en la roja de
`save.test.ts:304` en la CI (2,8–3,0 s contra 2 s) y lo que paga un teléfono
al volver a la partida. Recalcularla sólo cuando cambia el mapa lo quita.

---

## 6 · Lo que se descarga y lo que ocupa

- **Modelos**: el juego pide **103 GLB, 11,3 MB, uno detrás de otro**
  (`loadAssets`, «deliberately sequential»): en una red móvil son cien viajes
  de ida y vuelta antes del primer fotograma. Los 17 aldeanos llevan cada uno
  **los mismos cuatro clips (128 KB)**: 2,2 MB repetidos.
- **Service worker**: precachea en la instalación **105 modelos, 11,75 MB**;
  su comentario y `docs/dos-sesiones.md` dicen 2,7 MB. Tres no los pide nadie
  (0,44 MB: `axis-marker`, `village-corner-a` y `-b`).
- **Rapier**: D1 prometía que sólo se pide «cuando hay algo que simular».
  Desde AN-5b se pide **cuando se ofrece una caza** (`renderer.ts`, «Rapier se
  carga cuando se ofrece la caza, no al tocarla»), y la perdiz se ofrece el
  **70 % de las semanas** desde la fundación: en la práctica, casi toda sesión
  descarga y compila **2,86 MB (1,08 MB comprimido)** en plena partida. Falta
  medir el tirón en el aparato; se podría pedir en un momento ocioso.
- **Interfaz**: las 44 escenas de crónica son PNG de 640×512 de **~750 KB**
  cada una (carga perezosa, bien); el logotipo de la portada, **1,1 MB** en
  PNG a 1147×739; las losetas de papel de la piel, **1,3–1,5 MB** en PNG a
  1024². Como WebP o JPEG serían unas diez veces menos. El grabado de 2 MB
  `title-valley-higgsfield.png` ya no lo pide la portada.
- **Sonido** (revisor de sonido): 47 MP3, 883 KiB, fuera del precaché; lo
  decodificado **no se suelta nunca**: unos 20 MB tras una hora a ×1 y 33 MB en
  el peor caso a 48 kHz. Por fotograma cuesta ~5 µs: barato.

---

## 7 · Lo propuesto contra lo hecho

### Animación AN-0…AN-4d, caza AN-5 y física F-0

**Cumplido, con límites dichos casi todos.** El motor no se tocó (0 líneas en
`src/engine` en toda la línea), la vida no usa `Math.random` ni `Date` y no
escribe en el estado, `melee`, `raiders` y `ragdoll` quedaron intactos, y las
cifras deterministas se reproducen: `gait-report` da la zancada 0,423/0,339 y
el apoyo 44–49 %; re-hornear el aldeano da el GLB byte a byte;
`battle-report --shadow` da «mismo resultado» y un 33 % de cambio con el
cuerpo pintado (6 % de control); `hunt-report` y `bear-visit-report`
reproducen `despues.txt` y `oso-despues.txt` línea a línea. Rapier no fuga
(memoria plana en 150 ciclos de crear y liberar). Todas las pruebas citadas
existen, describen propiedades y pasan; ningún fichero de AN pasa de 5 s. Lo
que no cumple:
- **La caza del jabalí, y con ella toda la línea del oso, no se juega en la
  mayoría de valles** (comprobado en el código): `createWildPrey('boar')` sólo
  acepta el centro de una celda de bosque donde quepa su cuerpo, y
  `solidTerrain` pone un tronco en cada celda de bosque. Medido por el
  revisor: 0 de 60 intentos en 11, 23 y 5 al año 30; en 17 valles sólo lo
  admiten cuatro. Sin jabalí cazado no hay oso. Es el mismo tropiezo de AN-4c,
  y `hunt-report` se salta en silencio los valles sin presa: las filas de ciervo
  y jabalí son de dos valles, no de cinco. Es anterior a AN-5, pero AN-5 midió
  sobre ello.
- **El cazador acaba donde un aldeano no cabe** (se mueve con radio 0,22 y
  vuelve a la vida con 0,32 sin recolocarlo): 32 de 184 cazas; en 7/30, tres
  cazadores se quedan casi inmóviles hasta 40 s.
- **Picos sin cota en la caza**: con el cazador sin camino, pasos de 0,1 a
  1,1 s (el mismo A* fino que falla dos veces de §3). Un fotograma así de largo
  es una ausencia para el reloj, la escena se descarta sin parte y, por lectura
  del código, `huntInProgress` se queda en verdadero: no vuelve la señal y la
  velocidad queda a ×1 hasta recargar. GV-4a y el prototipo de §3 lo mitigan.
- El primer zarpazo del oso dura un paso y no se ve; `createBear` cuesta
  12–107 ms por llamada y no está medido en el papel; las cifras absolutas de
  `animation-cost` del papel (4,0–4,7 ms) se tomaron con la máquina ocupada
  (aquí, 0,85–1,13 ms): valen como comparación, no como cifra.
- Papel: `bake-clips.mjs`, `plant-gait.mjs`, `trace-strip.py`,
  `build-compare.py` y `take.sh` sin fila; la skill `animacion` cuenta 25
  clips y hay 27; `encargos-3d.md:101` sigue abierto y ya se entregó; ningún
  `trace.json` está en el repositorio, así que «0 saltos en 30 240 muestras» no
  se puede auditar.

### Profundidad visual GV-0…GV-3

**Cumplido.** La máscara del pie (`contact-shade.ts`, R8, 504 KiB, sólo se
rehace si cambian las bases con tejado —0,27 ms en la aldea y 0,48 en la villa,
mejor que los «~4 ms» de la lección 19—, sin llamadas ni programas por
edificio, se libera al cambiar de valle), C1 como valor vigente, `?contact=off`
y `?aa=` documentados, el valor por omisión del suavizado sin cambiar, el
seguido a la vista con sombra y viento. Pendiente y dicho: la lectura en el
aparato y el visto bueno del prado C. Menor: el clon atenuado de la copa
recibe sombra y la opaca no.

### Los animales rehechos (PR #3)

Forma, catálogo, huellas y clips, bien; cero texturas. **La regresión de
llamadas de §2 no la dice ningún papel**, y la PR #3 no tocó `src/` ni
`tests/`: nadie lo iba a ver. La ubre de la vaca, pendiente y dicha.

### «Graphics» (v4.96) y la adaptativa (`6acc645`)

Cuatro niveles, 30/60, el nivel se fija al crear el renderer (lienzo nuevo,
sin fugas ni recompilación en caliente), el reparto del fotograma en el
taller: **cumplido**, con los dos defectos de §4.

### Sonido (v5.14–v5.24)

Lo decidido por Vera está: el botón K en todo botón sin voz propia, lo
tachado retirado, el contrato de la fase 5 de sólo lectura y sin azar, el
contexto suspendido con la pestaña oculta, los 47 MP3 idénticos byte a byte a
lo que regenera `sounds.py`. **No cumple**:
- **El trueno cercano no suena nunca** (comprobado): el latigazo y el trueno
  van por `accent` y comparten el fusible de 2,5 s (`app.ts:908-909`,
  `SOUND.ACCENT_MIN_GAP_MS`); el trueno llega a los 0,7 s y se descarta. Con
  la cámara en el corazón del valle son el 60–70 % de los rayos.
- **Cinco botones suenan dos o tres veces**: faltan en `OWN_VOICE` los cierres
  del carro, la crónica y el tablón, la vuelta del panel y el botón del carro
  de la cabecera.
- **La fase 0 pedía medir el coste en un aparato «antes de seguir»** y no hay
  cifra; tampoco hay tope de voces ni `duck`.
- Los siete sonidos de combate están en `main` sin oír y sin probar en un
  cerco real; a ×16/×64 el trueno y los acentos no pasan por la compuerta de
  velocidad.

### Innegociables y papel (revisor de reglas)

**Cumplen**: motor puro (sin `Math.random`, `Date`, `performance`, `window`
ni imports de pantalla; `eslint .` limpio), estado plano y serializable, flujos
con nombre (las expediciones tienen el suyo, aislado por prueba), «leader» y
no «king», bancos en inglés, pruebas nuevas con varias semillas y sin
`skip`/`only`, y los seis `it.fails` con lo medido al lado. **No cumplen**:
- **La familia que huye rompe el tope de nombrados** (`means.ts`,
  `arriveToStay`: `named: true` aunque `character: false`; opiniones y riñas
  recorren `v.named`, no `namedIds`). Semilla 3 a 120 años: riñas de 65 a 274.
  Es la roja de `engine-long.test.ts`. Comprobado en el código.
- **Un guardado del esquema 11 se pisa sin aviso**: el esquema 12 sin
  migración fue decisión tuya, pero `loadSave` devuelve `null`, la portada
  funda otra partida y el primer guardado escribe en la misma clave. Y dos
  comentarios (`save.ts`, `state.ts`) siguen diciendo que «la partida de la
  tablet sigue cargando».
- **ESLint no vigila `render3d`**: el patrón del motor cubre `render/`, `ui/`
  y `derive/`, no `render3d/` ni `@render3d`, aunque `CLAUDE.md` lo afirma. Hoy
  no hay ningún import prohibido.
- **Números sin `balance.ts` o sin medida**: `valley-road.ts:31-35`,
  `fate.ts:214`, `derive/notice-board.ts:18`; y `EXPEDITION`, los pesos de las
  llegadas y `OFFER.AGAIN_WEEKS` llevan `TUNE` sin medida.
- **§4c**: 33 claves de crónica nuevas (expediciones, llegadas,
  `hunt.wounded.*`) tienen su tarea en `plan-arte-pendiente.md` pero ningún
  dibujo, y `chronicle-art.ts` no tiene caso para `expedition` (devuelve
  `null`, no el grabado prestado que dice el plan).
- **J1 «en vuelo»**: el tablón no tiene prueba, los muertos de expedición no
  pasan por `reportVictims` (ni línea de nombrado ni libro de cuentas), enviar
  en pausa sólo suena, y `mushrooms` es gratis y repetible cada semana.
- Papel: `bake-clips.mjs`, tres guiones de `tools/art/lots/` y
  `animals-g23.mjs` sin fila en `tools/README.md`; seis enlaces rotos; el changelog con v5.13 encima de v5.24
  y dos v4.78; `CLAUDE.md` dice «dos jornadas rojas, 128 de 130, 284 s».

### La PR #8 (la fusión de las cuatro ramas)

Buena auditoría y bien medida en lo que miró —las 21 jornadas rojas ya lo
eran antes, el sonido sin contrato, el papel desordenado— y GV-4a correcto.
Tres cosas a corregir antes de fusionarla: **no vio la regresión de llamadas
de los animales** («Modelos 3D: nada urgente»); **su GV-4b apunta a la mitad
equivocada** del relevo (§3); y sus versiones **v5.22 y v5.23 chocan** con
las v5.22–v5.24 del sonido que ya están en `main`.

---

## 8 · La puerta: la CI y la suite

**CI de `main` en `c611198`**, los tres trabajos en rojo:
- `fast`: **1.788 s (30 min)** y una roja, el cronómetro de `catchUp` (2,8 s
  contra 2 s, §5). Por esa roja **se saltan `build` y `lint`**.
- `journeys`: 42 min, **21 rojas de 190** (la PR #8 comprobó que ya lo eran
  antes de las cuatro ramas); `CLAUDE.md` dice dos, «128 de 130 en 284 s».
- `browser`: los ~12 recorridos rojos conocidos del rediseño; `test:pwa` se
  salta.

En local, con la máquina cargada, la suite rápida llegó a 149 de 224 ficheros
en 30 minutos con **la misma única roja**.

**La suite «rápida» incumple la regla del dueño** («evitar a toda costa estar
separado más de media hora haciendo pruebas») y su propio comentario («menos
de 20 s»). En la CI, **92 ficheros de más de 5 s suman el 98 % del tiempo**;
los catorce peores (life-body 392 s, ledger 346, life-needs 212, density 207,
life-navigate 202, sim 182, life-trade 180, sim-endings 161,
crossroads-reachability 161, chronicle 147, animals 145, ui 113,
plaza-gatherings 112, graphics-steading 105) son el 56 %. La causa, según el
revisor de reglas: unos 25 ficheros vuelven a simular la misma aldea (funda y
corre 8–40 años) cada uno por su cuenta, 36 montan `createVillage` y 17
recorren jornadas enteras. `life-navigate` no hace ni una búsqueda fina y
tarda 101–107 s en hacer crecer valles; `life-body` simula diez mil pasos en
seis valles (189 s en local). Y `testTimeout: 10_000` no vigila las pruebas
síncronas: `life-body` pasa con 338 s. Lo nuevo desde el 27 sep es sólo el 4 %.

---

## 9 · Qué haría y en qué orden (decides tú)

| # | Qué | Por qué ahora | Coste |
|---|---|---|---|
| 1 | **Un animal, una llamada**: los facetados a malla con esqueleto (en el modelo o al cargar), y una prueba de presupuesto por modelo | +464 llamadas en la villa, +209 en la aldea; es lo que más castiga a una tablet | Media |
| 2 | **GV-4b con regiones cerradas** (el prototipo de §3, con su prueba de equivalencia) **después de GV-4a** | Sin él, GV-4a deja la villa congelada en cada relevo y a ×64 en bucle | Media, hecho a medias |
| 3 | **La adaptativa y el tope**: ignorar huecos largos, reiniciar `sinceAdapt`, acumular el tope y ligar «lento» al periodo de pantalla | 45 fps y resolución mínima en todo aparato de 90 Hz | Baja |
| 3b | **El jabalí donde se pueda cazar**: que nazca en la linde, como el oso de AN-4c, con una prueba sobre `solidTerrain` real en varias semillas, y que `hunt-report` diga los valles que se salta | Sin jabalí no hay oso: media línea de caza no existe en la mayoría de valles | Baja-media |
| 4 | **La cabecera, una vez por semana**: recordar `canGiveSomething` por tick y actos | 11 % del JS del fotograma | Baja |
| 5 | **El camino, sin A* por semana** | 18 % del tick; la roja de `catchUp` | Baja-media |
| 6 | **La suite rápida, rápida**: una fixture compartida de valles crecidos, y mudar a las jornadas los que no quepan | 30 min contra una regla del dueño | Media |
| 7 | **Sonido**: el trueno cercano, los botones que suenan dos veces, soltar lechos que llevan un rato callados | Un fallo audible hoy | Baja |
| 8 | **Motor**: `named` de los refugiados; y decidir qué hacer con un guardado ilegible (guardarlo aparte antes de pisarlo) | Una jornada roja y pérdida de partidas | Baja; lo segundo es tuyo |
| 9 | **Primera visita**: modelos en paralelo o por lotes, clips compartidos, PNG a WebP, Rapier en un momento ocioso, corregir el comentario del precaché | Carga en red móvil | Media |
| 10 | **Medir en el aparato** lo que aquí no se puede: la villa y su relevo con 1 y 2 dentro, el tirón de Rapier, la memoria del sonido | Todo lo de arriba es comparativo | Tuyo, con el panel de taller |

Y el papel que falta: la skill `performance` actualizada (hecho en esta
ronda), la fila de §9 en `plan-meta.md` (hecho), y en la PR #8 las tres
correcciones de §7.

---

## 10 · Reproducir

```bash
npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/revision-0930/game
# llamadas, triángulos, programas y mallas por grupo, como juega el jugador
node tools/graphics/performance/gl-probe.mjs artifacts/graphics/revision-0930/game/valley.html \
  --seed 7 --year 60 --touch --scale 1 --sky clear --phase 0.45 --seconds 60 --report
# la ruta de la tabla de la skill, para comparar versiones
node tools/graphics/performance/gl-probe.mjs <valley.html> "debug=1&seed=7&year=60&season=summer&live=1" 40
# los relevos y el bucle, a ×16
node tools/graphics/performance/relay-probe.mjs <valley.html> --seed 7 --year 60 --speed 16 --seconds 60
# lo que deja cada GLB al cargar, y el de otro commit para comparar
npx tsx tools/reports/model-draws.ts --ids cow,hen,pig,deer,duck,crow,fish
mkdir -p /tmp/viejos && git show da8836f:public/assets/valley3d/cow.glb > /tmp/viejos/cow.glb
npx tsx tools/reports/model-draws.ts --dir /tmp/viejos
node tools/graphics/performance/shader-churn.mjs <valley.html> "debug=1&seed=11&year=21&season=summer&live=1"
```

Fuera de Windows: `VALLEY_CHROMIUM=/opt/pw-browsers/chromium` para `gl-probe`
y `shader-churn`, que no usan el buscador de navegador compartido.

---

## 11 · Lo que no se pudo medir aquí

Fotogramas, milisegundos de GPU y memoria de un teléfono o una tablet; el
tirón de compilar Rapier; la memoria real del sonido; el coste por píxel de la
máscara del pie y de MSAA; y las 21 jornadas rojas una a una (la PR #8
atribuyó el conjunto). El prototipo de §3 se probó en Node y en el navegador
del contenedor, en cuatro valles; no en el aparato.
